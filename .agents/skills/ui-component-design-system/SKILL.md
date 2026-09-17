---
name: ui-component-design-system
description: >-
  Comprehensive UI design system, styling guidelines, component standards, and layout consistency rules
  for DocAppointmentApp. Use whenever creating new pages, designing UI components, updating existing screens,
  or writing modals, tables, headers, cards, and forms.
---

# UI Design System & Frontend Consistency Guide

All pages and components in **DocAppointmentApp** (`FrontendV2`) must maintain strict visual and structural consistency. When building or refactoring any page, follow the patterns and component tokens defined in this guide.

---

## 0. UI Roundness & Border Radius Standards (CRITICAL INVARIANT)

To ensure a sleek, clean, modern enterprise SaaS aesthetic (similar to Linear, modern Stripe, and Vercel), **border radius must adhere to precise subtle tokens**:

| UI Component Type | Target Radius | Utility / Class | CSS Invariant |
| :--- | :--- | :--- | :--- |
| **Cards & Containers** | **8px** | `.saas-card`, `rounded-lg` | `border-radius: 8px` |
| **Modals & Dialog Windows** | **8px** | `rounded-lg`, dialog shell | `border-radius: 8px` |
| **Action Buttons** | **6px** | `.btn-primary`, `.btn-secondary`, `.btn-cancel`, `.btn-danger`, `rounded-md` | `border-radius: 6px` |
| **Form Inputs & Dropdowns** | **6px** | `.saas-input`, `input`, `select`, `textarea`, `rounded-md` | `border-radius: 6px` |
| **Segmented Controls & Tabs** | **6px** / **4px** | Container: `rounded-md`, Tab Item: `rounded-sm` | `border-radius: 6px / 4px` |
| **Status Badges & Tags** | **4px** | `rounded-sm` (or compact `rounded`) | `border-radius: 4px` |
| **Micro-indicators & Dots** | **3px** / circular | `rounded-xs` or `rounded-full` (for status dot only) | `border-radius: 3px / 50%` |

### ⛔ Strict Prohibitions:
- **NO Bubbly / Oversized Curves**: NEVER use `rounded-2xl` (16px), `rounded-3xl` (24px), or `rounded-4xl` anywhere on cards, containers, drawers, modals, inputs, or buttons.
- **NO Pill Buttons or Cards**: NEVER use `rounded-full` on buttons, cards, containers, or modals (only allowed on pure circular avatar images or tiny 6px pulse status dots).
- **NO Pure Sharp Boxiness**: Do not use `rounded-none` (0px) on standard cards or interactive buttons unless intentionally designing a flat divider or square tile grid.

---

## 0.1 Universal Device Compatibility & Zero-Truncation Standards (MANDATORY INVARIANT)

Whenever designing, refactoring, or modifying any frontend component, page, modal, or layout, **it must be 100% device-compatible from small mobile screens (320px) to ultra-wide displays (1920px+)**.

### 1. Zero Information Loss & Zero Truncation Rule
- **No Ellipsis on Essential Data**: Never use `truncate` on vital labels, names, phone numbers, addresses, or status badges (e.g. preventing `"W..."`, `"T..."`, `"+91 87796597..."`, `"City Car..."`).
- **Use Wrap & Clamp**: Always use `break-words`, `leading-snug`, and `line-clamp-2` or natural flex wrapping for long text strings so that content is completely readable across all screen sizes.
- **Stacked Layouts over Cramped Columns**: Inside grid cards or narrow parent containers, NEVER split the card into multiple narrow columns (`grid-cols-2`) if each column gets `< 200px`. Use **clean full-width stacked rows** (`flex flex-col gap-2`) so icons, text, and action badges have generous breathing room.

### 2. Single-Scrollbar & No Trapped Scrolling Invariant
- **Strictly No 2 Scrollbars**: There must NEVER be two vertical scrollbars visible on screen at once.
  - Sidebars and hidden panels must suppress browser scrollbars: `[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`.
  - Main app content uses the sleek 6px custom scrollbar (`::-webkit-scrollbar { width: 6px; }`).
- **No Trapped Viewport Flex Boxes**: Never wrap cards or content in `h-full min-h-0 flex-1 overflow-auto` that locks content to the remaining viewport height and forces ugly inner scrollbars. Let pages expand to their natural height so the master `<main>` container handles scrolling smoothly.

