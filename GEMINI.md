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

### 4. Branch Management & Communication Channels Invariant
- **Multi-Level Uniqueness**:
  - `Name` & `Address`: Unique within the organization (**strictly case-insensitive & space-insensitive / normalized whitespace**).
  - `WhatsAppNumber` & `TelegramBotToken`: Globally unique across the **entire application**.
- **Generic Status Lifecycle & Strict No-Delete**:
  - Branches can NEVER be deleted.
  - Branch lifecycle is governed by a unified **`Status`** (`Active`, `Inactive`, `Closed`):
    - `Active`: Operational, open for OPD sessions, bookings, and queues.
    - `Inactive`: Temporarily paused / offline (for renovations, maintenance), can be re-activated by Admin anytime.
    - `Closed`: Permanently shut down with a mandatory `ClosureRemark` after all linked operational dependencies (Doctors, Sessions, Staff, BranchAdmin, Tokens) are fully settled.
- **Pre-Closure Settlement Verification**: Closure is blocked if any active doctors, OPD sessions, staff members, or pending tokens exist for that branch.
- **Communication Channels (WhatsApp & Telegram)**:
  - Meta Tech Provider model for WhatsApp (Embedded Signup or WABA ID).
  - Dedicated Telegram Bot (BotFather token + webhook binding + connection testing).
  - All automated patient messaging routes through the branch's specific configured channels.
- **UI & Error Handling**:
  - All form fields are strictly mandatory.
  - Red field-level validation errors must appear directly underneath the corresponding controls.
  - Cross-entity / generic validation errors (like phone/token duplication or closure dependency warnings) appear at the top in `ApiErrorAlert`.
  - Both Grid cards and Table rows must clearly display the Branch Operational Status badge (`Active`, `Inactive`, `Closed`) as well as configured/unconfigured badges for WhatsApp and Telegram.
- **Reference**: Detailed procedures and configuration guides are documented in `.agents/skills/branch-management/SKILL.md`.

### 5. Universal Device Compatibility & Responsive Layout Invariant (MANDATORY)
- **All Devices Compatibility (Mobile, Tablet, Laptop, Ultra-Wide)**:
  - Every page, component, card view, data table, modal, drawer, and toolbar must be fully responsive from the smallest mobile viewport (320px) to ultra-wide desktop monitors (1920px+).
  - Test and tune responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`) so layouts reflow smoothly on every screen size.
- **Zero Information Loss, Truncation, or Overlapping**:
  - **No Aggressive Truncation**: Never use `truncate` where essential titles, names, numbers, or badges get chopped into ellipses (e.g. `"W..."`, `"T..."`, `"City Car..."`). Use `break-words`, `line-clamp-2`, or natural wrapping.
  - **No Overlapping or Cut-off**: Text, badges, icon buttons, and containers must NEVER collide, overlap, or be sliced in half.
  - **Stacked Layouts in Cards**: Inside card views or narrow columns, avoid forced multi-column grids that crush pills/buttons into narrow slices. Use clean full-width stacked rows (`flex flex-col gap-2`) with generous breathing room.
- **Strict Single-Scrollbar & No Trapped Scrolling**:
  - **Never create 2 vertical scrollbars** on screen simultaneously. Sidebars must hide their scrollbars (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`).
  - Never trap content inside nested fixed-height boxes (`h-full min-h-0 overflow-auto`) that force inner scrollbars on cards. Let the page expand naturally so the main layout handles scrolling cleanly.
  - Use sleek, modern scrollbars (6px rounded thumb) across the entire application.
- **Neat, Clean & Compact Ergonomics**:
  - Keep page headers, stats strips, toolbars, and card spacing ergonomically compact (`p-3`, `gap-3`, `text-sm`) so primary information and actions are immediately visible without unnecessary scrolling on laptop screens (768px-900px height).
  - All action button groups must use `flex-wrap gap-2` with `shrink-0` to guarantee zero button overflow on small viewports.
- **Reference**: Detailed code snippets and responsive patterns are documented in `.agents/skills/ui-component-design-system/SKILL.md`.

