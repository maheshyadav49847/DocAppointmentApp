# Code Review and WhatsApp Bridge

## Review Findings

1. **Auth pipeline is effectively disabled**
   - `Backend/CodeX.Api/Program.cs` calls `UseAuthorization()` but never configures `AddAuthentication()` or `UseAuthentication()`.
   - Result: controllers marked with `[Authorize]` are not protected as intended.

2. **Secrets were committed to source**
   - `Backend/CodeX.Api/appsettings.json` contained live-looking Twilio credentials in the repository.
   - Result: anyone with repo access could reuse those credentials. They should be rotated immediately and moved to environment variables or a secret store.

3. **Token numbers are race-prone**
   - `Backend/CodeX.Application/Features/Tokens/Commands/CreateToken/CreateTokenCommand.cs` computes `max(token_number) + 1` in application code.
   - Result: simultaneous bookings can generate duplicate token numbers unless a database constraint and retry strategy are added.

4. **WhatsApp bot scope was too broad**
   - `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs` originally listed all doctors and sessions globally.
   - Result: patients could be shown doctors from unrelated branches or stale queues.

5. **WhatsApp provider was hard-coupled to Twilio**
   - `Backend/CodeX.Infrastructure/DependencyInjection.cs` always bound `IWhatsAppService` to `TwilioWhatsAppService`.
   - Result: the bot could not run on a personal WhatsApp number without rewriting the outbound path.

## What Changed

- Added a provider-based switch in backend config:
  - `WhatsApp:Provider=Bridge` uses a local bridge instead of Twilio.
- Added `Backend/CodeX.Infrastructure/ExternalServices/BridgeWhatsAppService.cs`.
- Added `POST /api/whatsapp/webhook/process` in the API.
  - This endpoint returns only the bot reply and does not attempt Twilio delivery.
- Updated the WhatsApp conversation handler to:
  - normalize phone numbers from Twilio and WhatsApp Web formats,
  - show only today’s active doctors/sessions,
  - book only against today’s active queue.
- Replaced committed Twilio credentials in `appsettings.json` with empty placeholders.
- Added a local Node bridge in `DocAppointment/whatsapp-bridge/` using `whatsapp-web.js`.

## How the New Non-AI, Non-Twilio Bot Works

1. Patient messages your linked WhatsApp number.
2. `whatsapp-web.js` receives the message on the local machine.
3. The bridge calls `POST /api/whatsapp/webhook/process`.
4. Your existing .NET rule-based bot decides the reply.
5. The bridge sends that reply back on WhatsApp.
6. Proactive alerts from the backend are sent to the bridge via `POST /send`.

## Important Limitation

This personal-number setup uses WhatsApp Web automation, not the official WhatsApp Business API.
It is practical for demos/internal use, but it is less stable and can break if WhatsApp changes Web behavior or flags the account.

## Setup

1. Start the .NET API.
2. In `DocAppointment/whatsapp-bridge`, copy `.env.example` to `.env`.
3. Set `BACKEND_PROCESS_URL` to your API URL if needed.
4. Run `npm install`.
5. Run `npm start`.
6. Scan the QR from WhatsApp Linked Devices on the phone that owns the number.
7. Keep the bridge machine running for message delivery.
