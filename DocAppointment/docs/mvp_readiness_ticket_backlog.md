# Doctor Appointment MVP Readiness Ticket Backlog

Scope: `Backend`, `Frontend`, and `whatsapp-bridge` only. `MobileApp` intentionally excluded from this review.

Verdict: the product is not MVP-ready for a real clinic rollout. It is close to a demoable admin panel, but core scheduling, authorization, queue integrity, and messaging controls still have multiple P0/P1 gaps.

## P0

### MVP-001 | Session capacity, booking window, and overflow rules are not enforced
- Problem: token creation does not enforce session capacity, booking-open timing, or "move to next session when full" rules.
- Evidence: `Backend/CodeX.Domain/Entities/Session.cs`, `Backend/CodeX.Application/Features/Tokens/Commands/CreateToken/CreateTokenCommand.cs`, `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`
- Impact: overbooking is possible and the core appointment promise becomes unreliable.
- Recommended fix: centralize slot-availability checks in one backend service used by both manual booking and WhatsApp booking.
- Acceptance criteria: once a session is full or not yet open, no booking path can create another active token for it; overflow behaves exactly as defined.

### MVP-002 | Ending a queue leaves pending patients in an inconsistent active state
- Problem: end-session flow completes only the currently called patient and leaves pending tokens untouched.
- Evidence: `Backend/CodeX.Application/Features/Queue/Commands/EndQueue/EndQueueCommand.cs`, `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`
- Impact: patients can still look "booked" after staff has ended the session.
- Recommended fix: explicitly resolve all remaining pending/called tokens when a queue ends and teach WhatsApp flow to treat ended queues as closed.
- Acceptance criteria: after queue end, no token from that queue appears as an active appointment in API or chat flow.

### MVP-003 | Critical uniqueness guarantees were removed without safe replacement
- Problem: DB-level uniqueness for queue/day and token sequencing was removed, but application code still assumes single-writer semantics.
- Evidence: `Backend/CodeX.Infrastructure/Persistence/Migrations/20260507175447_RemoveUniqueConstraints.cs`, `Backend/CodeX.Infrastructure/Persistence/Configurations/TokenConfiguration.cs`, `Backend/CodeX.Infrastructure/Persistence/Configurations/DailyQueueConfiguration.cs`, `Backend/CodeX.Application/Features/Tokens/Commands/CreateToken/CreateTokenCommand.cs`, `Backend/CodeX.Application/Features/Queue/Commands/CreateDailyQueue/CreateDailyQueueCommand.cs`
- Impact: concurrent traffic can create duplicate queues or duplicate token numbers.
- Recommended fix: restore DB constraints or use transactional locking plus unique indexes on safe keys.
- Acceptance criteria: concurrent booking and queue initialization cannot produce duplicate queue rows or duplicate token numbers.

### MVP-004 | Phone and email normalization is inconsistent across channels
- Problem: WhatsApp, manual booking, login, password reset, and staff/org creation normalize contact data differently.
- Evidence: `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`, `Backend/CodeX.Application/Features/Tokens/Commands/CreateToken/CreateTokenCommand.cs`, `Backend/CodeX.Application/Features/Auth/Commands/Login/LoginCommand.cs`, `Backend/CodeX.Application/Features/Auth/Commands/ForgotPassword/ForgotPasswordCommand.cs`, `Backend/CodeX.Application/Features/Auth/Commands/ResetPassword/ResetPasswordCommand.cs`, `Backend/CodeX.Application/Features/Organizations/Commands/RegisterOrganization/RegisterOrganizationCommand.cs`, `Frontend/src/components/ManualBookingModal.tsx`
- Impact: duplicate patients, failed login/reset for casing differences, and conflicting identity records.
- Recommended fix: introduce canonical normalization helpers for patient phones and staff emails and enforce them on every write and lookup path.
- Acceptance criteria: the same human cannot be duplicated by format differences alone and auth works regardless of email case.

