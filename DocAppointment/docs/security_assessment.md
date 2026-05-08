# Security Vulnerability & Pentesting Report (Prioritized by Severity)

This document provides a technical overview of security vulnerabilities identified in the Hospital Appointment & Queue Management System, prioritized by their potential impact and exploitability.

---

## 🔴 CRITICAL SEVERITY

### 1. Unprotected API Endpoints (Broken Access Control) - ✅ RESOLVED
- **Vulnerability**: Core controllers lacked the `[Authorize]` attribute.
- **Fix**: Added `[Authorize]` to `BaseApiController`. Explicitly added `[AllowAnonymous]` to Login and Register endpoints.
- **Location**: `Backend/CodeX.Api/Controllers/BaseApiController.cs`

### 2. Hardcoded JWT Signing Key (Cryptographic Failure) - ✅ RESOLVED
- **Vulnerability**: The `IdentityService` used a hardcoded fallback secret key.
- **Fix**: Removed the hardcoded fallback. The application now throws an exception if the JWT Secret is not configured in environment variables or appsettings.
- **Location**: `Backend/CodeX.Infrastructure/Identity/IdentityService.cs`

### 3. Unprotected WhatsApp Webhooks (Signal Spoofing) - ✅ RESOLVED
- **Vulnerability**: Webhook endpoints lacked origin/signature verification.
- **Fix**: Implemented `X-Bridge-Api-Key` header validation for the WhatsApp bridge and added security notes for Twilio signature verification.
- **Location**: `Backend/CodeX.Api/Controllers/WhatsAppWebhookController.cs`

### 3.1 Unprotected SignalR Hubs (Information Disclosure) - ✅ RESOLVED
- **Vulnerability**: `QueueHub` lacked authorization and IDOR checks.
- **Fix**: Added `[Authorize]` and implemented branch-level ownership validation in `JoinBranchGroup` using `ICurrentUserService`.

---

## 🟠 HIGH SEVERITY

### 4. Insecure Direct Object Reference (IDOR) - ✅ RESOLVED
- **Vulnerability**: Resource access was based on GUIDs without ownership verification.
- **Fix**: Implemented `ICurrentUserService` and added mandatory `OrganizationId` filtering in `BranchesController` and `QueueController`.

### 5. Insecure Token Storage (XSS Vulnerability) - ✅ RESOLVED
- **Vulnerability**: JWT tokens were stored in `localStorage`.
- **Fix**: Migrated to secure `httpOnly` cookies for JWT storage. Frontend now uses `withCredentials: true` and no longer has access to the token string, significantly reducing XSS risks.
- **Location**: `Frontend/src/stores/authStore.ts`

### 6. Lack of API Rate Limiting (Denial of Service) - ✅ RESOLVED
- **Vulnerability**: Potential for brute-force and DoS attacks.
- **Fix**: Implemented custom MemoryCache-based rate limiting middleware in `Program.cs`. Brute-force attempts on `/api/auth/login` are now throttled (10 requests per minute per IP).

### 10.3 Lack of Uniqueness Constraints (Account Takeover / Collision) - ✅ RESOLVED
- **Vulnerability**: Duplicate emails/slugs could be registered.
- **Fix**: Added mandatory email and slug uniqueness checks in the `RegisterOrganization` command handler using `AnyAsync` checks.

---

## 🟡 MEDIUM SEVERITY

### 7. Plaintext Storage of Provider Secrets - ✅ RESOLVED
- **Vulnerability**: Secrets were written to `appsettings.json` at runtime.
- **Fix**: Migrated to a database-backed `SystemSettings` table. Secrets are no longer stored in the file system or version-controlled config files.

### 8. Privilege Escalation (Vertical Access Control) - ✅ RESOLVED
- **Vulnerability**: `BranchAdmin` had access to global settings.
- **Fix**: Restricted `WhatsAppConfigController` access exclusively to `SuperAdmin` and `OrgAdmin` roles.

### 9. Missing Security Headers - ✅ RESOLVED
- **Vulnerability**: API lacked standard security headers.
- **Fix**: Implemented custom middleware in `Program.cs` to enforce HSTS, CSP (default-src 'self'), X-Frame-Options (DENY), and X-Content-Type-Options (nosniff).

### 10. Improper Input Validation - ✅ RESOLVED
- **Vulnerability**: Weak validation on patient inputs.
- **Fix**: Added `[Required]`, `[StringLength]`, and `[RegularExpression]` attributes to the Token and Queue commands to ensure data integrity and prevent malformed inputs.

### 10.1 Weak Database Credentials - ✅ RESOLVED
- **Vulnerability**: Hardcoded `Password=sa` in config files.
- **Fix**: Removed hardcoded secrets from `appsettings.json` and replaced them with placeholders. System now expects credentials via environment variables for production security.

### 10.2 Long JWT Lifespan - ✅ RESOLVED
- **Vulnerability**: 12-hour session window.
- **Fix**: Reduced JWT lifespan to 2 hours and migrated to `DateTime.UtcNow` for precise expiration logic in `IdentityService.cs`.

---

## 🟢 LOW SEVERITY

### 11. WhatsApp Bridge Information Disclosure - ✅ RESOLVED
- **Vulnerability**: `/health` endpoint was publicly accessible.
- **Fix**: Protected the `/health` endpoint with the `BRIDGE_API_KEY` requirement.

### 12. Runtime Configuration Updates - ✅ RESOLVED
- **Vulnerability**: Application required write access to its own config files.
- **Fix**: Migrated to database-backed configuration. The API no longer attempts to modify `appsettings.json` at runtime, eliminating the need for elevated file system permissions.

---

## Technical Hardening Roadmap (Remediation)

| Priority | Action Item | Component |
| :--- | :--- | :--- |
| **P0** | Enforce `[Authorize]` globally on API controllers [COMPLETED] | Backend |
| **P0** | Remove hardcoded JWT keys and use environment secrets [COMPLETED] | Infrastructure |
| **P1** | Implement HMAC signature validation for all webhooks [COMPLETED] | Webhook Controller |
| **P1** | Implement multi-tenant ownership checks (Claims-based) [COMPLETED] | Middleware |
| **P2** | Migrate JWT storage from `localStorage` to `httpOnly` Cookies [COMPLETED] | Frontend |
| **P2** | Add `AspnetCoreRateLimit` to critical endpoints [COMPLETED] | Backend |
| **P3** | Configure standard Security Headers and HSTS [COMPLETED] | Backend |
