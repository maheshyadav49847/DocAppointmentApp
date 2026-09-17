import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import PhoneInput from "@/components/PhoneInput"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  Stethoscope, PlusCircle, Search, Edit, Trash2, AlertCircle, X, Save, Activity,
  LayoutGrid, List, User, Users, GraduationCap, Clock, ShieldCheck, Phone, Mail, Building2, Star, Key, CheckCircle, Radio
} from "lucide-react"
import toast from "react-hot-toast"

import { api } from "@/lib/axios"
import { doctorService } from "@/services/doctorService"
import type { Doctor } from "@/services/doctorService"
import { useAuthStore } from "@/store/authStore"
import { PageLoader } from "@/components/ui/PageLoader"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"
import { handleApiError } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import DoctorFeedbacksDrawer from "./components/DoctorFeedbacksDrawer"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { MaskedPhone } from "@/components/ui/MaskedPhone"
import { MaskedEmail } from "@/components/ui/MaskedEmail"


function DoctorRatingBadge({ doctor, onClick }: { doctor: Doctor; onClick: (e: React.MouseEvent) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-feedbacks', doctor.id],
    queryFn: async () => {
      const res = await api.get(`/ratings/doctor/${doctor.id}`)
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <button
      onClick={onClick}
      className="shrink-0 px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 rounded-md transition-all border border-amber-200/80 flex items-center justify-center shadow-2xs gap-1.5 text-xs font-bold"
      title="View Feedbacks & Ratings"
    >
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
      <span>{isLoading ? '...' : (data?.averageScore?.toFixed(1) || '0.0')}</span>
    </button>
  );
}

export default function DoctorsPage() {

  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<any>(null)
  const [resettingDoctor, setResettingDoctor] = useState<any>(null)
  const [isFeedbacksDrawerOpen, setIsFeedbacksDrawerOpen] = useState(false)
  const [selectedDoctorForFeedbacks, setSelectedDoctorForFeedbacks] = useState<Doctor | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { user, activeBranchId } = useAuthStore()
  const { can } = usePermissions()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const selectedBranch = (role === 'orgadmin' || isMultiBranchDoctor) ? (activeBranchId || 'all') : (user?.branchId || '');
  const queryClient = useQueryClient()

  const { data: doctors, isLoading, error } = useQuery({
    queryKey: ['doctors', orgId, selectedBranch],
    queryFn: () => selectedBranch === 'all'
      ? doctorService.getOrganizationDoctors()
      : doctorService.getBranchDoctors(selectedBranch),
    enabled: !!orgId
  })

  const { data: branches } = useQuery({
    queryKey: ['doctors-branches', orgId],
    queryFn: () => doctorService.getBranches(),
    enabled: !!orgId
  })

  const stats = useMemo(() => {
    const list = doctors || []
    const total = list.length
    const active = list.filter((d: any) => d.isActive !== false).length
    const specialties = new Set(list.map((d: any) => d.specialization).filter(Boolean)).size
    const multiBranch = list.filter((d: any) => d.branchIds && d.branchIds.length > 1).length
    return { total, active, specialties, multiBranch }
  }, [doctors])


  const mutation = useMutation({
    mutationFn: async (data: Omit<Doctor, 'id'>) => {
      if (editingDoctor) {
        await doctorService.updateDoctor(editingDoctor.id, { ...data, id: editingDoctor.id } as Doctor)
      } else {
        await doctorService.createDoctor(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setIsDrawerOpen(false)
      setEditingDoctor(null)
      setApiError(null)
      setValidationErrors({})
      toast.success(editingDoctor ? "Doctor updated successfully" : "Doctor created successfully")
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors)
      } else if (error.response?.data?.extensions?.errors) {
        setValidationErrors(error.response.data.extensions.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await doctorService.updateDoctor(data.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      setResettingDoctor(null)
      setApiError(null)
      setValidationErrors({})
      toast.success("Password reset successfully")
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors)
      } else if (error.response?.data?.extensions?.errors) {
        setValidationErrors(error.response.data.extensions.errors)
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => doctorService.deleteDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success("Doctor deleted successfully")
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to delete doctor')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    const errors: Record<string, string[]> = {}

    if (!formData.get('name')) errors.Name = ["Name is required."]
    if (!formData.get('gender')) errors.Gender = ["Gender is required."]
    if (!formData.get('mobile')) errors.Mobile = ["Mobile is required."]
    if (!formData.get('emailId')) errors.EmailId = ["Email is required."]
    if (!formData.get('specialization')) errors.Specialization = ["Specialization is required."]
    if (!formData.get('qualification')) errors.Qualification = ["Qualification is required."]
    if (!formData.get('experience')) errors.Experience = ["Experience is required."]
    if (!formData.get('registrationNumber')) errors.RegistrationNumber = ["Registration Number is required."]
    if (formData.getAll('branchIds').length === 0) errors.BranchIds = ["At least one Facility must be selected."]

    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!editingDoctor) {
      if (!password) {
        errors.Password = ["Password is required."];
      } else if (!passwordPolicyRegex.test(password)) {
        errors.Password = ["Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character."];
      } else if (password !== confirmPassword) {
        errors.ConfirmPassword = ["Passwords do not match."];
      }
    } else {
      if (password) {
        if (!passwordPolicyRegex.test(password)) {
          errors.Password = ["Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character."];
        } else if (password !== confirmPassword) {
          errors.ConfirmPassword = ["Passwords do not match."];
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const data = {
      name: formData.get('name') as string,
      specialization: formData.get('specialization') as string,
      mobile: formData.get('mobile') as string,
      mobileDialCode: formData.get('mobileDialCode') as string,
      emailId: formData.get('emailId') as string,
      gender: formData.get('gender') as string,
      qualification: formData.get('qualification') as string,
      experience: formData.get('experience') as string,
      registrationNumber: formData.get('registrationNumber') as string,
      branchIds: formData.getAll('branchIds') as string[],
      password: password || undefined,
      organizationId: orgId!,
    }
    mutation.mutate(data)
  }

  const columns = useMemo<ColumnDef<Doctor>[]>(() => [
    {
      accessorKey: "name",
      header: "Doctor Details",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            {row.original.name ? row.original.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() || 'D' : 'D'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 leading-snug">{row.original.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3 h-3 text-indigo-500" /> {row.original.specialization}
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "mobile",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div>
            <MaskedPhone
              phone={row.original.mobile}
              dialCode={row.original.mobileDialCode}
              textClassName="text-xs font-semibold text-slate-800"
            />
          </div>
          <div className="mt-0.5">
            <MaskedEmail email={row.original.emailId} emptyText="N/A" textClassName="text-[11px] font-semibold text-slate-500" />
          </div>
        </div>
      )
    },
    {
      accessorKey: "qualification",
      header: "Qualification & Exp.",
      cell: ({ row }) => (
        <div>
          <div className="text-xs font-semibold text-slate-800">{row.original.qualification || 'N/A'}</div>
          <div className="text-[11px] text-slate-500">{row.original.experience ? `${row.original.experience} Exp.` : 'N/A'}</div>
        </div>
      )
    },
    {
      accessorKey: "registrationNumber",
      header: "Reg. No.",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80">
          {row.original.registrationNumber || 'N/A'}
        </span>
      )
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider ${
          row.original.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${row.original.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {row.original.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setSelectedDoctorForFeedbacks(row.original); setIsFeedbacksDrawerOpen(true); }}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-transparent hover:border-amber-100"
            title="View Feedbacks"
          >
            <Star className="w-4 h-4" />
          </button>
          {can('Doctors.Edit') && (
            <>
              <button
                onClick={() => { setEditingDoctor(row.original); setIsDrawerOpen(true); }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-transparent hover:border-indigo-100"
                title="Edit Doctor Profile"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setValidationErrors({}); setResettingDoctor(row.original); }}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-transparent hover:border-amber-100"
                title="Reset Password"
              >
                <Key className="w-4 h-4" />
              </button>
            </>
          )}
          {can('Doctors.Delete') && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this doctor?')) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
              disabled={deleteMutation.isPending}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors border border-transparent hover:border-rose-100 disabled:opacity-50"
              title="Delete Doctor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ], [setEditingDoctor, setIsDrawerOpen, deleteMutation])

  const filteredDoctors = useMemo(() => {
    let list = (doctors || []) as Doctor[]
    if (statusFilter === 'active') {
      list = list.filter((d: any) => d.isActive !== false)
    } else if (statusFilter === 'inactive') {
      list = list.filter((d: any) => d.isActive === false)
    }
    return list
  }, [doctors, statusFilter])

  const tableData = filteredDoctors

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
      pagination: { pageIndex, pageSize }
    },
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
  })

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg flex items-center gap-3 border border-red-100">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Failed to load doctors</h3>
          <p className="text-sm opacity-90">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Doctors</span>
              <span className="text-indigo-600">Directory</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage clinical profiles, specializations, credentials & consultation access.
            </p>
          </div>
        </div>
      </div>

      {/* Stats / Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Doctors */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Doctors</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Registered practitioners</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Active Practitioners */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Online</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.active}</h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 mt-0.5 font-medium">Available for OPD</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Clinical Specialties */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Specialties</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.specialties}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Clinical disciplines</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Multi-Branch Doctors */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Branch</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.multiBranch} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Cross-facility coverage</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
              <option value="inactive">Inactive Only ({stats.total - stats.active})</option>
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

          {/* Right Side: Search & Add Doctor Button (Exact Same h-9 Height) */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto order-1 md:order-2">
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search doctors, specialties..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="saas-input h-9 w-full text-xs" style={{ paddingLeft: "2.3rem", paddingRight: globalFilter ? "2rem" : "0.75rem" }}
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {can('Doctors.Add') && (
              <button
                onClick={() => {
                  setEditingDoctor(null)
                  setIsDrawerOpen(true)
                }}
                className="btn-primary h-9 px-3 sm:px-3.5 text-xs shrink-0 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Doctor</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Data View */}
        <div className="p-3 sm:p-4 bg-slate-50/50">
          {isLoading ? (
            <PageLoader message="Loading doctors..." minHeight="min-h-[40vh]" />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => {
                  const doc = row.original as Doctor
                  const isActive = doc.isActive !== false

                  return (
                    <div
                      key={row.id}
                      className="bg-white rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-indigo-200/90 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group relative overflow-hidden"
                    >
                      {/* Top accent line */}
                      <div className="h-1 w-full bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-indigo-500 transition-all duration-300" />

                      {/* Header Section */}
                      <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                            {/* Doctor Avatar */}
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-white border border-indigo-100 text-indigo-600 flex items-center justify-center font-extrabold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-300">
                              {doc.name ? doc.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() || 'D' : 'D'}
                            </div>

                            {/* Name & Badges */}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors break-words" title={doc.name}>
                                {doc.name}
                              </h3>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {/* Status Badge with Pulse Dot */}
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                                  </span>
                                )}

                                {/* Specialization Badge */}
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-200/70 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Stethoscope className="w-2.5 h-2.5 text-indigo-500" /> {doc.specialization || 'General Practitioner'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <DoctorRatingBadge
                            doctor={doc}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDoctorForFeedbacks(doc)
                              setIsFeedbacksDrawerOpen(true)
                            }}
                          />
                        </div>

                        {/* Credentials Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100/80 text-[11px] font-medium text-slate-600">
                          {doc.gender && (
                            <span className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                              <User className="w-3 h-3 text-indigo-500 shrink-0" /> {doc.gender}
                            </span>
                          )}
                          {doc.qualification && (
                            <span className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                              <GraduationCap className="w-3 h-3 text-amber-500 shrink-0" /> {doc.qualification}
                            </span>
                          )}
                          {doc.experience && (
                            <span className="inline-flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                              <Clock className="w-3 h-3 text-emerald-500 shrink-0" /> {doc.experience}
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
                                  phone={doc.mobile}
                                  dialCode={doc.mobileDialCode}
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
                                <MaskedEmail email={doc.emailId} emptyText="--" textClassName="text-xs font-semibold text-slate-800" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Registration & Branches Row */}
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-50/80 border border-slate-100 group-hover:border-slate-200/80 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-purple-50 border border-purple-100/60 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                              <ShieldCheck className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Reg. No</p>
                              <p className="text-xs font-semibold text-slate-800 break-words mt-0.5">{doc.registrationNumber || '--'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 shrink-0 bg-white px-2 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                            <Building2 className="w-3 h-3 text-rose-500" />
                            <span>{doc.branchIds?.length ? `${doc.branchIds.length} ${doc.branchIds.length === 1 ? 'Branch' : 'Branches'}` : 'No Branch'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" />
                          <span>OPD Practitioner</span>
                        </div>

                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {can('Doctors.Edit') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingDoctor(doc)
                                  setIsDrawerOpen(true)
                                }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all"
                                title="Edit Doctor Profile"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setValidationErrors({})
                                  setResettingDoctor(doc)
                                }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-amber-600 bg-white hover:bg-amber-50 border border-slate-200/90 hover:border-amber-200 shadow-2xs hover:shadow-xs transition-all"
                                title="Reset Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {can('Doctors.Delete') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Are you sure you want to delete this doctor?')) {
                                  deleteMutation.mutate(doc.id)
                                }
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 shadow-2xs hover:shadow-xs transition-all"
                              title="Delete Doctor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Stethoscope className="w-10 h-10 text-slate-300 mb-2.5" />
                    <p className="text-base font-bold text-slate-800">No doctors found</p>
                    <p className="text-xs text-slate-400 mt-0.5">No doctors match your search or filter criteria.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden bg-white rounded-lg border border-slate-200 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-3 text-xs whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <Stethoscope className="w-10 h-10 text-slate-300 mb-2.5" />
                          <p className="text-base font-bold text-slate-800">No doctors found</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Standardized Pagination Footer */}
        <DataTablePagination table={table} totalCount={tableData.length} />
      </div>

      {/* Slide-over Drawer for Add/Edit Doctor */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsDrawerOpen(false); setEditingDoctor(null); }}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs">
                    {editingDoctor ? <Edit className="w-5 h-5 sm:w-6 sm:h-6" /> : <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingDoctor ? 'Edit' : 'Add'}</span>
                      <span className="text-indigo-600">{editingDoctor ? 'Doctor Profile' : 'New Doctor'}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{editingDoctor ? 'Update doctor profile and credentials.' : 'Enroll a new clinical practitioner.'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsDrawerOpen(false); setEditingDoctor(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <form noValidate autoComplete="off" id="doctor-form" onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <ApiErrorAlert error={apiError} />
                  
                    {/* Section 1: Personal Details */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">Personal Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <User className="w-3.5 h-3.5 text-blue-500" /> Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="name" defaultValue={editingDoctor?.name} className="saas-input w-full" placeholder="Dr. John Doe" />
                          <FieldError errors={validationErrors} field="Name" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <Users className="w-3.5 h-3.5 text-pink-500" /> Gender <span className="text-rose-500">*</span>
                          </label>
                          <select required name="gender" defaultValue={editingDoctor?.gender ? editingDoctor.gender.charAt(0).toUpperCase() + editingDoctor.gender.slice(1).toLowerCase() : ""} className="saas-input w-full">
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                          <FieldError errors={validationErrors} field="Gender" />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Contact & Login Details */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">Contact & Access Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" /> Mobile <span className="text-rose-500">*</span>
                          </label>
                          <PhoneInput
                            name="mobile"
                            dialCodeName="mobileDialCode"
                            defaultValue={editingDoctor?.mobile?.replace(/^\+\d+/, '') || editingDoctor?.mobile}
                            defaultDialCode={editingDoctor?.mobileDialCode || '+91'}
                            required
                          />
                          <FieldError errors={validationErrors} field="Mobile" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <Mail className="w-3.5 h-3.5 text-rose-500" /> Email <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="emailId" type="email" defaultValue={editingDoctor?.emailId} className="saas-input w-full" placeholder="doctor@example.com" />
                          <FieldError errors={validationErrors} field="EmailId" />
                        </div>
                        {!editingDoctor && (
                          <>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Password (Login) <span className="text-rose-500">*</span>
                              </label>
                              <input required={!editingDoctor} autoComplete="new-password" name="password" type="password" className="saas-input w-full" placeholder="••••••••" />
                              <FieldError errors={validationErrors} field="Password" />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Confirm Password <span className="text-rose-500">*</span>
                              </label>
                              <input required={!editingDoctor} autoComplete="new-password" name="confirmPassword" type="password" className="saas-input w-full" placeholder="••••••••" />
                              <FieldError errors={validationErrors} field="ConfirmPassword" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Qualification Details */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">Qualification & Registration</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <Stethoscope className="w-3.5 h-3.5 text-indigo-500" /> Specialization <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="specialization" defaultValue={editingDoctor?.specialization} className="saas-input w-full" placeholder="e.g. Cardiologist" />
                          <FieldError errors={validationErrors} field="Specialization" />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> Qualification <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="qualification" defaultValue={editingDoctor?.qualification} className="saas-input w-full" placeholder="MBBS, MD" />
                          <FieldError errors={validationErrors} field="Qualification" />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Experience <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="experience" defaultValue={editingDoctor?.experience} className="saas-input w-full" placeholder="e.g. 5 Years" />
                          <FieldError errors={validationErrors} field="Experience" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" /> Registration No. <span className="text-rose-500">*</span>
                          </label>
                          <input required autoComplete="off" name="registrationNumber" defaultValue={editingDoctor?.registrationNumber} className="saas-input w-full" placeholder="e.g. MCI-12345" />
                          <FieldError errors={validationErrors} field="RegistrationNumber" />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Assigned Branches */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">Assigned Branches <span className="text-rose-500">*</span></h3>
                      <div>
                        {!branches ? (
                          <div className="text-xs text-slate-500">Loading branches...</div>
                        ) : branches.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {branches.map((branch: any) => (
                              <label key={branch.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-2 rounded-md bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors">
                                <input
                                  type="checkbox"
                                  name="branchIds"
                                  value={branch.id}
                                  defaultChecked={editingDoctor?.branchIds?.some((id: string) => id.toLowerCase() === branch.id.toLowerCase())}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span className="truncate">{branch.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600">No branches found. Please create a branch first.</div>
                        )}
                        <FieldError errors={validationErrors} field="BranchIds" />
                      </div>
                    </div>
                </form>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); setEditingDoctor(null); }}
                  className="btn-cancel"
                >
                  <X className="w-4 h-4 mr-1.5" /> Cancel
                </button>
                <button
                  type="submit"
                  form="doctor-form"
                  disabled={mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending ? <Activity className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  <span>{editingDoctor ? 'Save Changes' : 'Enroll Doctor'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DoctorFeedbacksDrawer 
        isOpen={isFeedbacksDrawerOpen} 
        onClose={() => {
          setIsFeedbacksDrawerOpen(false);
          setSelectedDoctorForFeedbacks(null);
        }} 
        doctor={selectedDoctorForFeedbacks} 
      />

      <AnimatePresence>
        {resettingDoctor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => { setValidationErrors({}); setResettingDoctor(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-200 z-10 flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg text-amber-600 border-2 border-amber-100 bg-white shadow-xs">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter a new password for Dr. {resettingDoctor.name}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setValidationErrors({}); setResettingDoctor(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Close Dialog"
                >
                  <X className="w-5 h-5" />
                </button>
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
                  ...resettingDoctor,
                  password: newPassword
                })

              }}>
                  <div className="p-5 sm:p-6 space-y-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                        <Key className="w-3.5 h-3.5 text-amber-500" /> New Password <span className="text-rose-500">*</span>
                      </label>
                      <input autoComplete="new-password" name="password" type="password" placeholder="••••••••" className="saas-input w-full" />
                      <FieldError errors={validationErrors} field="Password" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Confirm New Password <span className="text-rose-500">*</span>
                      </label>
                      <input autoComplete="new-password" name="confirmPassword" type="password" placeholder="••••••••" className="saas-input w-full" />
                      <FieldError errors={validationErrors} field="ConfirmPassword" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button type="button" onClick={() => { setValidationErrors({}); setResettingDoctor(null); }} className="btn-cancel">
                      <X className="w-4 h-4 mr-1.5" /> Cancel
                    </button>
                    <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                      {updateMutation.isPending ? <Activity className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                      <span>{updateMutation.isPending ? 'Saving...' : 'Reset Password'}</span>
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