### MVP-005 | Doctor, session, token, and branch CRUD still have ownership gaps
- Problem: several handlers and controllers mutate entities by ID without complete org/branch ownership checks.
- Evidence: `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Backend/CodeX.Api/Controllers/DoctorsController.cs`, `Backend/CodeX.Api/Controllers/SessionsController.cs`, `Backend/CodeX.Api/Controllers/TokensController.cs`, `Backend/CodeX.Application/Features/Doctors/Commands/UpdateDoctor/UpdateDoctorCommand.cs`, `Backend/CodeX.Application/Features/Sessions/Commands/CreateSession/CreateSessionCommand.cs`, `Backend/CodeX.Application/Features/Sessions/Commands/UpdateSession/UpdateSessionCommand.cs`, `Backend/CodeX.Application/Features/Sessions/Commands/DeleteSession/DeleteSessionCommand.cs`, `Backend/CodeX.Application/Features/Tokens/Commands/UpdateToken/UpdateTokenCommand.cs`, `Backend/CodeX.Application/Common/Authorization/EntityAuthorizationService.cs`
- Impact: multi-branch isolation is not dependable.
- Recommended fix: use one shared authorization service in all handlers and fail closed for wrong org or wrong branch.
- Acceptance criteria: every doctor/session/token/branch mutation is rejected unless the caller is allowed for that exact org and branch.

### MVP-006 | Public rating submission can be abused
- Problem: anonymous rating creation only checks that a token exists and that the token has not already been rated.
- Evidence: `Backend/CodeX.Api/Controllers/RatingsController.cs`, `Backend/CodeX.Application/Features/Ratings/Commands/CreateRating/CreateRatingCommand.cs`
- Impact: anyone with a token ID can poison ratings without having completed a real visit.
- Recommended fix: rate only completed tokens, require a signed feedback link or short-lived proof token, and bind rating to the actual patient journey.
- Acceptance criteria: ratings are accepted only for completed, eligible visits through a verifiable one-time flow.

### MVP-007 | Queue date logic is UTC-based and branch timezone is effectively unused
- Problem: daily queue lookup, queue reset assumptions, and active-queue queries use `DateTime.UtcNow.Date` instead of branch-local dates.
- Evidence: `Backend/CodeX.Domain/Entities/Branch.cs`, `Backend/CodeX.Application/Features/Queue/Commands/CreateDailyQueue/CreateDailyQueueCommand.cs`, `Backend/CodeX.Api/Controllers/QueueController.cs`, `Backend/CodeX.Application/Features/Queue/Queries/GetQueueStats/GetQueueStatsQuery.cs`, `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`
- Impact: same-day behavior around midnight is unreliable for real clinics.
- Recommended fix: compute operational date in branch-local timezone everywhere queues are created, read, or reset.
- Acceptance criteria: queue day boundaries match the branch timezone, not server UTC.

### MVP-008 | Branch "offline" state is cosmetic
- Problem: branch `IsActive` can be toggled in settings but booking flow does not honor it.
- Evidence: `Frontend/src/features/settings/components/BranchesPage.tsx`, `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`
- Impact: staff can mark a branch offline while bookings still continue.
- Recommended fix: enforce `IsActive` in all patient-facing and staff-facing booking flows.
- Acceptance criteria: offline branches reject new bookings from both UI and WhatsApp.

### MVP-009 | Missed-token auto-skip and self-rejoin flow is missing
- Problem: product behavior for automatically skipping missed patients and letting them rejoin by reply is not implemented.
- Evidence: `Backend/CodeX.Application/Features/WhatsApp/Commands/ProcessIncomingMessage/ProcessIncomingMessageCommand.cs`, `Backend/CodeX.Application/Features/Queue/Commands/SkipToken/SkipTokenCommand.cs`, `Backend/CodeX.Application/Features/Queue/Commands/RequeueToken/RequeueTokenCommand.cs`
- Impact: one of the core queue-recovery flows is absent.
- Recommended fix: add timeout-driven missed-call state, automated skip, and chat-based rejoin logic.
- Acceptance criteria: a missed patient is auto-skipped after the configured window and can rejoin using the approved chat reply.

