# Security Vulnerability & Pentesting Report (Prioritized by Severity)

This document provides a technical overview of security vulnerabilities identified in the Hospital Appointment & Queue Management System, prioritized by their potential impact and exploitability.

---

## 🔴 CRITICAL SEVERITY

### 1. Unprotected API Endpoints (Broken Access Control)
- **Vulnerability**: Core controllers (e.g., `QueueController`, `BranchesController`) lack the `[Authorize]` attribute at the class level.
- **Impact**: Any anonymous user can trigger sensitive operations like calling the next patient, ending a clinic session, or modifying hospital branch details.
- **Location**: `Backend/CodeX.Api/Controllers/BaseApiController.cs`

### 2. Hardcoded JWT Signing Key (Cryptographic Failure)
- **Vulnerability**: The `IdentityService` uses a hardcoded fallback secret key: `"SuperSecretKeyForDocAppointmentApp123!"`.
- **Impact**: Attackers can use this publicly visible key to sign their own JWT tokens, allowing them to impersonate any user, including the `SuperAdmin`.
- **Location**: `Backend/CodeX.Infrastructure/Identity/IdentityService.cs`

### 3. Unprotected WhatsApp Webhooks (Signal Spoofing)
- **Vulnerability**: The backend webhook processing endpoint does not verify the origin or signature of incoming requests.
- **Impact**: Attackers can spoof incoming WhatsApp messages to simulate patient responses, manipulate doctor ratings, or disrupt queue logic.
- **Location**: `Backend/CodeX.Api/Controllers/WhatsAppWebhookController.cs`

---

## 🟠 HIGH SEVERITY

### 4. Insecure Direct Object Reference (IDOR)
- **Vulnerability**: Resource access is based on GUIDs without verifying that the authenticated user owns or belongs to the resource's parent organization.
- **Impact**: A valid user from one hospital can access or modify patient data, doctor lists, or session schedules of another hospital.

### 5. Insecure Token Storage (XSS Vulnerability)
- **Vulnerability**: JWT tokens are stored in the browser's `localStorage`.
- **Impact**: In the event of a Cross-Site Scripting (XSS) attack, an attacker's script can easily steal the user's session token and gain unauthorized access.
- **Location**: `Frontend/src/stores/authStore.ts`

### 6. Lack of API Rate Limiting (Denial of Service)
- **Vulnerability**: There is no rate limiting on the API or the Twilio integration.
- **Impact**: Attackers can automate requests to generate thousands of fake tokens, flood the database, or exhaust the hospital's Twilio SMS/WhatsApp credits.

---

## 🟡 MEDIUM SEVERITY

### 7. Plaintext Storage of Provider Secrets
- **Vulnerability**: Twilio `AuthToken` and `AccountSid` are written in plaintext to `appsettings.json`.
- **Impact**: Credential exposure if the server file system is compromised or if the configuration files are accidentally leaked.

### 8. Privilege Escalation (Vertical Access Control)
- **Vulnerability**: Roles like `BranchAdmin` have access to global configuration endpoints meant for `OrgAdmin`.
- **Impact**: A branch-level manager can modify settings (like Twilio credentials) that affect the entire organization.

### 9. Missing Security Headers
- **Vulnerability**: The API lacks critical headers such as `Content-Security-Policy` (CSP) and `Strict-Transport-Security` (HSTS).
- **Impact**: Increased susceptibility to Clickjacking and Man-in-the-Middle (MITM) attacks.

### 10. Improper Input Validation
- **Vulnerability**: Lack of strict length and format validation on the backend for inputs like phone numbers and patient names.
- **Impact**: Potential for database pollution or processing errors due to malformed data.

---

## 🟢 LOW SEVERITY

### 11. WhatsApp Bridge Information Disclosure
- **Vulnerability**: The `/health` endpoint of the bridge service reveals status and QR code generation timestamps.
- **Impact**: Minor information leakage that could assist in reconnaissance.

### 12. Runtime Configuration Updates
- **Vulnerability**: The application requires write access to its own binaries/config directory at runtime.
- **Impact**: Security anti-pattern that complicates server hardening and increases the risk of persistent threats.

---

## Technical Hardening Roadmap (Remediation)

| Priority | Action Item | Component |
| :--- | :--- | :--- |
| **P0** | Enforce `[Authorize]` globally on API controllers | Backend |
| **P0** | Remove hardcoded JWT keys and use environment secrets | Infrastructure |
| **P1** | Implement HMAC signature validation for all webhooks | Webhook Controller |
| **P1** | Implement multi-tenant ownership checks (Claims-based) | Middleware |
| **P2** | Migrate JWT storage from `localStorage` to `httpOnly` Cookies | Frontend |
| **P2** | Add `AspnetCoreRateLimit` to critical endpoints | Backend |
| **P3** | Configure standard Security Headers and HSTS | Backend |
