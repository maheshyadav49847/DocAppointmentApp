import "dotenv/config";
import express from "express";
import QRCode from "qrcode";
import fs from "fs";
import pino from "pino";
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
app.use(express.json({ limit: "1mb" }));

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
  const finalDigits = digits.length === 10 ? `91${digits}` : digits;
  return `${finalDigits}@s.whatsapp.net`;
}

async function relayIncomingMessage(branchId, message) {
  // Prefer the traditional phone-based JID if available in remoteJidAlt
  let from = message.key.remoteJid;
  if (message.key.remoteJidAlt && message.key.remoteJidAlt.includes("@s.whatsapp.net")) {
    from = message.key.remoteJidAlt;
  }

  if (!message.message || message.key.fromMe) return;
  if (!from || from.includes("@g.us")) return; // Ignore groups

  const body = message.message.conversation || message.message.extendedTextMessage?.text;
  if (!body) return;

  // Convert @s.whatsapp.net or @lid to @c.us for backend compatibility
  const normalizedFrom = from.replace("@s.whatsapp.net", "@c.us").replace("@lid", "@c.us");

  try {
    console.log(`[WEBHOOK] Attempting relay for ${branchId} to ${backendWebhookUrl}...`);
    const response = await fetch(backendWebhookUrl, {
      method: "POST",
      headers: buildBridgeHeaders(),
      body: JSON.stringify({
        sessionId: branchId,
        from: normalizedFrom,
        body
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[WEBHOOK] Relay failed for ${branchId}. Status=${response.status} Body=${errorBody}`);
    } else {
      console.log(`[WEBHOOK] Relay success for ${branchId}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Relay failed for ${branchId} (${backendWebhookUrl}): ${error.message}`);
  }
}

async function getClient(branchId) {
  if (!branchId) {
    return { state: { ready: false, lastQr: null, error: "No branchId supplied", step: "Invalid Request" }, client: null };
  }

  if (clients.has(branchId)) {
    return clients.get(branchId);
  }

  const entry = {
    state: {
      ready: false,
      lastQr: null,
      lastQrAt: null,
      error: null,
      step: "Initializing"
    },
    client: null,
    saveCreds: null
  };

  clients.set(branchId, entry);
  console.log(`[SYSTEM] Creating node for ${branchId}`);

  async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(`baileys_auth_info_${branchId}`);
    entry.saveCreds = saveCreds;

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "warn" })
    });

    entry.client = sock;

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        entry.state.ready = false;
        entry.state.lastQr = qr;
        entry.state.lastQrAt = new Date().toISOString();
        entry.state.error = null;
        entry.state.step = "Awaiting Scan";
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 428 && statusCode !== 401;
        entry.state.ready = false;
        
        if (shouldReconnect) {
          entry.state.step = "Reconnecting...";
          console.log(`[WARN] ${branchId} connection closed due to error (Status: ${statusCode}), reconnecting...`);
          setTimeout(connectToWhatsApp, 2000); // Backoff to prevent spamming WhatsApp servers
        } else {
          entry.state.step = "Logged Out";
          entry.state.error = "Session invalid or logged out";
          console.log(`[AUTH] ${branchId} session invalid (Status: ${statusCode}). Wiping keys...`);
          
          // Perform synchronous wiping to prevent race conditions with frontend polling
          try {
            if (entry.client) {
              entry.client.end(undefined);
            }
            fs.rmSync(`baileys_auth_info_${branchId}`, { recursive: true, force: true });
          } catch (e) {
            console.error(`[AUTH] Error wiping keys: ${e.message}`);
          }
          clients.delete(branchId);
        }
      } else if (connection === "open") {
        entry.state.ready = true;
        entry.state.lastQr = null;
        entry.state.lastQrAt = null;
        entry.state.error = null;
        entry.state.step = "Operational";
        console.log(`[READY] ${branchId} is connected`);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          relayIncomingMessage(branchId, msg);
        }
      }
    });
  }

  await connectToWhatsApp();
  return entry;
}

async function destroyClient(branchId, { logout = false } = {}) {
  const entry = clients.get(branchId);
  if (entry?.client) {
    if (logout) {
      await entry.client.logout().catch(() => {});
    }
    entry.client.end(undefined);
  }
  
  if (logout) {
    fs.rmSync(`baileys_auth_info_${branchId}`, { recursive: true, force: true });
  }
  
  clients.delete(branchId);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, sessions: clients.size });
});

app.get("/status/test", (_req, res) => {
  res.json({ ok: true });
});

app.get("/qr/:branchId", async (req, res) => {
  const { state } = await getClient(req.params.branchId);
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

  const qrImage = await QRCode.toDataURL(state.lastQr);
  res.send(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${qrImage}" style="width:90%;height:90%;object-fit:contain;" /></body></html>`);
});

app.get("/status/:branchId", async (req, res) => {
  const { state } = await getClient(req.params.branchId);
  res.json({
    ...state,
    hasQr: Boolean(state.lastQr)
  });
});

app.post("/send-message", async (req, res) => {
  const { branchId, to, message } = req.body ?? {};
  console.log(`[OUTGOING] Attempting relay for ${branchId} to ${to}...`);
  console.log(`[OUTGOING] Message: "${message}"`);

  if (!branchId || !to || !message) {
    console.error("[OUTGOING] Missing parameters");
    return res.status(400).json({ message: "branchId, to, and message are required." });
  }

  try {
    const entry = await getClient(String(branchId));
    if (!entry.client || !entry.state.ready) {
      console.error(`[OUTGOING] Client not ready for branch ${branchId}`);
      return res.status(409).json({ message: "WhatsApp client is not ready for this branch." });
    }

    const jid = toChatId(to);
    await entry.client.sendMessage(jid, { text: String(message) });
    console.log(`[OUTGOING] Message sent successfully to ${jid}`);
    return res.json({ sent: true });
  } catch (error) {
    console.error(`[OUTGOING] Failed to send message for ${branchId}: ${error.message}`);
    return res.status(500).json({ message: "Failed to send WhatsApp message." });
  }
});

app.post("/restart/:branchId", async (req, res) => {
  await destroyClient(req.params.branchId);
  res.json({ message: "Resetting..." });
});

app.post("/logout/:branchId", async (req, res) => {
  await destroyClient(req.params.branchId, { logout: true });
  res.json({ message: "Logged out." });
});

app.get("/check-number/:branchId/:phone", async (req, res) => {
  const { branchId, phone } = req.params;
  try {
    const entry = await getClient(branchId);
    if (!entry.client || !entry.state.ready) {
      // If bridge client isn't ready/authenticated, assume exists=true so flow doesn't block
      return res.json({ ready: false, exists: true });
    }
    const jid = toChatId(phone);
    const result = await entry.client.onWhatsApp(jid);
    const exists = result && result.length > 0 && result[0].exists;
    return res.json({ ready: true, exists: Boolean(exists) });
  } catch (error) {
    console.error(`[CHECK] Failed to verify number ${phone} for branch ${branchId}: ${error.message}`);
    return res.json({ ready: false, exists: true });
  }
});

app.listen(port, () => console.log(`[CORE] Bridge active on port ${port} (Powered by Baileys)`));
