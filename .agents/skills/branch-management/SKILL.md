---
name: branch-management
description: >-
  Standard architecture, rules, and procedures for Branch Management, Lifecycle (No-Delete, Closure with Dependency Settlement),
  and Multi-Channel Bot Configurations (WhatsApp Tech Provider & Telegram Bot).
  Use when developing, modifying, testing, or auditing clinic branches, WhatsApp/Telegram bot integrations, branch closure validations, and UI components.
---

# Branch Management & Communication Channels Skill

## 1. Goal & Architecture Overview
In **DocAppointmentApp**, a **Branch** represents a physical or operational healthcare facility belonging to an Organization. It serves as the physical node where doctors practice, patient queues run, invoices are issued, and automated communication bots (WhatsApp and Telegram) interface with patients.

This skill defines the strict architectural invariants, data integrity rules, lifecycle restrictions, bot configuration workflows, and UI standards for branch management.

---

## 2. Core Invariants & Business Rules

### Rule 1: Multi-Level Uniqueness
To prevent duplicate records, routing conflicts, and message dispatch corruption, the following uniqueness constraints are strictly enforced:

| Field | Uniqueness Scope | Rationale |
| :--- | :--- | :--- |
| **Branch Name** | Unique within **Organization** | An organization cannot have two branches with identical names (e.g. "Main Clinic"). |
| **Physical Address** | Unique within **Organization** | Prevents accidental duplicate branch registrations for the exact same physical premise. |
| **Phone / WhatsApp Number** | Globally Unique across **ENTIRE APPLICATION** | Automated bots route inbound patient messages and webhook callbacks by phone number. A single WhatsApp number can only belong to one branch across all tenants. |
| **Telegram Bot Token** | Globally Unique across **ENTIRE APPLICATION** | Telegram webhooks and bot tokens bind 1:1 with an application branch webhook endpoint. One bot token cannot be claimed by multiple branches. |

#### Case & Space Insensitive Normalization Mandate
Comparison for `Name` and `Address` uniqueness must **NEVER** be sensitive to casing or whitespace variations:
- **Case-Insensitive**: e.g., `"Apollo Clinic"` == `"apollo clinic"` == `"APOLLO CLINIC"`.
- **Space-Insensitive (Collapsed Whitespace)**: Leading, trailing, and multiple consecutive inner spaces must be collapsed into a single space (or stripped) before comparison:
  - e.g., `"  Apollo    Clinic  "` matches `"Apollo Clinic"` -> Duplicate blocked!
  - e.g., `"123  Main Road,   Suite 4"` matches `"123 Main Road, Suite 4"` -> Duplicate blocked!
- **Normalization Standard**:
  ```csharp
  // Normalize string for duplicate comparison
  public static string NormalizeString(string? value)
  {
      if (string.IsNullOrWhiteSpace(value)) return string.Empty;
      // Strip leading/trailing spaces, collapse multiple spaces into one, lowercase
      return Regex.Replace(value.Trim(), @"\s+", " ").ToLowerInvariant();
  }
  ```
- **Validation Execution**:
  When creating or updating a branch, fetch active branches within the organization and check:
  - `NormalizeString(existing.Name) == NormalizeString(incoming.Name)`
  - `NormalizeString(existing.Address) == NormalizeString(incoming.Address)`
  If a match is found, reject with a user-friendly generic validation error displayed in `ApiErrorAlert`.

---

### Rule 2: Generic Status Lifecycle & Strict No-Delete Invariant
Instead of conflicting boolean flags (`IsActive`, `IsClosed`), Branch lifecycle is governed by a single, unambiguous **`Status`** state machine:

```
             ┌─────────────────────────┐
             │       1. ACTIVE         │ ◄─── Normal Operations (Booking, Queues, Bot)
             └───────────┬─────────────┘
                         │
             (Temporary Pause / Maintenance)
                         │
                         ▼
             ┌─────────────────────────┐
             │       2. INACTIVE       │ ◄─── Temporarily Paused (Renovation, Holiday)
             └───────────┬─────────────┘      (Can be re-activated anytime by Admin)
                         │
             (Pre-Closure Dependency Settlement)
             (Mandatory Closure Remark Required)
                         │
                         ▼
             ┌─────────────────────────┐
             │       3. CLOSED         │ ◄─── Permanently Shut Down (Archive Only)
             └─────────────────────────┘      (Zero active dependencies, strictly no delete)
```