### 3. Compact SaaS Ergonomics (Laptop & Desktop Friendly)
- Keep vertical heights lean and compact:
  - **Headers**: `text-xl sm:text-2xl lg:text-3xl`, icon `w-6 h-6`, padding `p-2.5 sm:p-3`.
  - **Metric Strips**: Compact padding `p-3 sm:p-3.5`, icon `w-9 h-9`, number `text-xl sm:text-2xl`.
  - **Toolbars**: `p-2.5 sm:p-3`, input `text-xs sm:text-sm`.
  - **Cards**: Card header `p-3 sm:p-3.5`, card body `p-3 sm:p-3.5 space-y-2.5`, card footer `px-3.5 py-2.5`.
- This ensures that on common laptop displays (1366x768 or 1080p with 125%/150% scaling), primary content and action buttons are immediately visible without the bottom of the card being sliced off.

### 4. Resilient Button & Action Wrapping
- All button containers, toolbars, and card footers must use `flex-wrap items-center gap-2` with `shrink-0` on buttons so controls never overflow, overlap, or collide on narrow screens.

---

## 0.2 Uniform Form Control & Button Heights Invariant (CRITICAL INVARIANT - ZERO HEIGHT MISMATCH)

Whenever form controls (inputs, textboxes, selects, dropdowns, date pickers) and buttons appear in the same row, toolbar, filter bar, card, modal, or component, **THEY MUST SHARE THE EXACT SAME HEIGHT**. No control or button may ever be taller or shorter than adjacent sibling controls.

### 1. The Core Rule: Zero Height Discrepancy
- **Text Box & Button Pairing (Crucial)**: In any search row or input-with-action layout (e.g. search input next to `+ Add` button), the button **MUST NOT be taller or shorter than the text box**. Both elements must use the exact same fixed height token (e.g. both `h-9`).
- **Multiple Buttons Height Equality**: Whenever multiple buttons are displayed side-by-side or within the same component (e.g. `Cancel` + `Save` in a modal footer, or View Mode toggles + filters + Add button in a toolbar), all buttons **MUST have identical height**.
- **Select Dropdowns & Inputs Equality**: When a filter dropdown (`select`) sits beside a text input or search bar, both must share the exact same height class (`h-9`).

### 2. Standard Height Token Hierarchy:

| Context / Location | Target Height | Utility Class | Elements Covered |
| :--- | :--- | :--- | :--- |
| **Toolbar & Filter Row** | **36px** | `h-9` | Search inputs (`saas-input h-9`), Select dropdowns (`h-9`), View toggles (`h-9`), Primary Add buttons (`btn-primary h-9`), Filter buttons (`btn-secondary h-9`) |
| **Forms & Modal Actions** | **40px** | `h-10` | Form inputs (`saas-input h-10`), Form selects (`h-10`), Modal footer buttons (`btn-cancel h-10`, `btn-primary h-10`) |
| **Table Rows & Card Actions** | **32px** or **28px** | `h-8 w-8` or `h-7 w-7` | Action icon buttons (Edit, Delete, Feedback, Reset Password) inside data tables and card footers |

### 3. ⛔ Strict Prohibitions & Input Standards:
- **NO Mismatched Heights in Same Row**: Never pair an input with an adjacent button where one is 38px and the other is 42px or 34px.
- **NO Arbitrary Padding Mixes**: Never rely on random vertical padding combinations (e.g. mixing `py-1.5`, `py-2`, `py-2.5` on sibling controls) without an explicit fixed height utility (`h-9` or `h-10`).
- **NO Taller/Shorter Action Buttons**: In modal footers or card action bars, never make the "Cancel" button shorter or taller than the "Save / Submit" button.
- **Search Icon Clearance (Zero Overlap Invariant)**: When pairing `<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />` with `saas-input`, always ensure `style={{ paddingLeft: "2.35rem", paddingRight: search ? "2rem" : "0.75rem" }}` (or `!pl-9.5`) is explicitly applied so the placeholder/value text never collides with or overlaps the lens icon.

---

## 0.3 Standardized Data Table Pagination Invariant (CRITICAL INVARIANT - ZERO PAGINATION INCONSISTENCY)

Every page displaying data in tables or grid lists with pagination **MUST** use the centralized `<DataTablePagination />` component (`@/components/ui/DataTablePagination`).

