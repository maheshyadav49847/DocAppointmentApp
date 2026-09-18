import React, { useState, useMemo } from "react"
import { Link } from "react-router-dom"
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
  UserCog, Search, PlusCircle, Edit, Trash2,
  X, Save, Activity, ShieldCheck, Mail, Phone, Hash, Calendar, LayoutGrid, List, User, Key, CheckCircle, LockKeyholeOpen, Lock,
  Users, Radio, CalendarOff
} from "lucide-react"
import toast from "react-hot-toast"

import { staffService } from "@/services/staffService"
import { useAuthStore } from "@/store/authStore"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"
import { handleApiError } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { PageLoader } from "@/components/ui/PageLoader"
import { MaskedPhone } from "@/components/ui/MaskedPhone"
import { MaskedEmail } from "@/components/ui/MaskedEmail"

export default function StaffPage() {
  const { user, activeBranchId } = useAuthStore()
  const { can } = usePermissions()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const globalBranchId = user?.branchId

  const queryClient = useQueryClient()
  const selectedBranchId = role === 'orgadmin' ? (activeBranchId || 'org') : (globalBranchId || 'org');
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked' | 'inactive'>('all')
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

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', orgId, selectedBranchId],
    queryFn: () => staffService.getStaff(orgId!, selectedBranchId === 'org' ? null : selectedBranchId),
    enabled: !!orgId && !!selectedBranchId
  })

  const { data: dbRoles = [] } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: staffService.getRoles
  })

  const availableRoles = dbRoles.filter(r => (role === 'superadmin' ? true : r.name !== 'SuperAdmin') && r.name !== 'Doctor')

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

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => staffService.toggleStatus(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success(data?.isActive ? 'Staff account unlocked & activated' : 'Staff account locked & deactivated')
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to change staff status')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    const errors: Record<string, string[]> = {}

    if (!formData.get('employeeId')) errors.EmployeeId = ["Employee ID is required."]
    if (!formData.get('firstName')) errors.FirstName = ["First Name is required."]
    if (!formData.get('lastName')) errors.LastName = ["Last Name is required."]
    if (!formData.get('email')) errors.Email = ["Email is required."]
    if (!formData.get('phoneNumber')) errors.PhoneNumber = ["Phone Number is required."]

    const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!editingStaff) {
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      if (!password) {
        errors.Password = ["Password is required."];
      } else if (!passwordPolicyRegex.test(password)) {
        errors.Password = ["Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character."];
      } else if (password !== confirmPassword) {
        errors.ConfirmPassword = ["Passwords do not match."];
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
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
    let list = (staff || []) as any[]
    if (statusFilter === 'active') {
      list = list.filter(s => s.isActive && !s.isLockedOut)
    } else if (statusFilter === 'locked') {
      list = list.filter(s => s.isLockedOut)
    } else if (statusFilter === 'inactive') {
      list = list.filter(s => !s.isActive && !s.isLockedOut)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        (s.email?.toLowerCase() || '').includes(q) ||
        (s.role?.toLowerCase() || '').includes(q) ||
        ((s.firstName || '') + ' ' + (s.lastName || '')).toLowerCase().includes(q) ||
        (s.employeeId?.toLowerCase() || '').includes(q)
      )
    }
    return list
  }, [staff, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const list = (staff || []) as any[]
    const total = list.length
    const active = list.filter(s => s.isActive && !s.isLockedOut).length
    const locked = list.filter(s => s.isLockedOut).length
    const inactive = list.filter(s => !s.isActive && !s.isLockedOut).length
    return { total, active, locked, inactive }
  }, [staff])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "employeeId",
      header: "Emp ID",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-200">
          <Hash className="w-3 h-3 text-slate-400" /> {row.original.employeeId || '--'}
        </span>
      )
    },
    {
      accessorKey: "name",
      header: "Staff Member",
      cell: ({ row }) => {
        const displayRole = row.original.role || 'Staff'
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {row.original.firstName?.[0]?.toUpperCase() || row.original.email?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2 text-sm leading-snug">
                {row.original.firstName} {row.original.lastName}
                {row.original.isLockedOut ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <Lock className="w-3 h-3 text-rose-500" /> Locked
                  </span>
                ) : !row.original.isActive ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-500" /> Deactivated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                )}
              </div>
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
        <div className="flex flex-col gap-1 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <MaskedPhone
              phone={row.original.phoneNumber}
              dialCode={row.original.phoneNumberDialCode}
              showIcon
              textClassName="text-xs font-semibold text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MaskedEmail email={row.original.email} showIcon textClassName="text-xs font-semibold text-slate-700" />
          </div>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {can('Staff.Edit') && (
            <>
              <button
                onClick={() => { setEditingStaff(row.original); setIsDrawerOpen(true) }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all"
                title="Edit Staff"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setValidationErrors({}); setResettingStaff(row.original); }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-amber-600 bg-white hover:bg-amber-50 border border-slate-200/90 hover:border-amber-200 shadow-2xs hover:shadow-xs transition-all"
                title="Reset Password"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {can('Staff.Edit') && (
            <button
              onClick={() => {
                if (confirm(row.original.isActive ? 'Manually lock this staff member?' : 'Unlock & activate this staff member?')) toggleStatusMutation.mutate(row.original.id)
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all ${
                row.original.isActive ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
              }`}
              title={row.original.isActive ? "Lock Staff" : "Unlock Staff"}
            >
              {row.original.isActive ? <Lock className="w-3.5 h-3.5" /> : <LockKeyholeOpen className="w-3.5 h-3.5" />}
            </button>
          )}
          {can('Staff.Delete') && (
            <button
              onClick={() => {
                if (confirm('Permanently remove this staff member?')) deleteMutation.mutate(row.original.id)
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 shadow-2xs hover:shadow-xs transition-all"
              title="Delete Staff"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ], [role, deleteMutation, toggleStatusMutation, setEditingStaff, setIsDrawerOpen, setResettingStaff, can])

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
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Staff</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage team members, permissions, access controls & branch assignments.
            </p>
          </div>
        </div>
      </div>

      {/* Stats / Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Staff */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Registered members</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Active & Online */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Online</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.active}</h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 mt-0.5 font-medium">Operational access</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Locked Accounts */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Locked Accounts</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{stats.locked}</h3>
            <p className="text-[10px] sm:text-[11px] text-rose-700/80 mt-0.5 font-medium">Failed login lockouts</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Deactivated */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deactivated</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.inactive}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Suspended accounts</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main SaaS Card with Toolbar and Content */}
      <div className="saas-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left Side: View Mode, Status Filter & Page Size (Uniform h-9) */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full md:w-auto order-2 md:order-1">
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-xs shrink-0 h-9">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-full px-2.5 rounded-sm transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`h-full px-2.5 rounded-sm transition-all flex items-center justify-center ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Filter by status"
            >
              <option value="all">All Statuses ({stats.total})</option>
              <option value="active">Active Only ({stats.active})</option>
              <option value="locked">Locked Only ({stats.locked})</option>
              <option value="inactive">Deactivated ({stats.inactive})</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>Show {size}</option>
              ))}
            </select>
          </div>

          {/* Right Side: Search & Add Staff Button (Exact Same h-9 Height) */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto order-1 md:order-2">
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search staff, role, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="saas-input h-9 w-full text-xs" style={{ paddingLeft: "2.3rem", paddingRight: searchQuery ? "2rem" : "0.75rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Link
              to="/leaves"
              className="btn-secondary h-9 px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs"
              title="Manage Staff Leaves & Approvals"
            >
              <CalendarOff className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Staff Leaves</span>
              <span className="sm:hidden">Leaves</span>
            </Link>

            {can('Staff.Add') && (
              <button
                onClick={() => {
                  setEditingStaff(null)
                  setIsDrawerOpen(true)
                }}
                className="btn-primary h-9 px-3 sm:px-3.5 text-xs shrink-0 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Staff</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Data View */}
        <div className="p-3 sm:p-4 bg-slate-50/50">
          {isLoading ? (
            <PageLoader message="Loading staff directory..." minHeight="min-h-[40vh]" />
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-dashed border-slate-200">
              <UserCog className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Staff Found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200/90 shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
                        <td key={cell.id} className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {table.getRowModel().rows.map(row => {
                const member = row.original
                const displayRole = member.role || 'Staff'

                return (
                  <div
                    key={member.id}
                    className="bg-white rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-indigo-200/90 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group relative overflow-hidden"
                  >
                    {/* Top accent line */}
                    <div className="h-1 w-full bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-indigo-500 transition-all duration-300" />

                    {/* Header Section */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-white border border-indigo-100 text-indigo-600 flex items-center justify-center font-extrabold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-300">
                            {member.firstName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'S'}
                          </div>

                          {/* Name & Badges */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors break-words" title={`${member.firstName} ${member.lastName}`}>
                              {member.firstName} {member.lastName}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {/* Status Badge with Pulse Dot */}
                              {member.isLockedOut ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                  <Lock className="w-2.5 h-2.5 text-rose-500" /> Locked
                                </span>
                              ) : !member.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Deactivated
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                </span>
                              )}

                              {/* Role Badge */}
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200/70 px-2 py-0.5 rounded-full shadow-2xs">
                                <ShieldCheck className="w-2.5 h-2.5 text-indigo-500" /> {displayRole}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100/80 text-[11px] font-medium text-slate-600">
                        {member.employeeId && (
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                            <Hash className="w-3 h-3 text-teal-500 shrink-0" /> {member.employeeId}
                          </span>
                        )}
                        {member.createdAt && (
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                            <Calendar className="w-3 h-3 text-emerald-500 shrink-0" /> Joined {new Date(member.createdAt).getFullYear()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Clean Stacked Rows (Zero Truncation Rule!) */}
                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-white">
                      {/* Contact Row */}
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-50/80 border border-slate-100 group-hover:border-slate-200/80 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Phone className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Contact</p>
                            <div className="mt-0.5">
                              <MaskedPhone
                                phone={member.phoneNumber}
                                dialCode={member.phoneNumberDialCode}
                                textClassName="text-xs font-semibold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Email Row */}
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-50/80 border border-slate-100 group-hover:border-slate-200/80 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-teal-50 border border-teal-100/60 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Mail className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Email</p>
                            <div className="mt-0.5">
                              <MaskedEmail email={member.email} emptyText="--" textClassName="text-xs font-semibold text-slate-800" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{displayRole}</span>
                      </div>

                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        {can('Staff.Edit') && (
                          <>
                            <button
                              onClick={() => { setEditingStaff(member); setIsDrawerOpen(true); }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all"
                              title="Edit Staff"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setValidationErrors({}); setResettingStaff(member); }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-amber-600 bg-white hover:bg-amber-50 border border-slate-200/90 hover:border-amber-200 shadow-2xs hover:shadow-xs transition-all"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(member.isActive ? 'Manually lock this staff member?' : 'Unlock & activate this staff member?')) toggleStatusMutation.mutate(member.id)
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-purple-600 bg-white hover:bg-purple-50 border border-slate-200/90 hover:border-purple-200 shadow-2xs hover:shadow-xs transition-all"
                              title={member.isActive ? "Lock Account" : "Unlock Account"}
                            >
                              {member.isActive ? <Lock className="w-3.5 h-3.5" /> : <LockKeyholeOpen className="w-3.5 h-3.5 text-emerald-600" />}
                            </button>
                          </>
                        )}
                        {can('Staff.Delete') && (
                          <button
                            onClick={() => {
                              if (confirm('Permanently remove this staff member?')) deleteMutation.mutate(member.id)
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 shadow-2xs hover:shadow-xs transition-all"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Standardized Pagination Footer */}
        <DataTablePagination table={table} totalCount={filteredStaff.length} />
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
                            <Hash className="w-4 h-4 text-teal-500" /> Employee ID <span className="text-red-500">*</span>
                          </label>
                          <input required autoComplete="off" name="employeeId" defaultValue={editingStaff?.employeeId} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="EmployeeId" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <User className="w-4 h-4 text-blue-500" /> First Name <span className="text-red-500">*</span>
                          </label>
                          <input required autoComplete="off" name="firstName" defaultValue={editingStaff?.firstName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="FirstName" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <User className="w-4 h-4 text-blue-500" /> Last Name <span className="text-red-500">*</span>
                          </label>
                          <input required autoComplete="off" name="lastName" defaultValue={editingStaff?.lastName} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
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
                            <Mail className="w-4 h-4 text-rose-500" /> Email <span className="text-red-500">*</span>
                          </label>
                          <input required autoComplete="off" type="email" name="email" defaultValue={editingStaff?.email} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <FieldError errors={validationErrors} field="Email" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Phone className="w-4 h-4 text-green-500" /> WhatsApp / Phone <span className="text-red-500">*</span>
                          </label>
                          <PhoneInput
                            name="phoneNumber"
                            dialCodeName="phoneNumberDialCode"
                            defaultValue={editingStaff?.phoneNumber?.replace(/^\+\d+/, '') || editingStaff?.phoneNumber}
                            defaultDialCode={editingStaff?.phoneNumberDialCode || '+91'}
                            required
                          />
                          <FieldError errors={validationErrors} field="PhoneNumber" />
                        </div>
                        {!editingStaff && (
                          <>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                                <Key className="w-4 h-4 text-amber-500" /> Password <span className="text-red-500">*</span>
                              </label>
                              <Input required autoComplete="new-password" type="password" name="password" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
                              <FieldError errors={validationErrors} field="Password" />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                                <Key className="w-4 h-4 text-amber-500" /> Confirm Password <span className="text-red-500">*</span>
                              </label>
                              <Input required autoComplete="new-password" type="password" name="confirmPassword" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
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
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingStaff(null); setApiError(null); setValidationErrors({}); }} className="btn-cancel"><X className="w-4 h-4" /> Cancel</button>
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
                
                if (!newPassword || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
                  setValidationErrors({ Password: ["Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character."] });
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
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Key className="w-4 h-4 text-amber-500" /> New Password
                    </label>
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
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Confirm New Password
                    </label>
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
                  <button type="button" onClick={() => { setValidationErrors({}); setResettingStaff(null); }} className="btn-cancel">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex items-center gap-1.5">
                    {updateMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
