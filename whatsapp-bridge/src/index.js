/**
 * WhatsApp Bridge - Connects WhatsApp Web to DocAppointment Backend
 * Provides REST API endpoints for message sending and webhook notifications
 */

const express = require('express');
const { Client, LocalAuth, MessageTypes } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3101;
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:5000/api/whatsapp/webhook';
const BACKEND_API_KEY = process.env.BRIDGE_API_KEY || 'codex-secret-123';

// ─── State Management ───────────────────────────────────────────────────
const clients = {}; // Multiple clients for multi-branch support
const sessionQR = {}; // Store QR codes for sessions
let lastQRData = null;

// ─── WhatsApp Client Factory ─────────────────────────────────────────────
function createWhatsAppClient(branchId) {
  if (clients[branchId]) {
    return clients[branchId];
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `branch-${branchId}` }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/client.html'
    }
  });

  // QR Code event
  client.on('qr', async (qr) => {
    lastQRData = qr;
    sessionQR[branchId] = { qr, generatedAt: new Date(), branchId };
    console.log(`[${branchId}] QR Code generated, scan to login`);
    try {
      const qrImageUrl = await QRCode.toDataURL(qr);
      sessionQR[branchId].qrImage = qrImageUrl;
    } catch (err) {
      console.error(`[${branchId}] Error generating QR image:`, err);
    }
  });

  // Ready event
  client.on('ready', () => {
    console.log(`[${branchId}] WhatsApp client connected!`);
    sessionQR[branchId] = null; // Clear QR after login
    lastQRData = null;
  });

  // ─── Incoming Message Handler ───────────────────────────────────────
  client.on('message', async (msg) => {
    console.log(`[${branchId}] Incoming: ${msg.from} -> ${msg.body}`);

    try {
      // Forward to backend webhook with branch context
      const webhookPayload = {
        branchId: branchId, // Tell backend which branch this is for
        from: msg.from,
        body: msg.body
      };

      const response = await axios.post(BACKEND_WEBHOOK_URL, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Bridge-Api-Key': BACKEND_API_KEY
        },
        timeout: 10000
      });

      if (response.data.reply) {
        // Send backend response back to WhatsApp
        await msg.reply(response.data.reply);
        console.log(`[${branchId}] Reply sent to ${msg.from}`);
      }
    } catch (error) {
      console.error(`[${branchId}] Webhook error:`, error.message);
      // Optionally send error reply to user
      await msg.reply('Sorry, an error occurred processing your message. Please try again.');
    }
  });

  // Disconnect handler
  client.on('disconnected', (reason) => {
    console.log(`[${branchId}] Client disconnected:`, reason);
    delete clients[branchId];
    delete sessionQR[branchId];
  });

  // Auth failure
  client.on('auth_failure', () => {
    console.log(`[${branchId}] Authentication failed`);
    delete clients[branchId];
  });

  client.initialize();
  clients[branchId] = client;
  return client;
}

// ─── API ENDPOINTS ──────────────────────────────────────────────────────

/**
 * POST /send-message
 * Send a WhatsApp message to a phone number
 */
app.post('/send-message', async (req, res) => {
  const { branchId, phoneNumber, message } = req.body;

  if (!branchId || !phoneNumber || !message) {
    return res.status(400).json({ error: 'Missing branchId, phoneNumber, or message' });
  }

  try {
    const client = createWhatsAppClient(branchId);
    
    // Wait for client to be ready
    if (!client.info) {
      return res.status(503).json({ error: 'WhatsApp client not ready for this branch' });
    }

    // Format phone number if needed
    let formattedNumber = phoneNumber;
    if (!formattedNumber.includes('@')) {
      // Remove all non-digits except +
      const digits = formattedNumber.replace(/\D/g, '');
      formattedNumber = `${digits}@c.us`;
    }

    await client.sendMessage(formattedNumber, message);
    res.json({ success: true, message: 'Message sent', phoneNumber: formattedNumber });
  } catch (error) {
    console.error(`Send message error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status/:branchId
 * Get connection status and QR code for a branch
 */
app.get('/status/:branchId', async (req, res) => {
  const { branchId } = req.params;

  try {
    const client = createWhatsAppClient(branchId);
    
    const isConnected = !!client.info;
    const qrData = sessionQR[branchId] || null;

    res.json({
      ready: isConnected,
      branchId: branchId,
      status: isConnected ? 'connected' : 'disconnected',
      lastQr: lastQRData, // Last QR code for UI display
      lastQrAt: qrData?.generatedAt || null,
      hasQr: !!qrData,
      qrImage: qrData?.qrImage || null // Base64 encoded QR image for UI
    });
  } catch (error) {
    res.status(500).json({ ready: false, error: error.message });
  }
});

/**
 * POST /restart/:branchId
 * Restart the WhatsApp client for a branch
 */
app.post('/restart/:branchId', async (req, res) => {
  const { branchId } = req.params;

  try {
    const client = clients[branchId];
    
    if (client) {
      await client.destroy();
      delete clients[branchId];
      delete sessionQR[branchId];
      console.log(`[${branchId}] Client destroyed`);
    }

    // Create new client
    createWhatsAppClient(branchId);
    res.json({ success: true, message: 'Client restarted', branchId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /logout/:branchId
 * Logout and disconnect the WhatsApp client for a branch
 */
app.post('/logout/:branchId', async (req, res) => {
  const { branchId } = req.params;

  try {
    const client = clients[branchId];
    
    if (client) {
      await client.logout();
      await client.destroy();
      delete clients[branchId];
      delete sessionQR[branchId];
      console.log(`[${branchId}] Client logged out`);
      res.json({ success: true, message: 'Logged out successfully', branchId });
    } else {
      res.status(404).json({ error: 'Client not found for this branch' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ─── Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start Server ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bridge running on port ${PORT}`);
  console.log(`Backend webhook URL: ${BACKEND_WEBHOOK_URL}`);
  console.log(`API Key configured: ${!!BACKEND_API_KEY}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down bridge...');
  for (const [branchId, client] of Object.entries(clients)) {
    try {
      await client.destroy();
    } catch (err) {
      console.error(`Error destroying client for ${branchId}:`, err);
    }
  }
  process.exit(0);
});