### 1. Mandatory Component Usage
- **NO Ad-hoc / Inconsistent Markup**: Never code custom inline pagination divs, raw `<svg>` icons, or arbitrary text styles across pages.
- **Identical Look & Feel Everywhere**:
  - Compact, ergonomic container: `p-2.5 sm:p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500`.
  - Left Summary: `Showing <span className="font-bold text-slate-900">{start}</span> to <span className="font-bold text-slate-900">{end}</span> of <span className="font-bold text-slate-900">{total}</span> entries`.
  - Buttons: Exactly `h-8 w-8 rounded-md bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none` with Lucide icons.
  - Page Badge: `px-2.5 py-1 rounded-md bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs` with highlighted page number (`text-indigo-600 font-extrabold`).

### 2. Standard Usage:
```tsx
import { DataTablePagination } from "@/components/ui/DataTablePagination";

// Client-side TanStack Table:
<DataTablePagination table={table} />

// Server-side Paginated Table:
<DataTablePagination
  pageIndex={pageIndex}
  pageSize={pageSize}
  totalCount={totalCount}
  pageCount={pageCount}
  canPreviousPage={pageIndex > 0}
  canNextPage={pageIndex < pageCount - 1}
  onPreviousPage={() => setPageIndex(p => p - 1)}
  onNextPage={() => setPageIndex(p => p + 1)}
/>
```

```

---

## 0.4 Page Layout Container Spacing & Uniform Sidebar Gap Invariant (ZERO NESTED PADDING INVARIANT)

Every page in the application must have an identical, seamless visual distance from the application sidebar and top navigation bar.

### 1. The Core Rule: Zero Nested / Double Padding
- In `DashboardLayout.tsx`, the master application container already provides responsive layout padding:
  `<main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 overflow-y-auto">`
- **Strictly NO Nested Padding in Page Components**: Individual page components (`*Page.tsx`) must **NEVER** declare additional outer horizontal padding (such as `p-6` or `p-8`) on their root wrapper.
- Adding `p-6` inside `<main>` doubles the spacing (`32px + 24px = 56px`), causing an unsightly large gap between the sidebar and the main content.

### 2. Standard Root Container Token:
All page components must strictly use:
```tsx
<div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
  {/* Page Header */}
  {/* Stats Strip */}
  {/* Main SaaS Card */}
</div>
```
- Use `space-y-3.5` (or `space-y-4`) for vertical rhythm.
- Use `pb-6` for comfortable bottom breathing room.
- NEVER add `p-6`, `p-8`, or `px-6` to the page component root.

---

## 1. Page Layout & Wrapper Architecture

Every page must use this natural-height top-level container structure:

```tsx
export default function MyNewPage() {
  return (
    <div className="animate-in fade-in duration-500 space-y-4 sm:space-y-5 pb-6">
      {/* 1. Page Header */}
      {/* 2. Stat / Metrics Cards (Optional) */}
      {/* 3. Main Card (Toolbar + Table or Content) */}
    </div>
  );
}
```

---

## 2. Standard Page Header Pattern

All page headers share an identical anatomy:
1. **Icon Container**: Left-aligned icon inside a border-2 box.
2. **Two-Tone Title**: Slate-900 primary word + Indigo-600 highlighted word.
3. **Subtitle**: `text-slate-500` explaining the page's purpose.
4. **Action Area**: Right-aligned buttons (e.g., "Add New", "Export", Date Picker).

```tsx
<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 mb-6 shrink-0">
  <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
    {/* Icon Container */}
    <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
      <Users className="w-7 h-7" />
    </div>
    {/* Title & Subtitle */}
    <div>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
        <span className="text-slate-900">Patient</span>
        <span className="text-indigo-600">Directory</span>
      </h1>
      <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
        Manage registered patients and clinical records.
      </p>
    </div>
  </div>

  {/* Header Actions */}
  <div className="flex items-center gap-3 self-end xl:self-auto flex-wrap">
    <button
      onClick={() => setIsModalOpen(true)}
      className="btn-primary flex items-center gap-2"
    >
      <PlusCircle className="w-4 h-4" />
      <span>Add Patient</span>
    </button>
  </div>
</div>
```

---

## 3. Stat / Metrics Cards Pattern

When presenting KPIs, statistics, or overview counts, use a responsive grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div className="saas-card p-5 flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">1,248</h3>
      <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
        <span>↑ 12%</span> from last week
      </p>
    </div>
    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
      <Users className="w-6 h-6" />
    </div>
  </div>