### 6. Strict Uniform Height for Form Controls & Buttons (Zero Height Mismatch Invariant)
- **Identical Height on Same Row & Component**: Whenever form controls (inputs, textboxes, selects, dropdowns, date pickers) and buttons appear in the same row, toolbar, filter bar, card, modal, or page, they **MUST share the exact same height**. No control may ever be taller or shorter than adjacent sibling controls.
- **Text Box & Button Pairing (Crucial)**: In any search row or input-with-action layout (e.g. search input next to `+ Add` button), the button **MUST NOT be taller or shorter than the text box**. Both elements must use the exact same fixed height token.
- **Multiple Buttons Height Equality**: Whenever multiple buttons are displayed side-by-side or within the same component (e.g. Cancel + Save in a modal footer, or View Mode toggles + filters + Add button in a toolbar), all buttons **MUST have identical height**.
- **Standard Height Tokens**:
  - **Toolbar & Filter Row Standard**: Fixed **`h-9`** (36px) across ALL controls: search input (`saas-input h-9`), select dropdowns (`h-9`), view mode toggles (`h-9`), and action buttons (`btn-primary h-9` / `btn-secondary h-9`).
  - **Form Fields & Modal Actions Standard**: Fixed **`h-10`** (40px) across inputs (`saas-input h-10`), selects (`h-10`), and modal footer buttons (`btn-cancel h-10`, `btn-primary h-10`, `btn-secondary h-10`).
  - **Table & Card Action Buttons Standard**: Fixed **`h-8 w-8`** (32px) or **`h-7 w-7`** (28px) uniformly across all icon action buttons in that row.
- **Strict Prohibition**: NEVER mix arbitrary vertical paddings (`py-1.5`, `py-2`, `py-2.5`) across sibling controls without an explicit uniform height utility (`h-9` or `h-10`).
- **Reference**: Detailed code snippets and implementation guides are documented in `.agents/skills/ui-component-design-system/SKILL.md`.

### 7. Standardized Data Table Pagination Invariant (Consistent Look & Feel Across All Pages)
- **Zero Pagination Inconsistency**: Every single table and data listing page in the application MUST use the centralized `<DataTablePagination />` component (`@/components/ui/DataTablePagination`). Never write inline ad-hoc pagination footers or raw SVG chevron icons.
- **Unified Visual Anatomy**:
  - **Container**: `p-2.5 sm:p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500`.
  - **Left Summary**: `Showing <span className="font-bold text-slate-900">{start}</span> to <span className="font-bold text-slate-900">{end}</span> of <span className="font-bold text-slate-900">{total}</span> entries`.
  - **Navigation Buttons**: Uniform `h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 text-slate-600 disabled:opacity-40` with Lucide `ChevronLeft` and `ChevronRight`.
  - **Page Pill**: Centralized `px-2.5 py-1 rounded-md bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs` displaying `Page <span className="text-indigo-600 font-extrabold">{pageIndex + 1}</span> of {pageCount}`.
- **Reference**: Detailed code snippets and implementation guides are documented in `.agents/skills/ui-component-design-system/SKILL.md`.

### 8. Page Layout Spacing & Uniform Sidebar Gap Invariant (Zero Nested Page Padding)
- **Master Layout Padding Standard**: The master application layout (`DashboardLayout.tsx`) already provides uniform responsive padding for page content: `<main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 overflow-y-auto">`.
- **Zero Nested / Double Padding**: Every page component (`*Page.tsx`) must NEVER apply its own outer horizontal padding (e.g. `p-6` or `p-8`) to its root container. Adding nested padding causes an unsightly, excessive gap between the left sidebar and page content.
- **Root Container Standard**: Every page component root element MUST strictly use:
  `className="animate-in fade-in duration-500 space-y-3.5 pb-6"`
  (or `space-y-4 pb-6`). This ensures identical, pixel-perfect alignment, compact ergonomics, and a uniform gap from the sidebar across ALL application pages (Branches, Doctors, Patients, Staff, Billing, Rate List, etc.).
- **Reference**: Detailed code snippets and tokens are documented in `.agents/skills/ui-component-design-system/SKILL.md`.
