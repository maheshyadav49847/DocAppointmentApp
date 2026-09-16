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
| **Action Buttons** | **6px** | `.btn-primary`, `.btn-secondary`, `.btn-danger`, `rounded-md` | `border-radius: 6px` |
| **Form Inputs & Dropdowns** | **6px** | `.saas-input`, `input`, `select`, `textarea`, `rounded-md` | `border-radius: 6px` |
| **Segmented Controls & Tabs** | **6px** / **4px** | Container: `rounded-md`, Tab Item: `rounded-sm` | `border-radius: 6px / 4px` |
| **Status Badges & Tags** | **4px** | `rounded-sm` (or compact `rounded`) | `border-radius: 4px` |
| **Micro-indicators & Dots** | **3px** / circular | `rounded-xs` or `rounded-full` (for status dot only) | `border-radius: 3px / 50%` |

### ⛔ Strict Prohibitions:
- **NO Bubbly / Oversized Curves**: NEVER use `rounded-2xl` (16px), `rounded-3xl` (24px), or `rounded-4xl` anywhere on cards, containers, drawers, modals, inputs, or buttons.
- **NO Pill Buttons or Cards**: NEVER use `rounded-full` on buttons, cards, containers, or modals (only allowed on pure circular avatar images or tiny 6px pulse status dots).
- **NO Pure Sharp Boxiness**: Do not use `rounded-none` (0px) on standard cards or interactive buttons unless intentionally designing a flat divider or square tile grid.

---

## 1. Page Layout & Wrapper Architecture

Every page must use this top-level container structure:

```tsx
export default function MyNewPage() {
  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6">
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
- **Left**: View toggles (Grid/Table), Page size selector (`Show 10, 20, 50`).
- **Right**: Filter dropdowns (Status, Branch, Doctor), Date Range selector, and Search Input.

```tsx
<div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0">
  {/* Toolbar */}
  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    {/* Left: Row Count */}
    <div className="flex items-center gap-3">
      <select
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
      >
        <option value={10}>Show 10</option>
        <option value={20}>Show 20</option>
        <option value={50}>Show 50</option>
      </select>
    </div>

    {/* Right: Search & Filters */}
    <div className="flex items-center gap-3 flex-1 lg:flex-none justify-end">
      <div className="relative w-full sm:w-64">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
        />
      </div>
    </div>
  </div>

  {/* Table Container */}
  <div className="overflow-auto flex-1 bg-white">
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

  {/* Pagination Footer */}
  <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
    <p>Showing <span className="font-semibold text-slate-900">1</span> to <span className="font-semibold text-slate-900">10</span> of <span className="font-semibold text-slate-900">100</span> entries</p>
    <div className="flex items-center gap-2">
      <button disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs">Previous</button>
      <button disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs">Next</button>
    </div>
  </div>
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

{/* Secondary Action Button (Cancel, Back, Filter) */}
<button className="btn-secondary">
  <span>Cancel</span>
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
