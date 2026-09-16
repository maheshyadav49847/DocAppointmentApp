---
name: tenant-onboarding-wizard
description: >-
  Standard procedure, architecture, and enforcement rules for the New Tenant Onboarding Wizard.
  Use when developing, modifying, or testing tenant registration, authentication, onboarding setup,
  initial branch/doctor/session/rate-list configuration, and onboarding route guards.
---

# Tenant Onboarding Wizard Skill

## 1. Goal & Philosophy
When a new organization/tenant registers and logs into the application, they **must not** be dropped directly into an unconfigured dashboard. A healthcare clinic cannot function without its 4 foundational pillars:
1. **Branch** (Where patients visit)
2. **Doctor** (Who conducts consultations)
3. **OPD Session** (Doctor's operational schedule & token capacity)
4. **Rate List / Consultation Fee** (Billing baseline for tokens & invoices)

Until these 4 pillars are configured, the tenant's administrative account must be routed to the **Onboarding Wizard** (`/onboarding`). The core application routes (`/queue`, `/doctor-desk`, `/patients`, `/billing`, `/pharmacy`, etc.) must remain blocked until the wizard is successfully completed.

---

## 2. The 4 Onboarding Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT ONBOARDING WIZARD                 │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   STEP 1     │    STEP 2    │    STEP 3    │     STEP 4     │
│  🏥 Branch   │  👨‍⚕️ Doctor   │  ⏰ Session  │  💵 Rate List  │
│ Clinic Name  │ Doctor Name  │ Branch+Doctor│ Consultation   │
│ Address, City│ Speciality   │ Days & Hours │ Fee & Charges  │
│ Phone Number │ Phone & Email│ Max Capacity │ Standard Items │
└──────────────┴──────────────┴──────────────┴────────────────┘
                               │
                               ▼
            ✅ Onboarding Completed -> Unlock App (/queue)
```

### Pillar 1: Branch Setup (`Branch`)
- **Entity**: `CodeX.Domain.Entities.Branch`
- **Required Fields**:
  - `Name` (e.g., "Main Clinic" or "City Hospital")
  - `Address`, `City`, `State`, `Pincode`
  - `Phone` (Official clinic contact)
- **Auto-link**: Link the current `OrgAdmin` user to this branch as default branch context.

### Pillar 2: Doctor Profile (`Doctor`)
- **Entity**: `CodeX.Domain.Entities.Doctor`
- **OrgAdmin Self-Doctor Detection ("Are you a Doctor?"):**
  - In Step 2, the wizard must ask the OrgAdmin: *"Are you (the clinic owner/admin) also a consulting doctor here?"*
  - **Option A (Yes, I am a Doctor):**
    - Auto-fill doctor details from the logged-in OrgAdmin staff account (`FirstName`, `LastName`, `Email`, `PhoneNumber`).
    - OrgAdmin only provides clinical details: `Specialization`, `RegistrationNumber`, `ConsultationFee`, `ConsultationDurationMinutes`.
    - **Crucial Linkage:** When the `Doctor` record is created, immediately update the OrgAdmin's `Staff` record:
      ```csharp
      staff.DoctorId = doctor.Id;
      ```
    - **Benefit:** The OrgAdmin retains full administrative power (`OrgAdmin` role) AND can directly consult patients, write prescriptions, and appear in OPD queues!
  - **Option B (No, I only manage the clinic / Add another doctor):**
    - Present a fresh form to enter the first consulting doctor's Name, Specialization, Contact, and Fee.
    - Create a standard `Doctor` record linked to the branch.

### Pillar 3: OPD Session / Timings (`Session`)
- **Entity**: `CodeX.Domain.Entities.Session`
- **Required Fields**:
  - `BranchId` (from Step 1)
  - `DoctorId` (from Step 2 - either OrgAdmin's doctor profile or the created doctor)
  - `Name` (e.g., "Morning OPD", "Evening Clinic")
  - `StartTime` & `EndTime` (e.g., 09:00 AM - 01:00 PM)
  - `DaysOfWeek` (e.g., Mon, Tue, Wed, Thu, Fri, Sat)
  - `MaxCapacity` / `TokenLimit` (e.g., 30 tokens)
  - `IsActive = true`

### Pillar 4: Rate List & Consultation Fee (`ServiceItem`)
- **Entity**: `CodeX.Domain.Entities.ServiceItem`
- **Required Fields**:
  - `Name`: "Doctor Consultation" (or "General OPD Consultation")
  - `Price`: e.g., 300, 500 (Configured by tenant, or pre-filled from Doctor's ConsultationFee in Step 2)
  - `Category`: "Consultation"
  - `IsActive = true`

---

## 3. Architecture & API Specifications

### Role Hierarchy & Authority
- In this multi-tenant system, **`OrgAdmin` IS the SuperAdmin** of their organization.
- `OrgAdmin` has full access to configure, manage, and complete tenant onboarding.

### Backend Verification Endpoint
- **Route**: `GET /api/v1/onboarding/status`
- **Authorization**: `[Authorize]`
- **Logic**:
  1. Inspect database for current `OrganizationId`:
     - Count active branches (`_context.Branches.Any(b => b.OrganizationId == orgId && !b.IsDeleted)`)
     - Count active doctors (`_context.Doctors.Any(d => d.OrganizationId == orgId && !d.IsDeleted)`)
     - Count active sessions (`_context.Sessions.Any(s => s.Branch.OrganizationId == orgId && !s.IsDeleted)`)
     - Count active service items (`_context.ServiceItems.Any(si => si.OrganizationId == orgId && !si.IsDeleted)`)
  2. Compute `isOnboarded`:
     ```csharp
     bool isOnboarded = hasBranch && hasDoctor && hasSession && hasRateList;
     ```
  3. Response Model:
     ```json
     {
       "isOnboarded": false,
       "hasBranch": true,
       "hasDoctor": true,
       "hasSession": false,
       "hasRateList": false,
       "currentStep": 3,
       "orgAdminName": "Dr. Ramesh Sharma",
       "orgAdminEmail": "ramesh@example.com"
     }
     ```

### Complete Setup Endpoint
- **Route**: `POST /api/v1/onboarding/setup`
- **Authorization**: `[Authorize]` (OrgAdmin only)
- **Behavior**:
  - Accepts full wizard payload in an atomic database transaction (`using var transaction = await _context.Database.BeginTransactionAsync()`).
  - Creates Branch, Doctor, Session, and RateList item in sequence.
  - If `isOrgAdminDoctor == true`, links `staff.DoctorId = doctor.Id`.
  - Updates `Organization.SettingsJson` or marks onboarding completed.
  - Commits transaction and returns `200 OK`.

---

## 4. Frontend Route Guard & Flow

### Guard Rules
1. **Onboarding Guard**:
   - In `App.tsx` or `DashboardLayout.tsx`, wrap protected routes with `OnboardingRouteGuard`.
   - While `isOnboarded === false`:
     - If current route is NOT `/onboarding`, immediately redirect to `/onboarding`.
     - Sidebar and top navigation links are disabled to prevent navigating into unconfigured screens.
2. **Post-Onboarding**:
   - Once Step 4 is submitted successfully:
     - Show congratulatory celebration modal or toast ("Clinic setup complete! 🎉").
     - Invalidate auth / branch / doctor query caches.
     - Redirect to `/queue` (or `/doctor-desk` if OrgAdmin is also a doctor).

---

## 5. Development Invariants (Rules to ALWAYS Follow)

1. **Existing Tenant Protection**:
   - Never break or lock existing active tenants. If an existing organization already has at least 1 branch, 1 doctor, 1 session, and 1 rate item, `isOnboarded` evaluates to `true` immediately.
2. **OrgAdmin Is SuperAdmin**:
   - There is no separate global superadmin required for tenant setup. `OrgAdmin` has the absolute authority to configure the tenant.
3. **Non-Admin Waiting Screen**:
   - If a `Receptionist` or other staff logs in before `OrgAdmin` completes onboarding, do NOT show the editable wizard. Instead, display a polite waiting screen: *"Your clinic administrator is currently setting up the clinic configuration. Please check back shortly."*
4. **Clean Step Validation**:
   - Each wizard step must validate required inputs before allowing the user to proceed to the next step.
   - Allow "Back" navigation so the user can review or edit previous steps before final submission.