### MVP-010 | Receptionists can reach admin CRUD paths from the web app
- Problem: branch, doctor, and session admin screens are reachable from normal authenticated routes, and the UI exposes create/edit/delete actions far beyond receptionist scope.
- Evidence: `Frontend/src/App.tsx`, `Frontend/src/layouts/DashboardLayout.tsx`, `Frontend/src/features/settings/components/BranchesPage.tsx`, `Frontend/src/features/doctors/components/DoctorsList.tsx`, `Frontend/src/features/sessions/components/SessionsList.tsx`, `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Backend/CodeX.Api/Controllers/DoctorsController.cs`, `Backend/CodeX.Api/Controllers/SessionsController.cs`
- Impact: a receptionist can create branches, edit schedules, or delete doctors through the current web product shape.
- Recommended fix: add route-level role guards in frontend and role-based authorization in backend controllers/handlers.
- Acceptance criteria: receptionist accounts cannot see or use admin CRUD controls and backend rejects direct calls as well.

### MVP-011 | Branch-scoped staff can access and control other branches inside the same org
- Problem: queue APIs and SignalR group join checks stop at org ownership, not branch ownership, and branch-scoped roles are not narrowed to their own branch.
- Evidence: `Backend/CodeX.Api/Controllers/QueueController.cs`, `Backend/CodeX.Api/Hubs/QueueHub.cs`
- Impact: one branch's receptionist can inspect or manipulate another branch's live queue if they know IDs.
- Recommended fix: enforce branch-level checks in `CanAccessQueue`, queue detail reads, active-queue queries, upcoming-token reads, and hub group joins.
- Acceptance criteria: branch-scoped users can only observe and manipulate their assigned branch.

### MVP-012 | WhatsApp bridge has unauthenticated control and send surfaces
- Problem: bridge endpoints for status, QR, send-message, restart, logout, and check-number do not validate any inbound API key or session authority.
- Evidence: `whatsapp-bridge/src/index.js`
- Impact: if the bridge port is reachable, an attacker can fetch QR codes, send messages, or force branch logout.
- Recommended fix: require a strong inbound API key or service-to-service auth on every non-health endpoint and reject unknown callers.
- Acceptance criteria: unauthenticated requests to bridge control or send endpoints return `401/403` and cannot create side effects.

### MVP-013 | WhatsApp and webhook logs expose PHI and message content
- Problem: incoming patient messages, outgoing messages, phone numbers, and OTP-related activity are logged in plaintext.
- Evidence: `Backend/CodeX.Api/Controllers/WhatsAppWebhookController.cs`, `Backend/CodeX.Application/Features/Auth/Commands/ForgotPassword/ForgotPasswordCommand.cs`, `whatsapp-bridge/src/index.js`
- Impact: medical workflow content and contact information leak into logs.
- Recommended fix: remove message bodies and secrets from logs, use redaction, and keep only minimal operational metadata.
- Acceptance criteria: no production log entry contains OTPs, patient chat content, or full destination phone numbers.

## P1

### MVP-014 | Session CRUD lacks server-side business validation
- Problem: backend accepts invalid session windows and capacities.
- Evidence: `Backend/CodeX.Application/Features/Sessions/Commands/CreateSession/CreateSessionCommand.cs`, `Backend/CodeX.Application/Features/Sessions/Commands/UpdateSession/UpdateSessionCommand.cs`
- Impact: schedules with `end < start`, zero capacity, or negative capacity can be persisted.
- Recommended fix: add server-side validation for times, capacity, duplicates, and branch/doctor compatibility.
- Acceptance criteria: invalid session definitions cannot be saved through any API path.

### MVP-015 | Web app stores JWT in local persistence and keeps header-based auth alive
- Problem: auth still depends on JWT returned in response and stored in Zustand/localStorage, including SignalR token lookup from localStorage.
- Evidence: `Frontend/src/stores/authStore.ts`, `Frontend/src/services/api.ts`, `Frontend/src/hooks/useQueueHub.ts`, `Backend/CodeX.Api/Controllers/AuthController.cs`
- Impact: session tokens remain exposed to XSS and browser persistence even though cookie-based auth is partially present.
- Recommended fix: move fully to secure httpOnly cookie auth and remove client-side token storage.
- Acceptance criteria: frontend does not persist JWTs and authenticated requests still work through cookies only.