</div>
```

---

## 4. Main Card & Data Table Pattern

All data listings and tables live inside a `.saas-card` container with a top toolbar and bottom pagination.

### Toolbar Anatomy:
- **Left**: View toggles (Grid/Table), Status Filter dropdown, Page size selector (`Show 10, 20, 50`).
- **Right**: Search Input with Clear Button (`X`) AND the primary `+ Add New ...` action button (`.btn-primary`). Placing the Add button directly to the right of the search box in the toolbar avoids unnecessary vertical scrolling from bloated headers and unifies creation with search workflows.

```tsx
<div className="saas-card overflow-hidden">
  {/* Toolbar */}
  <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
    {/* Left: View Mode, Filters & Page Size (All Controls Uniform h-9) */}
    <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full md:w-auto order-2 md:order-1">
      <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-xs shrink-0 h-9">
        <button className="h-full px-2.5 rounded-sm bg-indigo-50 text-indigo-600 shadow-xs"><LayoutGrid className="w-4 h-4" /></button>
        <button className="h-full px-2.5 rounded-sm text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
      </div>

      <select className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs">
        <option>All Statuses</option>
      </select>
    </div>

    {/* Right: Search & Primary Add Button (Exact Same h-9 Height) */}
    <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto order-1 md:order-2">
      <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="saas-input h-9 w-full text-xs" style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Button matches search input height exactly (h-9) */}
      <button onClick={openAddModal} className="btn-primary h-9 px-3 sm:px-3.5 text-xs shrink-0 flex items-center gap-1.5">
        <PlusCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add Record</span>
        <span className="sm:hidden">Add</span>
      </button>
    </div>
  </div>

  {/* Table Container (Responsive Horizontal Scroll, Never Trapped Vertically) */}
  <div className="overflow-x-auto bg-white">
    <table className="w-full text-left border-collapse">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
        <tr>
          <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Patient Name</th>
          <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Phone</th>
          <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Status</th>
          <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.name}</td>
            <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.phone}</td>
            <td className="px-6 py-4">
              <span className="badge-success">Active</span>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Standardized Pagination Footer (Consistent across ALL pages) */}
  <DataTablePagination table={table} />
</div>
```

---

## 5. Status Badges & Pills

Always use semantic colors with matching subtle borders and backgrounds:

| Status | Classes | Example |
| :--- | :--- | :--- |
| **Success / Active / Completed** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200` | Completed, Active |
| **Warning / Pending / In-Progress** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200` | Pending, Waiting |
| **Danger / Cancelled / Failed** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200` | Cancelled, Failed |
| **Info / Scheduled** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200` | Scheduled, Sent |
| **Neutral / Inactive** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200` | Inactive, Draft |

---

## 6. Buttons & Interactive Elements

Never create ad-hoc button styling. Use the established CSS utility classes from `index.css`:

```tsx
{/* Primary Action Button (Add, Save, Submit) */}
<button className="btn-primary">
  <Save className="w-4 h-4 mr-2" />
  <span>Save Changes</span>
</button>

{/* Cancel / Dismiss Button (Always light rose tint with X icon) */}
<button className="btn-cancel">
  <X className="w-4 h-4 mr-1.5" />
  <span>Cancel</span>
</button>

{/* Secondary Action Button (Back, Filter, Neutral) */}
<button className="btn-secondary">
  <span>Go Back</span>
</button>

{/* Danger Action Button (Delete, Terminate) */}
<button className="btn-danger">
  <Trash2 className="w-4 h-4 mr-2" />
  <span>Delete</span>
</button>
```

---

## 7. Form Fields & Validation

All input elements must adhere to standard focus rings and error states:

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-semibold text-slate-700">
    Branch Name <span className="text-rose-500">*</span>
  </label>
  <input
    type="text"
    placeholder="e.g. Downtown Clinic"
    className="saas-input"
  />
  {/* Validation Error Message */}
  <FieldError errors={validationErrors.Name} />
</div>
```

---

## 8. Modals & Slide-Over Drawers

Standard Modal Shell:

```tsx
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Add New Doctor</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Form fields */}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Doctor</button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

---

## 9. Empty States & Loading States

### Empty State:
```tsx
<div className="py-16 flex flex-col items-center justify-center text-center p-6">
  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
    <FolderOpen className="w-7 h-7" />
  </div>
  <h3 className="text-base font-bold text-slate-800">No records found</h3>
  <p className="text-sm text-slate-500 max-w-sm mt-1">
    There are no items matching your filter criteria or none have been added yet.
  </p>
</div>
```

### Loading State:
Always use `PageLoader` from `@/components/ui/PageLoader` or animated table skeleton rows.
