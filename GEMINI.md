# DocAppointmentApp Project Instructions & Guidelines

## Core Invariants & Architecture Rules

### 1. Tenant Onboarding Wizard Rule
- **Mandatory Setup for New Tenants**: Whenever a new organization/tenant registers and logs in, they must be guided through the **Onboarding Wizard** (`/onboarding`) if any of the 4 foundational pillars are missing:
  1. **Branch** (At least 1 active clinic branch)
  2. **Doctor** (At least 1 doctor profile - with option to link OrgAdmin as the doctor: `staff.DoctorId = doctor.Id`)
  3. **OPD Session** (Doctor schedule & token capacity linked to the branch)
  4. **Rate List / Service Item** (At least 1 consultation fee / service item)
- **Role Hierarchy**: `OrgAdmin` IS the highest authority (`OrgAdmin = SuperAdmin` of the organization).
- **Access Guard**: While onboarding is incomplete, normal application routes (`/queue`, `/doctor-desk`, `/patients`, `/pharmacy`, `/billing`) are blocked.
- **Reference**: Detailed procedures and API specs are documented in `.agents/skills/tenant-onboarding-wizard/SKILL.md`.

### 2. Multi-Tenancy & Data Isolation
- Entities implementing `IMustHaveTenant` automatically enforce `OrganizationId == currentOrgId` in EF Core global query filters.
- Global shared entities (like `MedicineMaster`) do not implement `IMustHaveTenant`, allowing catalog sharing across all organizations.
- Doctor data isolation ensures doctors can only view their own assigned sessions and queues unless they possess higher administrative roles.

### 3. UI Design System & Component Consistency Rule
- **Mandatory Component Alignment**: Whenever developing or modifying any frontend page, modal, or component, its design must strictly match the existing application UI tokens:
  1. **Page Header**: Two-tone title (`text-slate-900` + `text-indigo-600`), icon badge container, and standard action buttons (`.btn-primary`, `.btn-secondary`).
  2. **Cards**: Use `.saas-card` (`bg-white border border-slate-200 shadow-... rounded-lg`).
  3. **Data Tables**: Table inside `.saas-card`, `thead bg-slate-50 border-b border-slate-200`, row hover `hover:bg-slate-50/80`, semantic status badges (emerald/amber/rose/indigo), and pagination footer.
  4. **Form Inputs**: Use `.saas-input` with standard focus ring (`focus:border-indigo-500 rounded-md`).
  5. **Modals**: Backdrop blur (`bg-slate-900/50 backdrop-blur-sm`), `rounded-lg` (8px) container, header with close button, and footer with Cancel/Save buttons.
- **UI Roundness & Border Radius Invariant**:
  - **Cards & Modals**: Fixed at **8px** (`rounded-lg` / `border-radius: 8px`).
  - **Buttons & Controls**: Fixed at **6px** (`rounded-md` / `.btn-primary` / `.btn-secondary` / `.btn-cancel` / `.btn-danger` / `.saas-input` / `select` / `textarea`).
  - **Cancel Buttons**: Standardized with `.btn-cancel` (soft light rose pastel background, readable rose text, subtle border, `<X />` icon). Never use harsh/solid bright red (`.btn-danger`) for Cancel/Dismiss.
  - **Badges & Tags**: Compact **4px** (`rounded-sm`).
  - **Prohibition**: NEVER use oversized bubbly/pill curves (`rounded-2xl`, `rounded-3xl`, or `rounded-full` on cards/modals/buttons).
- **Reference**: Detailed code snippets and tokens are documented in `.agents/skills/ui-component-design-system/SKILL.md`.

