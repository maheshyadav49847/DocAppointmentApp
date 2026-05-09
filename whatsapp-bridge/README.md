# WhatsApp Bridge for DocAppointment

A Node.js Express server that bridges WhatsApp Web with the DocAppointment backend for automated appointment management through WhatsApp.

## Features

- **Multi-branch support**: Manage separate WhatsApp bots for different branches
- **QR-based authentication**: Scan QR code to authenticate with WhatsApp
- **Message webhook relay**: Incoming messages forwarded to backend for processing
- **Automatic replies**: Backend can respond to messages in real-time
- **Session persistence**: Uses local auth strategy to maintain connections
- **REST API**: Simple REST endpoints for message sending and status checks

## Installation

```bash
npm install
```

Or with specific versions:
```bash
npm install whatsapp-web.js@1.25.4 express@4.18.2 axios@1.6.0 qrcode@1.5.3
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```
PORT=3101
BACKEND_WEBHOOK_URL=http://localhost:5000/api/whatsapp/webhook
BRIDGE_API_KEY=your-secret-api-key
```

Ensure the `BRIDGE_API_KEY` matches the value in backend `appsettings.json`:
```json
"WhatsApp": {
  "BridgeApiKey": "your-secret-api-key"
}
```

## Running the Bridge

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Production Mode
```bash
npm start
```

## API Endpoints

### POST /send-message
Send a WhatsApp message from the authenticated account.

```json
{
  "branchId": "branch-uuid-here",
  "phoneNumber": "+1234567890",
  "message": "Hello, your appointment is confirmed!"
}
```

### GET /status/:branchId
Get connection status and QR code for a branch.

Response:
```json
{
  "ready": true,
  "branchId": "branch-uuid",
  "status": "connected",
  "lastQr": null,
  "lastQrAt": "2024-01-15T10:30:00Z",
  "hasQr": false,
  "qrImage": "data:image/png;base64,..."
}
```

When not connected, `lastQr` and `qrImage` will contain the QR code data for authentication.

### POST /restart/:branchId
Restart the WhatsApp client for a specific branch.

```json
{
  "success": true,
  "message": "Client restarted",
  "branchId": "branch-uuid"
}
```

### POST /logout/:branchId
Logout and disconnect a branch account.

```json
{
  "success": true,
  "message": "Logged out successfully",
  "branchId": "branch-uuid"
}
```

### GET /health
Simple health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## How It Works

1. **Backend initiates**: Backend calls `GET /status/:branchId` to check if client is ready
2. **QR Authentication**: If not connected, user scans QR code displayed in UI
3. **Message Arrival**: WhatsApp message arrives → client receives it
4. **Webhook Relay**: Message forwarded to backend webhook with branch context
5. **Processing**: Backend processes message (check appointment, send confirmation, etc.)
6. **Reply**: Backend sends response back to bridge
7. **Send Message**: Bridge sends reply message to customer via WhatsApp

## Webhook Payload Format

Incoming messages sent to backend webhook:

```json
{
  "branchId": "your-branch-uuid",
  "from": "1234567890@c.us",
  "body": "Hi, I want to book an appointment"
}
```

Response from backend should include:
```json
{
  "reply": "Thank you! Here are available doctors..."
}
```

## Frontend Integration

The frontend should:

1. **Check Status**: Poll `/status/:branchId` to get QR code
2. **Display QR**: Show `qrImage` or `lastQr` to user for scanning
3. **Send Messages**: Use backend API (not direct bridge API)
4. **Monitor Connection**: Track `ready` status and show connection state

## Troubleshooting

### QR Code Not Displaying
- Check browser console for errors
- Verify `BACKEND_WEBHOOK_URL` is correct
- Ensure bridge is running (`npm start`)
- Check that API key matches

###  Messages Not Arriving
- Check bridge console for webhook errors
- Verify `BRIDGE_API_KEY` in backend config
- Ensure WhatsApp Web session is not logged out
- Check network connectivity to backend

### Client Keeps Disconnecting
- WhatsApp may log you out for security
- Try `/logout` and re-authenticate with QR
- Check WhatsApp mobile app settings (no auto-logout)
- Ensure device timestamp is accurate

## Development Tips

- Use separate branch IDs for testing different scenarios
- Monitor console output: logs include branch ID for debugging
- Each branch maintains its own authentication session
- Sessions are persisted in `.wwebjs_auth/` directory
- Delete session folder to force re-authentication

## Security Considerations

- Never expose `BRIDGE_API_KEY` in frontend code
- Always use HTTPS in production
- Validate all webhook requests with API key
- Monitor webhook logs for suspicious activity
- Rotate API keys periodically
- Keep whatsapp-web.js updated

## License

MIT