### MVP-016 | SMS fallback and delivery failure handling are incomplete
- Problem: queue notifications mostly attempt WhatsApp and log failures; they do not reliably fallback to SMS for patient-facing booking/queue events.
- Evidence: `Backend/CodeX.Application/Features/Tokens/Commands/CreateToken/CreateTokenCommand.cs`, `Backend/CodeX.Application/Features/Queue/Commands/CallNextToken/CallNextTokenCommand.cs`, `Backend/CodeX.Application/Features/Queue/Commands/DoctorArrived/DoctorArrivedCommand.cs`, `Backend/CodeX.Application/Common/Interfaces/ISmsService.cs`
- Impact: patients miss updates whenever WhatsApp or bridge delivery fails.
- Recommended fix: implement a shared delivery policy with retry, fallback, and outcome persistence.
- Acceptance criteria: each notification path records final channel outcome and uses fallback when primary channel fails.

### MVP-017 | Reporting relies on unreliable or missing message-log data
- Problem: analytics query reads `MessageLogs`, but send services do not consistently persist message outcomes.
- Evidence: `Backend/CodeX.Application/Features/Reports/Queries/GetBranchAnalytics/GetBranchAnalyticsQuery.cs`, `Backend/CodeX.Infrastructure/ExternalServices/BridgeWhatsAppService.cs`, `Backend/CodeX.Infrastructure/ExternalServices/TwilioWhatsAppService.cs`
- Impact: WhatsApp delivery dashboards are misleading or empty.
- Recommended fix: persist send attempts and delivery outcomes from every provider in one message-log model.
- Acceptance criteria: report counts match real send attempts and delivery statuses for both bridge and Twilio flows.

### MVP-018 | Explicit consultation-complete workflow is missing in the receptionist UI
- Problem: backend supports token completion, but queue dashboard does not provide a clean, primary completion action that advances workflow correctly.
- Evidence: `Frontend/src/services/queueService.ts`, `Frontend/src/features/queue/components/QueueDashboard.tsx`, `Backend/CodeX.Application/Features/Queue/Commands/CompleteToken/CompleteTokenCommand.cs`
- Impact: staff must use awkward next/skip/end combinations to move the queue.
- Recommended fix: add a first-class complete action with clear state transitions and notifications.
- Acceptance criteria: a receptionist can complete the current consultation from the main queue UI without side effects or ambiguity.

### MVP-019 | SuperAdmin behavior remains inconsistent across modules
- Problem: some APIs allow superadmin bypass, while others still assume an org-scoped user or return empty/incomplete global results.
- Evidence: `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Backend/CodeX.Api/Controllers/QueueController.cs`, `Backend/CodeX.Api/Controllers/ReportsController.cs`, `Frontend/src/features/analytics/components/AnalyticsPage.tsx`, `Frontend/src/services/branchService.ts`
- Impact: top-level admin behavior is unpredictable and partially broken.
- Recommended fix: define explicit superadmin product behavior and implement it consistently across branch listing, reporting, and queue inspection.
- Acceptance criteria: superadmin workflows are documented and behave consistently across all admin modules.

### MVP-020 | Soft-delete and reusable unique fields still conflict
- Problem: branch phone uniqueness is global while branch deletion is soft-delete, so deleted numbers remain blocked forever.
- Evidence: `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Backend/CodeX.Infrastructure/Persistence/Configurations/BranchConfiguration.cs`
- Impact: operations cannot reuse a decommissioned branch's WhatsApp number.
- Recommended fix: make uniqueness soft-delete aware or archive/release reusable fields during deletion.
- Acceptance criteria: deleting a branch does not permanently lock reusable identifiers unless explicitly intended.

