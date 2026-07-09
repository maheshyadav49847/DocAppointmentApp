import "dotenv/config";
import express from "express";
import QRCode from "qrcode";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import pino from "pino";
import { exec } from "child_process";
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

const port = Number(process.env.PORT || 3101);
const backendWebhookUrl = process.env.BACKEND_WEBHOOK_URL || "http://localhost:5167/api/whatsapp/webhook";
const apiKey = process.env.API_KEY || "";

const app = express();
app.use(express.json({ limit: "50mb" }));

function requireAuth(req, res, next) {
  if (!apiKey) return next();
  const providedKey = req.header("X-Bridge-Api-Key") || req.query.apiKey;
  if (providedKey === apiKey) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// Map now stores objects containing state, client, and initPromise
const clients = new Map();

function buildBridgeHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Bridge-Api-Key"] = apiKey;
  }
  return headers;
}

function toChatId(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) {
    throw new Error("A valid phone number is required.");
  }
  const countryCode = process.env.DEFAULT_COUNTRY_CODE || "91";
  const finalDigits = digits.length === 10 ? `${countryCode}${digits}` : digits;
  return `${finalDigits}@s.whatsapp.net`;
}

function markActivity(branchId) {
  const entry = clients.get(branchId);
  if (entry) {
    entry.lastActivity = Date.now();
  }
}

async function relayIncomingMessage(branchId, message) {
  markActivity(branchId);
  let from = message.key.remoteJid;
  if (message.key.remoteJidAlt && message.key.remoteJidAlt.includes("@s.whatsapp.net")) {
    from = message.key.remoteJidAlt;
  }

  if (!message.message || message.key.fromMe) return;
  if (!from || from.includes("@g.us")) return;

  const messageTimestamp = message.messageTimestamp;
  const now = Math.floor(Date.now() / 1000);
  if (messageTimestamp && (now - messageTimestamp > 3600)) {
    return;
  }

  const body = message.message.conversation || message.message.extendedTextMessage?.text;
  if (!body) return;

  const jidParts = from.split('@');
  if (jidParts.length === 2) {
    const idPart = jidParts[0].split(':')[0];
    from = `${idPart}@${jidParts[1]}`;
  }

  const normalizedFrom = from.replace("@s.whatsapp.net", "@c.us").replace("@lid", "@c.us");

  try {
    const response = await fetch(backendWebhookUrl, {
      method: "POST",
      headers: buildBridgeHeaders(),
      body: JSON.stringify({ sessionId: branchId, from: normalizedFrom, body })
    });

    if (!response.ok) {
      console.error(`[WEBHOOK] Relay failed for ${branchId}. Status=${response.status}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Relay failed for ${branchId} (${backendWebhookUrl}): ${error.message}`);
  }
}

async function getClient(branchId, expectedNumber) {
  if (!branchId) {
    return { state: { ready: false, lastQr: null, error: "No branchId supplied", step: "Invalid Request" }, client: null };
  }

  let entry = clients.get(branchId);

  if (entry) {
    if (expectedNumber && !entry.expectedNumber) {
      entry.expectedNumber = expectedNumber;
    }
    if (entry.initPromise) {
      await entry.initPromise;
    }
    
    // If it was hibernated (client is null but entry exists)
    if (!entry.client && entry.state.step === "Hibernating") {
      console.log(`[WAKE UP] Branch ${branchId} is waking up from hibernation...`);
      entry.state.step = "Waking Up";
      entry.lastActivity = Date.now();
      await startSocket(branchId, entry);
    }
    
    return entry;
  }

  entry = {
    state: {
      ready: false,
      lastQr: null,
      lastQrAt: null,
      error: null,
      step: "Initializing"
    },
    client: null,
    saveCreds: null,
    isReconnecting: false,
    expectedNumber: expectedNumber || null,
    initPromise: null,
    lastActivity: Date.now()
  };

  clients.set(branchId, entry);
  await startSocket(branchId, entry);

  return entry;
}

async function startSocket(branchId, entry) {
  entry.initPromise = (async () => {
    console.log(`[SYSTEM] Starting node for ${branchId}`);
    const authDir = `sessions/baileys_auth_info_${branchId}`;
    
    await fsp.mkdir('sessions', { recursive: true }).catch(()=>{});

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const secureSaveCreds = async () => await saveCreds();
    entry.saveCreds = secureSaveCreds;

    // Memory Tweaks applied here
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }), 
      browser: ['Ubuntu', 'Chrome', '121.0.0.0'],
      syncFullHistory: false,          // Saves RAM
      markOnlineOnConnect: false,      // Saves Bandwidth
      generateHighQualityLinkPreview: false,
      getMessage: async () => ({ conversation: '' }), // No cache required
    });

    entry.client = sock;

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        entry.state.ready = false;
        entry.state.lastQr = qr;
        entry.state.lastQrAt = new Date().toISOString();
        entry.state.error = null;
        entry.state.step = "Awaiting Scan";
        markActivity(branchId);
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401 && statusCode !== 403;
        entry.state.ready = false;

        if (shouldReconnect) {
          if (!entry.isReconnecting && entry.state.step !== "Hibernating") {
            entry.isReconnecting = true;
            entry.state.step = "Reconnecting...";
            console.log(`[WARN] ${branchId} connection closed (Status: ${statusCode}). Reconnecting in 5s...`);
            
            setTimeout(async () => {
              try {
                entry.client.ws.close();
                entry.client.end(undefined);
              } catch (e) {}
              
              clients.delete(branchId);
              getClient(branchId, entry.expectedNumber).catch(console.error);
            }, 5000);
          }
        } else {
          // Logged Out
          entry.state.step = "Logged Out";
          entry.state.error = "Session invalid or logged out.";
          console.log(`[AUTH] ${branchId} session invalid. Wiping keys...`);

          try {
            entry.client.ws.close();
            entry.client.end(undefined);
          } catch(e) {}

          await fsp.rm(authDir, { recursive: true, force: true }).catch(console.error);
          clients.delete(branchId);
        }
      } else if (connection === "open") {
        const loggedInPhone = String(sock.user.id).split(':')[0];
        const expectedNormalized = entry.expectedNumber ? entry.expectedNumber.replace(/\D/g, '').slice(-10) : null;
        const loggedInNormalized = loggedInPhone.slice(-10);

        if (expectedNormalized && loggedInNormalized !== expectedNormalized) {
          console.log(`[AUTH] Invalid number scanned for ${branchId}! Expected: ${expectedNormalized}, Got: ${loggedInNormalized}`);
          entry.state.ready = false;
          entry.state.error = `Security Alert: Scanned ${loggedInPhone}, but branch requires ${entry.expectedNumber}.`;
          entry.state.step = "Validation Failed";

          setTimeout(async () => {
            try { await sock.logout(); } catch (e) {}
            try { sock.ws.close(); sock.end(undefined); } catch (e) {}
            await fsp.rm(authDir, { recursive: true, force: true }).catch(console.error);
            clients.delete(branchId);
          }, 2000);
          return;
        }

        entry.state.ready = true;
        entry.state.lastQr = null;
        entry.state.lastQrAt = null;
        entry.state.error = null;
        entry.state.step = "Operational";
        entry.isReconnecting = false;
        markActivity(branchId);
        console.log(`[READY] ${branchId} is connected (Phone: ${loggedInPhone})`);
      }
    });

    sock.ev.on("creds.update", secureSaveCreds);

    sock.ev.on("messages.upsert", (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          relayIncomingMessage(branchId, msg).catch(console.error);
        }
      }
    });
  })();

  await entry.initPromise;
}