| Status | Definition & Operational Scope | Transitions Allowed | Semantic UI Badge |
| :--- | :--- | :--- | :--- |
| **`Active`** | **Fully Operational**: Doctor OPD schedules active, queues processing, patients can book online via bots. | Can transition to `Inactive` or `Closed`. | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| **`Inactive`** | **Temporarily Paused / Offline**: Used during clinic renovations, holidays, or temporary downtime. Online bookings and new queue tokens are halted. | Can be re-activated back to `Active` at any time by Admin. | `bg-amber-50 text-amber-700 border-amber-200` |
| **`Closed`** | **Permanently Shut Down**: Facility ceased operations. All dependencies (Doctors, Sessions, Staff, Tokens) have been settled. Read-only historical archive. | **Final Terminal State** (cannot be re-opened). | `bg-rose-50 text-rose-700 border-rose-200` |

- **Deletion is Strictly Prohibited**: Once created, a branch record can **NEVER be deleted** (`DELETE /api/v1/branches/{id}` is permanently blocked). Historical patient visits, prescriptions, bills, and queue audit trails must remain intact.
- **Closure Mandates**:
  - Closing a branch transitions its status: `Status = "Closed"` (with `ClosedAt = DateTime.UtcNow` and `ClosedBy = currentUserId`).
  - Requires a **Mandatory Closure Remark** (`ClosureRemark`) explaining why the facility is being closed.
  - Closed branches are locked: cannot accept tokens, launch sessions, or dispatch bot messages.

---

### Rule 3: Pre-Closure Dependency Settlement & Audit Summary
A branch **cannot be closed immediately** if active entities and operational dependencies are still linked to it. 

Before allowing closure, the backend must perform a **Dependency Check** and return a complete summary:
```json
{
  "canClose": false,
  "activeDoctorsCount": 3,
  "activeSessionsCount": 5,
  "activeStaffCount": 4,
  "branchAdminsCount": 1,
  "activeQueueTokensCount": 12,
  "unsettledInvoicesCount": 2,
  "dependencies": [
    "3 doctors are currently assigned to this branch.",
    "5 recurring OPD sessions are currently active.",
    "4 staff members (including 1 Branch Admin) are assigned.",
    "12 active queue tokens are pending for today's visits.",
    "2 invoices have unsettled dues."
  ]
}
```
**Settlement Mandate**:
1. **Queue & Visits**: Conclude or cancel today's active tokens.
2. **OPD Sessions**: Deactivate or migrate recurring shift schedules to other branches.
3. **Doctors & Staff**: Reassign or unlink doctors and staff members (including Branch Admins) from the branch.
4. **Financial Dues**: Clear or reconcile outstanding bills.
Only when all active dependencies reach zero (`canClose === true`) can the OrgAdmin submit the closure remark and mark the branch as Closed.

---

### Rule 4: All Fields Mandatory Invariant
Every branch registration and edit form enforces 100% field completeness. No optional fields exist on the primary branch profile:
1. **Branch Name** (`Name`) - e.g. "South Extension Clinic"
2. **Branch Logo** (`LogoBase64`) - Official facility badge/image
3. **Physical Address** (`Address`) - Full street, landmark, city, state
4. **WhatsApp Dial Code & Number** (`WhatsAppDialCode`, `WhatsAppNumber`) - Complete phone number with country code
5. **Timezone** (`Timezone`) - Standard IANA timezone (e.g. `Asia/Kolkata`) for accurate queue resets and reminder cron triggers

---

### Rule 5: UI Validation & Error Handling Invariant
1. **Control-Level Red Errors**:
   - Every input field must display its validation error message directly **below the corresponding control** in red text (`text-rose-600 text-xs font-semibold flex items-center gap-1 mt-1`).
   - Inputs with active errors must show a red border (`border-rose-300 focus:border-rose-500 focus:ring-rose-200`).
2. **Generic / System-Level Validation Summary**:
   - Any cross-entity or system-level error (such as duplicate WhatsApp number, duplicate Telegram token, duplicate branch name, or pre-closure dependency warnings) must be displayed prominently at the **top of the modal/drawer in a dedicated Validation Summary Alert** (`border border-rose-200 bg-rose-50 text-rose-800 rounded-lg p-3.5`).

---

### Rule 6: Channel Status Visibility (Card & Table Row Badges)
Every branch representation in the UI (Grid Card and Data Table Row) must display prominent status badges for communication channels:
- **WhatsApp Channel Status**:
  - `Configured`: Soft emerald badge (`bg-emerald-50 text-emerald-700 border border-emerald-200/80`) with `<MessageSquare />` / `<Smartphone />` icon.
  - `Not Configured`: Soft amber/slate badge (`bg-amber-50 text-amber-700 border border-amber-200/80`) with warning indicator.