### MVP-021 | Receptionists can enumerate staff outside their branch, including admin PII
- Problem: staff list endpoint only restricts branch scope for `BranchAdmin`, not `Receptionist`; the UI also lets receptionists switch branch context.
- Evidence: `Backend/CodeX.Api/Controllers/StaffController.cs`, `Backend/CodeX.Application/Features/Staff/Queries/GetStaffList/GetStaffListQuery.cs`, `Frontend/src/features/staff/components/StaffList.tsx`
- Impact: receptionists can view org-level admins or other branch staff emails and phone numbers.
- Recommended fix: treat receptionists as branch-scoped for staff listing and hide branch/org selector for them.
- Acceptance criteria: receptionists can only read staff entries that belong to their assigned branch.

### MVP-022 | Sessions page can show and edit the wrong branch's schedule
- Problem: the selected branch is used to fetch doctors, but not passed when fetching sessions for a doctor.
- Evidence: `Frontend/src/features/sessions/components/SessionsList.tsx`, `Frontend/src/services/sessionService.ts`, `Backend/CodeX.Application/Features/Sessions/Queries/GetSessionsList/GetSessionsListQuery.cs`
- Impact: a doctor assigned to multiple branches can show mixed sessions, and staff may edit or delete the wrong branch's shift.
- Recommended fix: always pass the selected branch to session queries and enforce branch ownership in backend reads and writes.
- Acceptance criteria: branch-scoped session screens only show sessions from that branch and cannot mutate another branch's schedule.

### MVP-023 | Historical analytics endpoint lacks branch authorization and uses fragile date conversion
- Problem: historical stats API accepts any branch ID for any authenticated user and converts incoming dates with `ToUniversalTime()` on plain dates.
- Evidence: `Backend/CodeX.Api/Controllers/AnalyticsController.cs`, `Backend/CodeX.Application/Features/Analytics/Queries/GetHistoricalStats/GetHistoricalStatsQuery.cs`
- Impact: branch history can leak across org/branch boundaries and date-range math can shift unexpectedly.
- Recommended fix: enforce org/branch access before query execution and convert dates using branch-local timezone rules instead of naive `ToUniversalTime()`.
- Acceptance criteria: unauthorized branch IDs are rejected and the same requested date range produces stable results regardless of server locale.

### MVP-024 | Doctor ratings dashboard is partly broken and not org-scoped
- Problem: frontend calls `/api/ratings/...` while backend exposes `/ratings/...`, and authenticated rating reads do not verify org ownership.
- Evidence: `Frontend/.env.example`, `Frontend/src/services/ratingService.ts`, `Backend/CodeX.Api/Controllers/RatingsController.cs`, `Backend/CodeX.Application/Features/Ratings/Queries/GetDoctorRatings/GetDoctorRatingsQuery.cs`
- Impact: ratings modal can fail outright, and even when reachable it can leak another org's doctor feedback by ID.
- Recommended fix: align controller routing with the API prefix and enforce org/branch ownership in doctor-rating queries.
- Acceptance criteria: ratings screen loads successfully through the configured API base URL and returns only in-scope doctor data.

### MVP-025 | Validation infrastructure is effectively inactive
- Problem: validators are registered, but there is no MediatR validation pipeline behavior and only one lightweight validator exists.
- Evidence: `Backend/CodeX.Application/DependencyInjection.cs`, `Backend/CodeX.Application/Features/Doctors/Commands/CreateDoctor/CreateDoctorCommandValidator.cs`
- Impact: most request models reach handlers without reliable server-side validation.
- Recommended fix: add a MediatR validation behavior and complete validators for auth, branch, doctor, session, queue, and token commands.
- Acceptance criteria: invalid command payloads fail before handler execution and all critical command types have server-side validation coverage.

### MVP-026 | WhatsApp/Twilio admin configuration UI is fragmented and partly unreachable
- Problem: the richer `SettingsPage` is not mounted in app routes, and `BranchesPage` contains a Twilio modal state that is never opened.
- Evidence: `Frontend/src/App.tsx`, `Frontend/src/features/settings/components/SettingsPage.tsx`, `Frontend/src/features/settings/components/BranchesPage.tsx`
- Impact: org admins cannot reliably discover or use the intended configuration UI from the shipped web app.
- Recommended fix: choose one supported configuration screen, mount it in routing, and remove dead/duplicate config flows.
- Acceptance criteria: an org admin can reach exactly one supported WhatsApp/Twilio configuration screen from normal navigation.