// Hibernate logic
function hibernateSession(branchId, entry) {
  console.log(`[HIBERNATE] Branch ${branchId} is idle. Unloading from RAM to save memory.`);
  entry.state.ready = false;
  entry.state.step = "Hibernating";
  
  if (entry.client) {
    try {
      entry.client.ws.close();
      entry.client.end(undefined);
    } catch(e) {}
    entry.client = null;
  }
}

// Check for idle sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const IDLE_LIMIT = 30 * 60 * 1000; // 30 minutes
  
  for (const [branchId, entry] of clients.entries()) {
    if (entry.state.step === "Operational" && entry.client) {
      if (now - entry.lastActivity > IDLE_LIMIT) {
        hibernateSession(branchId, entry);
      }
    }
  }
}, 5 * 60 * 1000);


async function destroyClient(branchId, { logout = false } = {}) {
  const entry = clients.get(branchId);
  if (!entry) return;

  if (entry.initPromise) {
    await entry.initPromise;
  }

  if (entry.client) {
    if (logout) {
      await entry.client.logout().catch(() => {});
    }
    try {
      entry.client.ws.close();
      entry.client.end(undefined);
    } catch(e) {}
  }

  if (logout) {
    await fsp.rm(`sessions/baileys_auth_info_${branchId}`, { recursive: true, force: true }).catch(console.error);
  }

  clients.delete(branchId);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, sessions: clients.size });
});

app.get("/status/test", (_req, res) => {
  res.json({ ok: true });
});

