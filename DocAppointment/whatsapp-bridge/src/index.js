import 'dotenv/config';
import express from 'express';
import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

const port = Number(process.env.PORT || 3100);
const backendProcessUrl = process.env.BACKEND_PROCESS_URL || 'http://localhost:5000/api/whatsapp/webhook/process';
const bridgeApiKey = process.env.BRIDGE_API_KEY || '';

const app = express();
app.use(express.json({ limit: '1mb' }));

const state = {
  ready: false,
  lastQrAt: null
};

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'docappointment' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  state.lastQrAt = new Date().toISOString();
  console.log('\nScan this QR in WhatsApp Linked Devices:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  state.ready = true;
  console.log('WhatsApp bridge is ready.');
});

client.on('disconnected', (reason) => {
  state.ready = false;
  console.error(`WhatsApp bridge disconnected: ${reason}`);
});

client.on('message', async (message) => {
  try {
    if (message.fromMe || !message.body?.trim() || !message.from?.endsWith('@c.us')) {
      return;
    }

    const response = await fetch(backendProcessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: message.from,
        body: message.body
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Backend process call failed: ${response.status} ${body}`);
      return;
    }

    const payload = await response.json();
    if (payload?.reply) {
      await message.reply(payload.reply);
    }
  } catch (error) {
    console.error('Failed to process incoming WhatsApp message.', error);
  }
});

app.get('/health', (_req, res) => {
  res.json({
    ready: state.ready,
    lastQrAt: state.lastQrAt
  });
});

app.post('/send', async (req, res) => {
  try {
    if (bridgeApiKey && req.header('X-Bridge-Api-Key') !== bridgeApiKey) {
      return res.status(401).json({ error: 'Invalid bridge API key.' });
    }

    if (!state.ready) {
      return res.status(503).json({ error: 'WhatsApp bridge is not ready.' });
    }

    const to = normaliseToChatId(req.body?.to);
    const message = String(req.body?.message || '').trim();
    if (!to || !message) {
      return res.status(400).json({ error: 'Both to and message are required.' });
    }

    await client.sendMessage(to, message);
    return res.json({ delivered: true });
  } catch (error) {
    console.error('Failed to send WhatsApp message.', error);
    return res.status(500).json({ error: 'Failed to send WhatsApp message.' });
  }
});

client.initialize();

app.listen(port, () => {
  console.log(`WhatsApp bridge API listening on http://localhost:${port}`);
});

function normaliseToChatId(value) {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  if (input.endsWith('@c.us')) {
    return input;
  }

  const digits = input.replace(/\D/g, '');
  return digits ? `${digits}@c.us` : '';
}