### MVP-027 | Analytics page contains fabricated or misleading metrics
- Problem: the superadmin "saas" tab uses hardcoded infrastructure numbers, doctor "avg consult" is derived from wait time, and PDF export failure is silent to the user.
- Evidence: `Frontend/src/features/analytics/components/AnalyticsPage.tsx`
- Impact: the dashboard can mislead operators with numbers that are not tied to real backend data.
- Recommended fix: remove fake panels, label derived metrics honestly, and surface export failures through the notification system.
- Acceptance criteria: every displayed metric has a defined backend source and failed export attempts show a user-visible error.

### MVP-028 | Bridge number-check fails open
- Problem: when bridge verification fails or the client is not ready, `/check-number` returns `exists: true`.
- Evidence: `whatsapp-bridge/src/index.js`
- Impact: upstream flows can assume WhatsApp is available when it is not, hiding real delivery risk.
- Recommended fix: return an explicit "unknown" state and let backend choose fallback or retry behavior.
- Acceptance criteria: availability checks distinguish `exists`, `not exists`, and `verification unavailable`.

### MVP-029 | Webhook and bridge message handling are India-specific by default
- Problem: bridge phone normalization auto-prepends `91` for 10-digit numbers and other flows assume Indian numbering patterns.
- Evidence: `whatsapp-bridge/src/index.js`, `Backend/CodeX.Infrastructure/ExternalServices/TwilioWhatsAppService.cs`
- Impact: non-Indian clinic numbers or multi-country deployments will behave unpredictably.
- Recommended fix: normalize using configured country rules or fully require E.164 inputs at boundaries.
- Acceptance criteria: phone normalization behavior is explicit and works for all supported deployment countries.

## P2

### MVP-030 | Forgot-password flow leaks OTPs to logs
- Problem: OTP values are written to console output during password reset initiation.
- Evidence: `Backend/CodeX.Application/Features/Auth/Commands/ForgotPassword/ForgotPasswordCommand.cs`
- Impact: password-reset secrets become visible to anyone with log access.
- Recommended fix: remove OTP values from logs and log only masked or metadata-only events.
- Acceptance criteria: no reset secret appears in application logs.

### MVP-031 | Password policy is too weak and inconsistently enforced
- Problem: reset flow accepts any new password without strong server-side validation, and org registration depends mainly on frontend checks.
- Evidence: `Backend/CodeX.Application/Features/Auth/Commands/ResetPassword/ResetPasswordCommand.cs`, `Backend/CodeX.Application/Features/Organizations/Commands/RegisterOrganization/RegisterOrganizationCommand.cs`, `Frontend/src/features/auth/components/RegisterPage.tsx`
- Impact: weak credentials can enter production data paths.
- Recommended fix: enforce a backend password policy for registration, reset, and staff updates.
- Acceptance criteria: backend rejects passwords that do not meet the defined policy, independent of frontend behavior.

### MVP-032 | Current-user claim mapping is incomplete
- Problem: JWT stores user ID in `sub`, but current-user service reads `ClaimTypes.NameIdentifier`.
- Evidence: `Backend/CodeX.Infrastructure/Identity/IdentityService.cs`, `Backend/CodeX.Api/Services/CurrentUserService.cs`
- Impact: future audit or ownership features using `UserId` will fail silently.
- Recommended fix: map `sub` to `NameIdentifier` or read `JwtRegisteredClaimNames.Sub` in current-user service.
- Acceptance criteria: `ICurrentUserService.UserId` always resolves for authenticated requests.

### MVP-033 | Offline/manual recovery operations are not fully productized
- Problem: there is no clear supported operator flow for branch/offline recovery, session reset, or queue-day correction when automation goes wrong.
- Evidence: `Backend/CodeX.Api/Controllers/QueueController.cs`, `Backend/CodeX.Application/Features/Queue/Commands/CreateDailyQueue/CreateDailyQueueCommand.cs`, `Frontend/src/features/queue/components/QueueDashboard.tsx`
- Impact: staff will need developer help for routine recovery scenarios.
- Recommended fix: define supported recovery actions and expose them explicitly in UI/API with audit-safe behavior.
- Acceptance criteria: staff can recover the queue from common operational failures without direct DB intervention.