- **Telegram Channel Status**:
  - `Configured`: Soft sky badge (`bg-sky-50 text-sky-700 border border-sky-200/80`) with `<Send />` icon.
  - `Not Configured`: Soft slate badge (`bg-slate-100 text-slate-600 border border-slate-200`) with alert indicator.

---

## 3. Communication Bots: WhatsApp Tech Provider & Telegram Integration

### WhatsApp Architecture (Tech Provider Model)
The DocAppointmentApp platform operates as an official **Meta Business Tech Provider / Solution Partner**. 
- Clinics do not need to build custom webhooks or deploy separate servers.
- The branch connects their official WhatsApp Business phone number directly to the platform via **Meta Embedded Signup** or manual WABA ID / Phone ID input.
- Inbound patient queries (e.g. `Hi`, `Book Appointment`, `Token Status`) and outbound automated notifications (Prescription PDFs, Token reminders, Invoices) are dispatched strictly from the branch's registered number.
- **Uniqueness**: The WhatsApp Number is globally unique across the whole system.

### Telegram Architecture (BotFather Integration)
Each branch can register its own dedicated Telegram Bot:
- The clinic creates a bot via Telegram's official `@BotFather`.
- The clinic pastes the **Bot HTTP API Token** into the branch settings.
- The platform tests the bot token (`/getMe`) and binds the webhook (`/setWebhook`) directly to `/api/v1/telegram/webhook/{branchId}`.
- All patient Telegram bookings and prescriptions route through that specific bot `@username`.
- **Uniqueness**: A Telegram Bot Token can only be claimed once across the entire application.

---

## 4. Complete Step-by-Step Configuration & Testing Guide

### Guide A: WhatsApp Bot Configuration (Meta Tech Provider)
Follow these steps to connect a branch's WhatsApp Business number:

```
┌────────────────────────────────────────────────────────────────────────┐
│               WHATSAPP META EMBEDDED SIGNUP STEP-BY-STEP               │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Navigate to Branches -> Click "WhatsApp Config" (Green icon)        │
│ 2. Click "Connect with Facebook / WhatsApp" button                     │
│ 3. Log in with your Facebook account managing the Clinic Business      │
│ 4. Select or create your Meta Business Account (WABA)                  │
│ 5. Choose / Enter the Clinic Phone Number                              │
│ 6. Verify phone number via 6-digit SMS or Voice OTP                    │
│ 7. Grant DocAppointmentApp platform messaging permissions              │
│ 8. Meta automatically returns WABA ID & Phone Number ID to the branch  │
│ 9. Status updates to "Configured" (Emerald Badge)                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Manual Credential Fallback
If Embedded Signup is not used, provide:
1. **WABA ID (WhatsApp Business Account ID)**: Found in Meta Business Suite > WhatsApp Accounts.
2. **Phone Number ID**: Found in Meta Developer Portal > WhatsApp > API Setup.
3. **System User Access Token**: Permanent Token generated with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.

#### Testing WhatsApp Dispatch
1. Open the branch's WhatsApp chat from a personal mobile phone.
2. Send `Hi` or `Menu`.
3. The platform bot will respond with the clinic's branded greeting and interactive booking options.
4. Generate a test token in the desk queue to confirm WhatsApp instant token confirmation is received.

---

### Guide B: Telegram Bot Configuration (BotFather)
Follow these steps to create, configure, and test a Telegram bot for a branch:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TELEGRAM BOTFATHER STEP-BY-STEP                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Open Telegram and search for @BotFather (verified blue tick)        │
│ 2. Send `/newbot` to BotFather                                         │
│ 3. Enter a display name: e.g. "Apollo Clinic New Delhi"                │
│ 4. Enter a bot username ending in `bot`: e.g. "apollo_delhi_doc_bot"   │
│ 5. BotFather will provide the HTTP API Token:                          │
│    e.g. `7123456789:AAHq_x...`                                         │
│ 6. Configure Bot Menu Commands (Optional but recommended):             │
│    Send `/setcommands` to BotFather -> select bot -> enter:            │
│    start - Open clinic booking portal                                  │
│    status - Check your live queue token status                         │
│ 7. Copy the token into Branch Settings -> Telegram Configuration       │
│ 8. Click "Test Connection" button                                      │
│    - Validates token against https://api.telegram.org/bot<TOKEN>/getMe │
│    - Displays bot username and status                                  │
│ 9. Click "Save & Activate Webhook"                                     │
│ 10. Status updates to "Configured" (Sky Badge)                         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Testing Telegram Bot
1. Search for your bot's `@username` on Telegram and press **Start**.
2. Tap the **Book Appointment** button to launch the Telegram Mini WebApp.
3. Book a token and verify that the booking confirmation and QR code appear directly in the chat.

---

## 5. Branch Closure Workflow (Dependency Settlement)

```
                       User clicks "Close Branch"
                                   │
                                   ▼
                 Backend Dependency Audit Check
              (GET /api/v1/branches/{id}/dependencies)
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
Dependencies Exist (>0)                             Zero Dependencies (=0)
- Active Doctors                                   - No active doctors
- Active OPD Sessions                              - No active sessions
- Assigned Staff / BranchAdmin                     - No assigned staff
- Pending Queue Tokens                             - No pending tokens
         │                                                   │
         ▼                                                   ▼
