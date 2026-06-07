import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  UserCog, Search, Plus, Edit, Trash2,
  X, Save, Activity, ShieldCheck, Mail, Phone, Hash, Calendar, LayoutGrid, List, User, Key, Building2
} from "lucide-react"

import { staffService } from "@/services/staffService"
import { branchService } from "@/services/branchService"
import { useAuthStore } from "@/store/authStore"

const ROLES = [
  { value: 3, label: 'Receptionist', display: 'Receptionist', desc: 'Can manage queue and book tokens' },
  { value: 2, label: 'BranchAdmin', display: 'Branch Admin', desc: 'Full access to this branch' },
  { value: 1, label: 'OrgAdmin', display: 'Org Admin', desc: 'Manages all branches' },
]

export default function StaffPage() {
  const { user } = useAuthStore()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const globalBranchId = user?.branchId

  const queryClient = useQueryClient()
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || 'org')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  })

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', orgId, selectedBranchId],
    queryFn: () => staffService.getStaff(orgId!, selectedBranchId === 'org' ? null : selectedBranchId),
    enabled: !!orgId && !!selectedBranchId
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.createStaff({
      branchId: selectedBranchId === 'org' ? null : selectedBranchId,
      organizationId: orgId!,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsDrawerOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => staffService.updateStaff(editingStaff.id, {
      id: editingStaff.id,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsDrawerOpen(false)
      setEditingStaff(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.deleteStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: any = {
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      employeeId: formData.get('employeeId'),
      phoneNumber: formData.get('phoneNumber'),
      role: parseInt(formData.get('role') as string)
    }
    const password = formData.get('password') as string

    if (editingStaff) {
      if (password) data.newPassword = password
      updateMutation.mutate(data)
    } else {
      data.password = password
      createMutation.mutate(data)
    }
  }

  const filteredStaff = useMemo(() => {
    return staff?.filter((s: any) =>
      (s.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (s.role?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((s.firstName || '') + ' ' + (s.lastName || '')).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.employeeId?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    ) || []
  }, [staff, searchQuery])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "employeeId",
      header: "Emp ID",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
          <Hash className="w-3 h-3 text-slate-400" /> {row.original.employeeId || '--'}
        </span>
      )
    },
    {
      accessorKey: "name",
      header: "Staff Member",
      cell: ({ row }) => {
        const roleConfig = ROLES.find(r => r.label.toLowerCase() === row.original.role.toLowerCase().replace(/\s/g, '')) || ROLES[0]
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0 shadow-sm">
              {row.original.firstName?.[0]?.toUpperCase() || row.original.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800">{row.original.firstName} {row.original.lastName}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> {roleConfig.display}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-sm text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" /> {row.original.phoneNumber || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" /> {row.original.email}
          </div>
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingStaff(row.original); setIsDrawerOpen(true) }}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit Staff"
          >
            <Edit className="w-4 h-4" />
          </button>
          {['orgadmin', 'branchadmin', 'superadmin'].includes(role) && (
            <button
              onClick={() => {
                if (confirm('Permanently remove this staff member?')) deleteMutation.mutate(row.original.id)
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Staff"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ], [role, deleteMutation, setEditingStaff, setIsDrawerOpen])

  const table = useReactTable({
    data: filteredStaff,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex, pageSize }
    },
    onPaginationChange: setPagination,
  })

  return (
    <div className="animate-in fade-in duration-500 pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <UserCog className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Staff</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage team members, roles, and branch assignments.</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full pr-1 flex items-center justify-end gap-1"><Building2 className="w-3 h-3 text-indigo-400" /> Branch Location</label>
          <select
            value={selectedBranchId}
            disabled={role === 'branchadmin' || role === 'receptionist'}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all hover:border-indigo-300"
          >
            <option value="org">Organization Level</option>
            <optgroup label="Branches">
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="saas-card overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left Side: View Toggles & Row Count */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>Show {size}</option>
              ))}
            </select>
          </div>

          {/* Right Side: Search & Add Button */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-64 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              onClick={() => { setEditingStaff(null); setIsDrawerOpen(true) }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Staff Members
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="p-0 sm:p-6 bg-slate-50/50">
          {/* Staff Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <UserCog className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Staff Found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or add a new staff member.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white sm:rounded-xl sm:border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {table.getRowModel().rows.map((row) => {
                const member = row.original
                const roleConfig = ROLES.find(r => r.label.toLowerCase() === member.role.toLowerCase().replace(/\s/g, '')) || ROLES[0]
                return (
                  <div key={member.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                    {/* Header Section */}
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-transform ring-4 ring-indigo-50 shrink-0">
                            {member.firstName?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{member.firstName} {member.lastName}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                                <ShieldCheck className="w-3 h-3" /> {roleConfig.display}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-4 flex-1 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0"><Hash className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emp ID</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.employeeId || '--'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0"><Phone className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.phoneNumber || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0"><Mail className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                          <p className="text-xs font-semibold text-slate-700 truncate" title={member.email}>{member.email || '--'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0"><Calendar className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Joined</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{new Date(member.createdAt || Date.now()).getFullYear()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 mt-auto">
                      <button
                        onClick={() => { setEditingStaff(member); setIsDrawerOpen(true) }}
                        className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      {['orgadmin', 'branchadmin', 'superadmin'].includes(role) && (
                        <button
                          onClick={() => {
                            if (confirm('Permanently remove this staff member?')) deleteMutation.mutate(member.id)
                          }}
                          className="flex-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <div className="font-medium">
            Showing {table.getRowModel().rows.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, filteredStaff.length)} of {filteredStaff.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-2 font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer for Add/Edit */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); }}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm">
                    {editingStaff ? <Edit className="w-6 h-6" /> : <UserCog className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingStaff ? 'Edit' : 'Add '}</span>
                      <span className="text-indigo-600">{editingStaff ? '' : 'New '} Staff</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{editingStaff ? 'Update employee details and access.' : 'Grant access to a new team member.'}</p>
                  </div>
                </div>
                <button onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <User className="w-4 h-4 text-blue-500" /> First Name
                      </label>
                      <input required name="firstName" defaultValue={editingStaff?.firstName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <User className="w-4 h-4 text-blue-500" /> Last Name
                      </label>
                      <input required name="lastName" defaultValue={editingStaff?.lastName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Mail className="w-4 h-4 text-rose-500" /> Email
                      </label>
                      <input required type="email" name="email" defaultValue={editingStaff?.email} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Hash className="w-4 h-4 text-teal-500" /> Employee ID
                      </label>
                      <input required name="employeeId" defaultValue={editingStaff?.employeeId} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Phone className="w-4 h-4 text-green-500" /> WhatsApp / Phone
                    </label>
                    <input required type="tel" name="phoneNumber" defaultValue={editingStaff?.phoneNumber} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Key className="w-4 h-4 text-amber-500" /> Password {editingStaff && <span className="text-zinc-400 font-normal">(Leave blank to keep unchanged)</span>}
                    </label>
                    <input type="password" name="password" required={!editingStaff} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={editingStaff ? "••••••••" : "Min 6 characters"} />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-3">
                      <ShieldCheck className="w-4 h-4 text-purple-500" /> Assign Role
                    </label>
                    <div className="space-y-2">
                      {ROLES.filter(r => selectedBranchId === 'org' ? r.label === 'OrgAdmin' : r.label !== 'OrgAdmin').map(r => (
                        <label key={r.value} className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500">
                          <input type="radio" name="role" value={r.value} defaultChecked={editingStaff ? ROLES.find(x => x.label === editingStaff.role)?.value === r.value : r.label === 'Receptionist' || r.label === 'OrgAdmin'} className="mt-1" />
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{r.display}</p>
                            <p className="text-xs text-zinc-500">{r.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t bg-white flex justify-end gap-3">
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" form="staff-form" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingStaff ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