### MVP-034 | Branch timezone exists in the model but is not configurable
- Problem: branch entity carries a `Timezone` field, but branch CRUD/UI does not expose or manage it.
- Evidence: `Backend/CodeX.Domain/Entities/Branch.cs`, `Backend/CodeX.Api/Controllers/BranchesController.cs`, `Frontend/src/features/settings/components/BranchesPage.tsx`
- Impact: even after timezone bugs are fixed, operators still cannot set the correct timezone per branch.
- Recommended fix: add timezone to branch create/update flows and use it everywhere queue-day logic depends on local time.
- Acceptance criteria: each branch has an editable timezone and operational date logic reads from it.

### MVP-035 | Report formulas have correctness drift
- Problem: patient "new vs returning" is computed only within the selected range, slot utilization adds `+1` to capacity denominator, and daily trend ordering parses month/day without year.
- Evidence: `Backend/CodeX.Application/Features/Reports/Queries/GetBranchAnalytics/GetBranchAnalyticsQuery.cs`
- Impact: report numbers can be directionally wrong even when data access succeeds.
- Recommended fix: define metric formulas formally and compute them from canonical data with stable date ordering.
- Acceptance criteria: every report metric matches a written business definition and has deterministic ordering across year boundaries.

### MVP-036 | Frontend contains stale or duplicate settings surfaces
- Problem: there are multiple overlapping settings implementations, including an older `Settings.tsx` path and an unmounted `SettingsPage`.
- Evidence: `Frontend/src/features/settings/Settings.tsx`, `Frontend/src/features/settings/components/SettingsPage.tsx`, `Frontend/src/App.tsx`
- Impact: maintenance cost rises and operators can get different behavior depending on which screen survives.
- Recommended fix: remove dead settings screens and keep only the supported route/component pair.
- Acceptance criteria: one maintained settings implementation exists for each admin workflow.

## P3

### MVP-037 | Profile screen exposes internal IDs directly
- Problem: org and branch GUIDs are rendered directly in the profile page.
- Evidence: `Frontend/src/features/profile/components/ProfilePage.tsx`
- Impact: internal identifiers are exposed without clear operator value.
- Recommended fix: remove raw IDs from default UI or move them to an explicitly technical diagnostics view.
- Acceptance criteria: normal profile screens show only user-meaningful account context.

### MVP-038 | WhatsApp settings dashboard uses some placeholder-like operational copy and stats
- Problem: labels such as "Global Latency 0.04ms" and "E2EE Active" are shown without being tied to measured backend state.
- Evidence: `Frontend/src/features/whatsapp/components/WhatsAppSettings.tsx`
- Impact: operators can misread decorative values as audited operational metrics.
- Recommended fix: replace placeholder telemetry with real provider state or remove it.
- Acceptance criteria: every operational stat in the WhatsApp settings page comes from a real runtime signal.

### MVP-039 | Frontend error handling still falls back to `alert()` in several operator flows
- Problem: some production flows still use blocking browser alerts instead of the app notification system.
- Evidence: `Frontend/src/App.tsx`, `Frontend/src/features/queue/components/QueueDashboard.tsx`, `Frontend/src/features/whatsapp/components/WhatsAppSettings.tsx`
- Impact: inconsistent UX and poor recoverability during busy desk operations.
- Recommended fix: replace browser alerts with toasts or inline error states.
- Acceptance criteria: operator-facing flows use one consistent notification/error pattern.

### MVP-040 | Test coverage is still too thin for the current risk level
- Problem: automated tests cover only a narrow slice of the WhatsApp happy path.
- Evidence: `Backend/CodeX.Tests/Features/WhatsApp/WhatsAppFlowTests.cs`
- Impact: high-risk scheduling, auth, and queue regressions are likely to escape into production.
- Recommended fix: add tests for capacity enforcement, auth boundaries, queue lifecycle, branch isolation, and notification fallback.
- Acceptance criteria: P0/P1 workflows have deterministic automated coverage before rollout.
