import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import PhoneInput from "@/components/PhoneInput"
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
import toast from "react-hot-toast"

import { staffService } from "@/services/staffService"
import { useAuthStore } from "@/store/authStore"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"
import { handleApiError } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"

export default function StaffPage() {
  const { user, activeBranchId, setActiveBranchId } = useAuthStore()
  const { can } = usePermissions()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const globalBranchId = user?.branchId

  const queryClient = useQueryClient()
  const selectedBranchId = role === 'orgadmin' ? (activeBranchId || 'org') : (globalBranchId || 'org');
  const setSelectedBranchId = setActiveBranchId
  const [searchQuery, setSearchQuery] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [resettingStaff, setResettingStaff] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data: branches } = useQuery({
    queryKey: ['staff-branches', orgId],
    queryFn: () => staffService.getBranches(),
    enabled: !!orgId
  })

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', orgId, selectedBranchId],
    queryFn: () => staffService.getStaff(orgId!, selectedBranchId === 'org' ? null : selectedBranchId),
    enabled: !!orgId && !!selectedBranchId
  })

  const { data: dbRoles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: staffService.getRoles
  })

  const availableRoles = dbRoles.filter(r => role === 'superadmin' ? true : r.name !== 'SuperAdmin')

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.createStaff({
      branchId: selectedBranchId === 'org' ? null : selectedBranchId,
      organizationId: orgId!,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsDrawerOpen(false)
      setApiError(null)
      setValidationErrors({})
      toast.success('Staff created successfully')
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) setValidationErrors(error.response.data.errors)
      else if (error.response?.data?.extensions?.errors) setValidationErrors(error.response.data.extensions.errors)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => staffService.updateStaff(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsDrawerOpen(false)
      setEditingStaff(null)
      setResettingStaff(null)
      setApiError(null)
      setValidationErrors({})
      toast.success('Staff updated successfully')
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) setValidationErrors(error.response.data.errors)
      else if (error.response?.data?.extensions?.errors) setValidationErrors(error.response.data.extensions.errors)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff deleted successfully')
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to delete staff')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)

    if (!editingStaff) {
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      if (!password || password.length < 8) {
        setValidationErrors({
          Password: ["Password must be at least 8 characters."]
        });
        return;
      }

      if (password !== confirmPassword) {
        setValidationErrors({
          ConfirmPassword: ["Passwords do not match."]
        });
        return;
      }
    }

    const data: any = {
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      employeeId: formData.get('employeeId'),
      phoneNumber: formData.get('phoneNumber'),
      phoneNumberDialCode: formData.get('phoneNumberDialCode'),
      roleName: formData.get('role') as string // Backend expects RoleName!
    }
    if (editingStaff) {
      updateMutation.mutate({ ...data, id: editingStaff.id })
    } else {
      data.password = formData.get('password') as string
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
        const displayRole = row.original.role || 'Unknown'
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {row.original.firstName?.[0]?.toUpperCase() || row.original.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800">{row.original.firstName} {row.original.lastName}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> {displayRole}
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
            <Phone className="w-3.5 h-3.5 text-slate-400" /> {row.original.phoneNumber ? `${row.original.phoneNumberDialCode || ''} ${row.original.phoneNumber}` : 'N/A'}
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
          {can('Staff.Edit') && (
            <>
              <button
                onClick={() => { setEditingStaff(row.original); setIsDrawerOpen(true) }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Staff"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setValidationErrors({}); setResettingStaff(row.original); }}
                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Reset Password"
              >
                <Key className="w-4 h-4" />
              </button>
            </>
          )}
          {can('Staff.Delete') && (
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
  ], [role, deleteMutation, setEditingStaff, setIsDrawerOpen, setResettingStaff, can])

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
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <UserCog className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Staff</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage team members, roles, and branch assignments.</p>
          </div>
        </div>
      </div>

      <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">

          {/* Left Side: View Toggles & Row Count */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto order-2 lg:order-1">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
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
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all w-full sm:w-auto"
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>Show {size}</option>
              ))}
            </select>
          </div>

          {/* Right Side: Search & Add Button */}
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto order-1 lg:order-2">
            <div className="relative flex-1 sm:w-64 lg:w-64 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="saas-input w-full" style={{ paddingLeft: "2.5rem" }}
              />
            </div>

            {can('Staff.Add') && (
              <button
                onClick={() => { setEditingStaff(null); setIsDrawerOpen(true) }}
                className="btn-primary shrink-0 px-3 sm:px-5"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Staff</span>
              </button>
            )}
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
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
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {table.getRowModel().rows.map((row) => {
                const member = row.original
                const displayRole = member.role || 'Unknown'
                return (
                  <div key={member.id} className="group relative bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                    {/* Header Section */}
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            {member.firstName?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{member.firstName} {member.lastName}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                                <ShieldCheck className="w-3 h-3" /> {displayRole}
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
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.phoneNumber ? `${member.phoneNumberDialCode || ''} ${member.phoneNumber}` : 'N/A'}</p>
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
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 mt-auto">
                      {can('Staff.Edit') && (
                        <>
                          <button
                            onClick={() => { setEditingStaff(member); setIsDrawerOpen(true) }}
                            className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => { setValidationErrors({}); setResettingStaff(member); }}
                            className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Key className="w-4 h-4" /> Reset
                          </button>
                        </>
                      )}
                      {can('Staff.Delete') && (
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
              onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); setApiError(null); setValidationErrors({}); }}
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
                <button onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); setApiError(null); setValidationErrors({}); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                  <form key={editingStaff?.id || 'new-staff'} noValidate autoComplete="off" id="staff-form" onSubmit={handleSubmit} className="space-y-6">
                    <ApiErrorAlert error={apiError} />

                    {/* Section 1: Employee Details */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Employee Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Hash className="w-4 h-4 text-teal-500" /> Employee ID
                          </label>
                          <input autoComplete="off" name="employeeId" defaultValue={editingStaff?.employeeId} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="EmployeeId" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <User className="w-4 h-4 text-blue-500" /> First Name
                          </label>
                          <input autoComplete="off" name="firstName" defaultValue={editingStaff?.firstName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="FirstName" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <User className="w-4 h-4 text-blue-500" /> Last Name
                          </label>
                          <input autoComplete="off" name="lastName" defaultValue={editingStaff?.lastName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="LastName" />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Contact & Login Details */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Contact & Login Details</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Mail className="w-4 h-4 text-rose-500" /> Email
                          </label>
                          <input autoComplete="off" type="email" name="email" defaultValue={editingStaff?.email} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="Email" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Phone className="w-4 h-4 text-green-500" /> WhatsApp / Phone
                          </label>
                          <PhoneInput
                            name="phoneNumber"
                            dialCodeName="phoneNumberDialCode"
                            defaultValue={editingStaff?.phoneNumber?.replace(/^\+\d+/, '') || editingStaff?.phoneNumber}
                            defaultDialCode={editingStaff?.phoneNumberDialCode || '+91'}
                          />
                          <FieldError errors={validationErrors} field="PhoneNumber" />
                        </div>
                        {!editingStaff && (
                          <>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                                <Key className="w-4 h-4 text-amber-500" /> Password
                              </label>
                              <Input autoComplete="new-password" type="password" name="password" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                              <FieldError errors={validationErrors} field="Password" />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                                <Key className="w-4 h-4 text-amber-500" /> Confirm Password
                              </label>
                              <Input autoComplete="new-password" type="password" name="confirmPassword" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                              <FieldError errors={validationErrors} field="ConfirmPassword" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Roles & Permissions */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Roles & Permissions</h3>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-3">
                          <ShieldCheck className="w-4 h-4 text-purple-500" /> Assign Role
                        </label>
                        <div className="space-y-2">
                          {availableRoles.filter((r: any) => selectedBranchId === 'org' ? ['OrgAdmin', 'SuperAdmin'].includes(r.name) : !['OrgAdmin', 'SuperAdmin'].includes(r.name)).map((r: any) => (
                            <label key={r.id} className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-1 has-[:checked]:ring-indigo-500">
                              <input autoComplete="off" type="radio" name="role" value={r.name} defaultChecked={editingStaff ? editingStaff.role === r.name : r.name === 'Receptionist' || r.name === 'OrgAdmin'} className="mt-1" />
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">{r.name}</p>
                                <p className="text-xs text-zinc-500">{r.description || `Access level: ${r.name}`}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <FieldError errors={validationErrors} field="Role" />
                      </div>
                    </div>

                  </form>
              </div>

              <div className="p-6 border-t bg-white flex justify-end gap-3">
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); setApiError(null); setValidationErrors({}); }} className="btn-danger"><X className="w-4 h-4" /> Cancel</button>
                <button type="submit" form="staff-form" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingStaff ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {resettingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  Reset Password
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Enter a new password for {resettingStaff.firstName} {resettingStaff.lastName}.
                </p>
              </div>
              <form noValidate autoComplete="off" onSubmit={(e) => {
                e.preventDefault()
                setValidationErrors({})
                const formData = new FormData(e.currentTarget)
                const newPassword = formData.get('password') as string
                const confirmPassword = formData.get('confirmPassword') as string
                
                if (!newPassword || newPassword.length < 8) {
                  setValidationErrors({ Password: ["Password must be at least 8 characters."] });
                  return;
                }

                if (newPassword !== confirmPassword) {
                  setValidationErrors({ ConfirmPassword: ["Passwords do not match."] });
                  return;
                }

                updateMutation.mutate({
                  ...resettingStaff,
                  newPassword
                })
                setResettingStaff(null)
              }}>
                <div className="p-6 space-y-4">
                  <ApiErrorAlert error={updateMutation.error} className="mb-4" />
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                    <Input
                      type="password"
                      name="password"
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="••••••••"
                      autoFocus
                    />
                    <FieldError errors={validationErrors} field="Password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Confirm New Password</label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="••••••••"
                    />
                    <FieldError errors={validationErrors} field="ConfirmPassword" />
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
                  <button type="button" onClick={() => { setValidationErrors({}); setResettingStaff(null); }} className="btn-danger">Cancel</button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                    {updateMutation.isPending ? 'Saving...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