app.get("/qr/:branchId", requireAuth, async (req, res) => {
  const { state } = await getClient(req.params.branchId, req.query.expectedNumber);
  if (state.ready) {
    return res.send("<html><body><h2>Node Online</h2></body></html>");
  }

  if (!state.lastQr) {
    return res.send(`
      <html><head><meta http-equiv="refresh" content="5"></head>
      <body style="font-family:sans-serif;text-align:center;padding-top:100px;background:#f8fafc;">
        <h3>Starting Engine...</h3>
        <p>${state.step || "Please wait"}</p>
        ${state.error ? `<p style="color:red;">Error: ${state.error}</p>` : ""}
      </body></html>
    `);
  }

  try {
    const qrImage = await QRCode.toDataURL(state.lastQr);
    res.send(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${qrImage}" style="width:90%;height:90%;object-fit:contain;" /></body></html>`);
  } catch(e) {
    res.status(500).send("QR Generation failed");
  }
});

app.get("/status/:branchId", requireAuth, async (req, res) => {
  const { state } = await getClient(req.params.branchId);
  res.json({
    ...state,
    hasQr: Boolean(state.lastQr)
  });
});

app.post("/send-message", requireAuth, async (req, res) => {
  const { branchId, to, message, fileBase64, fileName } = req.body ?? {};

  if (!branchId || !to || (!message && !fileBase64)) {
    return res.status(400).json({ message: "branchId, to, and message/file are required." });
  }

  try {
    const entry = await getClient(String(branchId));
    
    // Safety check - if it was hibernating, getClient just woke it up. Wait a tiny bit to be fully ready.
    if (!entry.state.ready) {
      await new Promise(r => setTimeout(r, 1500));
    }

    if (!entry.client || !entry.state.ready) {
      return res.status(409).json({ message: "WhatsApp client is not ready for this branch." });
    }

    markActivity(String(branchId));
    const jid = toChatId(to);

    if (fileBase64) {
      const buffer = Buffer.from(fileBase64, 'base64');
      await entry.client.sendMessage(jid, {
        document: buffer,
        fileName: fileName || 'Document.pdf',
        mimetype: 'application/pdf',
        caption: message ? String(message) : undefined
      });
    } else {
      await entry.client.sendMessage(jid, { text: String(message) });
    }
    return res.json({ sent: true });
  } catch (error) {
    console.error(`[OUTGOING] Failed for ${branchId}: ${error.message}`);
    return res.status(500).json({ message: "Failed to send WhatsApp message." });
  }
});

app.post("/restart/:branchId", requireAuth, async (req, res) => {
  const branchId = req.params.branchId;
  console.log(`[CORE] Cold boot requested for branch: ${branchId}`);
  await destroyClient(branchId, { logout: false });
  getClient(branchId).catch(console.error);
  res.json({ message: "Resetting..." });
});

app.post("/logout/:branchId", requireAuth, async (req, res) => {
  const branchId = req.params.branchId;
  console.log(`[CORE] Flush requested for branch: ${branchId}`);
  await destroyClient(branchId, { logout: true });
  res.json({ message: "Logged out." });
});

app.get("/check-number/:branchId/:phone", requireAuth, async (req, res) => {
  const { branchId, phone } = req.params;
  try {
    const entry = await getClient(branchId);
    if (!entry.client || !entry.state.ready) {
      return res.json({ ready: false, exists: null, status: "verification_unavailable" });
    }
    const jid = toChatId(phone);
    const result = await entry.client.onWhatsApp(jid);
    const exists = result && result.length > 0 && result[0].exists;
    return res.json({ ready: true, exists: Boolean(exists), status: exists ? "exists" : "not_exists" });
  } catch (error) {
    return res.json({ ready: false, exists: null, status: "verification_unavailable" });
  }
});

// Auto-Update API
app.post("/update-bridge", requireAuth, (req, res) => {
  console.log(`[SYSTEM] Auto-update triggered via API. Installing @whiskeysockets/baileys@latest...`);
  res.json({ message: "Update initiated. Bridge will restart in a few seconds." });
  
  exec('npm install @whiskeysockets/baileys@latest', (error, stdout, stderr) => {
    if (error) {
      console.error(`[UPDATE] Error: ${error.message}`);
      return;
    }
    console.log(`[UPDATE] Success. Restarting process...`);
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
});


// Auto-start existing sessions
async function autoStartSessions() {
  try {
    const dirs = await fsp.readdir('sessions');
    const branchIds = dirs.filter(d => d.startsWith('baileys_auth_info_')).map(d => d.replace('baileys_auth_info_', ''));
    if (branchIds.length > 0) {
      console.log(`[SYSTEM] Auto-starting ${branchIds.length} existing sessions...`);
      for (const branchId of branchIds) {
        getClient(branchId).catch(console.error);
      }
    }
  } catch (e) {
    // sessions folder might not exist yet
  }
}

app.listen(port, () => {
  console.log(`[CORE] Bridge active on port ${port} (Powered by Baileys)`);
  autoStartSessions();
});