❌ CLOSURE BLOCKED                                  ✅ CLOSURE PERMITTED
Show Detailed Settlement Modal                     Prompt for Mandatory Closure Remark
List exact entities requiring action               User enters reason: e.g. "Relocated"
Reassign / Deactivate dependencies                 Submit POST /api/v1/branches/{id}/close
                                                             │
                                                             ▼
                                                    Branch Marked Closed
                                                    Status = "Closed" (ClosedAt = UtcNow)
```

---

## 6. UI Standards & Component Layout

### Form & Drawer Specifications
- **Container**: Slide-over drawer with backdrop blur (`bg-slate-900/40 backdrop-blur-sm`).
- **Header**: Two-tone title (`Add/Edit Branch`), icon box (`w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600`), and close button.
- **Inputs**: `.saas-input` (6px roundness / `rounded-md`), clear labels with red asterisks (`*`) for all mandatory fields.
- **Status Selector (Edit Mode)**:
  - For active branches, Admin can toggle between `Active` (Operational) and `Inactive` (Paused / Renovation).
  - Transitioning to `Closed` triggers the Pre-Closure Dependency Settlement Audit modal and requires mandatory `ClosureRemark`.
- **Red Validation Errors**: Placed directly under the control:
  ```tsx
  <FieldError errors={validationErrors} field="WhatsAppNumber" />
  // Renders: <p className="text-rose-600 text-xs font-semibold flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> WhatsApp Number is required.</p>
  ```
- **Generic Summary Alert**: Placed at the top of the form:
  ```tsx
  <ApiErrorAlert error={apiError} />
  // Displays cross-branch duplication warnings, dependency blocks, and system errors.
  ```
- **Action Buttons**:
  - Cancel: `.btn-cancel` with `<X />` icon (soft light rose background).
  - Submit: `.btn-primary` with `<Save />` icon (indigo background, 6px roundness).

### Aesthetic Dashboard & Card Architecture (Strict SaaS Standards)
To deliver a high-end enterprise SaaS aesthetic, `BranchesPage` adheres to the following visual architecture:
1. **Stat KPI Metric Strip (Top Grid)**:
   - 4 responsive cards: `Total Facilities`, `Active & Online`, `WhatsApp Bots`, and `Telegram Bots`.
   - Each card uses subtle border (`border border-slate-200/80`), 8px radius (`rounded-lg`), two-tone typography (uppercase tracking-wider label + bold KPI value), and colored icon container (`w-11 h-11 rounded-lg`).
2. **Toolbar with Unified Filters**:
   - Status filter dropdown (`All`, `Active`, `Inactive`, `Closed`) with live item counts.
   - Global search input for facility name, address, and registered phone number.
   - Rows-per-page selector and Grid/Table layout toggle.
3. **Branch Grid Card Anatomy (Executive SaaS Architecture)**:
   - **Container**: `bg-white rounded-lg border border-slate-200/90 transition-all duration-300 flex flex-col relative overflow-hidden` (when active: `shadow-none` with clean border, no heavy ring or box-shadow; when inactive/hover: `shadow-2xs hover:shadow-lg hover:border-indigo-200/90 hover:-translate-y-0.5`).
   - **Top Accent Line**: `h-1 w-full` with gradient (`bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400` when active context; subtle slate line turning indigo gradient on hover).
   - **Active Context Pill**: Elegant luxury pill badge (`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-2xs`) with pulsating glowing dot.
   - **Header**: Official branch logo image (`w-14 h-14 rounded-lg object-contain bg-white border border-slate-200/90 shadow-xs p-1`) or vibrant gradient icon tile (`from-indigo-600 to-indigo-700 text-white`).
   - **Badges**: Status badge (`Active` emerald with pulsing dot, `Inactive` amber, `Closed` rose) alongside timezone pill (`<Globe />`).
   - **Physical Address Strip**: Clean compact info row with rose map pin icon badge (`bg-rose-50 text-rose-500 border border-rose-100/60`).
   - **Channels Tiles**: Interactive, clickable cards for WhatsApp and Telegram featuring brand color containers (`bg-emerald-500`, `bg-sky-500`), status pills (`Active` vs `Setup →`), and formatted phone/bot handles without duplicate dial codes.
   - **Footer Actions**: Switch context button (`.btn-primary` with `<ArrowRightLeft />`) or Active Workplace badge, paired with clean 32px elevated white action tiles (`Edit`, `WhatsApp`, `Telegram`, `Close Facility`) with themed micro-hover states. Button heights strictly match design system (`h-10` in modals, 32px/40px proportional in cards).

### Status Badges in Tables & Cards
```tsx
{/* 1. Branch Operational Status Badge */}
<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold border ${
  branch.status === 'Active' 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
    : branch.status === 'Inactive'
    ? 'bg-amber-50 text-amber-700 border-amber-200/80'
    : 'bg-rose-50 text-rose-700 border-rose-200/80'
}`}>
  <span className={`w-1.5 h-1.5 rounded-full ${
    branch.status === 'Active' ? 'bg-emerald-500' : branch.status === 'Inactive' ? 'bg-amber-500' : 'bg-rose-500'
  }`} />
  {branch.status}
</span>

{/* 2. WhatsApp Channel Badge */}
<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold border ${
  branch.isWhatsAppConfigured 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
    : 'bg-amber-50 text-amber-700 border-amber-200/80'
}`}>
  <MessageSquare className="w-3.5 h-3.5" />
  {branch.isWhatsAppConfigured ? 'WhatsApp Active' : 'WhatsApp Unconfigured'}
</span>

{/* 3. Telegram Channel Badge */}
<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold border ${
  branch.isTelegramConfigured 
    ? 'bg-sky-50 text-sky-700 border-sky-200/80' 
    : 'bg-slate-100 text-slate-600 border-slate-200'
}`}>
  <Send className="w-3.5 h-3.5" />
  {branch.isTelegramConfigured ? 'Telegram Active' : 'Telegram Unconfigured'}
</span>
```

---

## 7. Developer & Agent Implementation Checklist
Whenever modifying Branch entity, backend controllers, or frontend branches view:
- [ ] Ensure `Branch.Name` is validated for uniqueness within the organization (**strictly case-insensitive & space-insensitive / normalized**).
- [ ] Ensure `Branch.Address` is validated for uniqueness within the organization (**strictly case-insensitive & space-insensitive / normalized**).
- [ ] Ensure `Branch.WhatsAppNumber` is validated for uniqueness **across the entire application**.
- [ ] Ensure `Branch.TelegramBotToken` is validated for uniqueness **across the entire application**.
- [ ] Ensure Branch lifecycle strictly enforces `Status` (`"Active"`, `"Inactive"`, `"Closed"`) instead of ambiguous boolean flags.
- [ ] Verify that `DELETE /api/v1/branches/{id}` is blocked or replaced with `/api/v1/branches/{id}/close`.
- [ ] Ensure closure requires pre-closure dependency verification (Doctors, Sessions, Staff, BranchAdmin, Tokens).
- [ ] Ensure closure requires a non-empty `ClosureRemark` and sets `Status = "Closed"`, `ClosedAt = UtcNow`.
- [ ] Ensure all form inputs have red field-level validation messages underneath.
- [ ] Ensure top-level generic errors display in `ApiErrorAlert`.
- [ ] Verify both Grid View cards and Table rows show configured/unconfigured badges for WhatsApp and Telegram, as well as the Branch Operational Status badge (`Active` / `Inactive` / `Closed`).
- [ ] Follow high-aesthetic card layout: Top Stat KPI strip, Status filter dropdown, interactive channel configuration pills, clean corner ribbon for Active Context.
- [ ] Channel Configuration Setup Guides: When opening the guide from within WhatsApp modal, open strictly in dedicated WhatsApp view; when opened from Telegram modal, open strictly in dedicated Telegram view; when opened from page header, provide channel tabs.
- [ ] Adhere strictly to 8px cards/modals, 6px controls/buttons, 4px badges invariant.
