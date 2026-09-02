import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
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
  Stethoscope, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle, X, Save, Activity,
  LayoutGrid, List, User, Users, GraduationCap, Clock, ShieldCheck, Phone, Mail, Building2, Star, Key, CheckCircle
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
      className="shrink-0 px-2 py-1.5 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 hover:scale-105 rounded-xl transition-all border border-yellow-200 flex items-center justify-center shadow-sm gap-1.5"
      title="View Feedbacks"
    >
      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
      <span className="text-xs font-bold">{isLoading ? '...' : (data?.averageScore?.toFixed(1) || '0.0')}</span>
    </button>
  );
}

export default function DoctorsPage() {

  const [globalFilter, setGlobalFilter] = useState("")
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
    
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    if (password && password.length < 8) {
      setValidationErrors({
        Password: ["Password must be at least 8 characters."]
      });
      return;
    }

    if (password && password !== confirmPassword) {
      setValidationErrors({
        ConfirmPassword: ["Passwords do not match."]
      });
      return;
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
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {row.original.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-zinc-900">{row.original.name}</div>
            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3 h-3" /> {row.original.specialization}
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
            <div className="text-sm font-medium text-zinc-700">{row.original.mobile ? `${row.original.mobileDialCode || ''} ${row.original.mobile}` : 'N/A'}</div>
            <div className="text-xs text-zinc-500">{row.original.emailId || 'N/A'}</div>
          </div>
        )
    },
    {
      accessorKey: "qualification",
      header: "Qualification",
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-zinc-700">{row.original.qualification || 'N/A'}</div>
          <div className="text-xs text-zinc-500">{row.original.experience ? `${row.original.experience} Exp.` : 'N/A'}</div>
        </div>
      )
    },
    {
      accessorKey: "registrationNumber",
      header: "Reg. No.",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium">
          {row.original.registrationNumber || 'N/A'}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedDoctorForFeedbacks(row.original); setIsFeedbacksDrawerOpen(true); }}
            className="p-2 text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="View Feedbacks"
          >
            <Star className="w-4 h-4" />
          </button>
          {can('Doctors.Edit') && (
            <>
              <button
                onClick={() => { setEditingDoctor(row.original); setIsDrawerOpen(true); }}
                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Doctor"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setValidationErrors({}); setResettingDoctor(row.original); }}
                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
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
              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Doctor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ], [setEditingDoctor, setIsDrawerOpen, deleteMutation])

  const tableData = useMemo(() => doctors || [], [doctors])

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
      <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
        <AlertCircle className="w-6 h-6" />
        <div>
          <h3 className="font-semibold">Failed to load doctors</h3>
          <p className="text-sm opacity-90">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 mb-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Doctors</span>
              <span className="text-indigo-600">Directory</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage doctors, their specializations, and consultation fees.</p>
          </div>
        </div>

      </div>
      {/* Main Card */}
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
                placeholder="Search doctors..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="saas-input w-full" style={{ paddingLeft: "2.5rem" }}
              />
            </div>

            {can('Doctors.Add') && (
              <button
                onClick={() => {
                  setEditingDoctor(null)
                  setIsDrawerOpen(true)
                }}
                className="btn-primary shrink-0 px-3 sm:px-5"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Doctor</span>
              </button>
            )}
          </div>
        </div>

        {/* Data View */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-6">
          {isLoading ? (
            <PageLoader message="Loading doctors..." minHeight="min-h-[40vh]" />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <div key={row.id} className="group relative bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Header Section */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform shrink-0">
                          {row.original.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{row.original.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                              <Stethoscope className="w-3 h-3" /> {row.original.specialization}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DoctorRatingBadge 
                          doctor={row.original} 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDoctorForFeedbacks(row.original)
                            setIsFeedbacksDrawerOpen(true)
                          }}
                        />
                    </div>

                    {/* Subtext equivalent */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                      {row.original.gender && (
                        <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                          <User className="w-3.5 h-3.5 text-indigo-500" /> {row.original.gender}
                        </span>
                      )}
                      {row.original.qualification && (
                        <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-500" /> {row.original.qualification}
                        </span>
                      )}
                      {row.original.experience && (
                        <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" /> {row.original.experience}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-4 flex-1 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0"><ShieldCheck className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reg. No</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{row.original.registrationNumber || '--'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0"><Phone className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{row.original.mobile ? `${row.original.mobileDialCode || ''} ${row.original.mobile}` : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0"><Mail className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={row.original.emailId}>{row.original.emailId || '--'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0"><Building2 className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Branches</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={row.original.branchIds?.join(', ')}>{row.original.branchIds?.length ? `${row.original.branchIds.length} Branches` : 'None'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 mt-auto">
                    {can('Doctors.Edit') && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingDoctor(row.original)
                            setIsDrawerOpen(true)
                          }}
                          className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setValidationErrors({}); setResettingDoctor(row.original); }}
                          className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" /> Reset
                        </button>
                      </>
                    )}
                    {can('Doctors.Delete') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Are you sure you want to delete this doctor?')) {
                            deleteMutation.mutate(row.original.id)
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center">
                  <Stethoscope className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-lg font-bold text-slate-900">No doctors found</p>
                  <p className="text-sm mt-1">Try adjusting your search query.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
            <div className="overflow-x-auto bg-white rounded-b-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <Stethoscope className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-lg font-bold text-slate-800">No doctors found</p>
                          <p className="text-sm mt-1">Try adjusting your search query.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-sm text-zinc-500 bg-zinc-50/50">
          <div>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, doctors?.length || 0)} of {doctors?.length || 0} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
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
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm">
                    {editingDoctor ? <Edit className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingDoctor ? 'Edit' : 'Add'}</span>
                      <span className="text-indigo-600">{editingDoctor ? '' : 'New'} Doctor</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{editingDoctor ? 'Update doctor profile and settings.' : 'Enroll a new clinical staff member.'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsDrawerOpen(false); setEditingDoctor(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form noValidate autoComplete="off" id="doctor-form" onSubmit={handleSubmit} className="space-y-6">
                  <ApiErrorAlert error={apiError} />
                  
                    {/* Section 1: Personal Details */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Personal Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <User className="w-4 h-4 text-blue-500" /> Full Name
                          </label>
                          <input autoComplete="off" name="name" defaultValue={editingDoctor?.name} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Dr. John Doe" />
                          <FieldError errors={validationErrors} field="Name" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Users className="w-4 h-4 text-pink-500" /> Gender
                          </label>
                          <select name="gender" defaultValue={editingDoctor?.gender ? editingDoctor.gender.charAt(0).toUpperCase() + editingDoctor.gender.slice(1).toLowerCase() : ""} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
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
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Contact & Login Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Phone className="w-4 h-4 text-green-500" /> Mobile
                          </label>
                          <PhoneInput
                            name="mobile"
                            dialCodeName="mobileDialCode"
                            defaultValue={editingDoctor?.mobile?.replace(/^\+\d+/, '') || editingDoctor?.mobile}
                            defaultDialCode={editingDoctor?.mobileDialCode || '+91'}
                          />
                          <FieldError errors={validationErrors} field="Mobile" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Mail className="w-4 h-4 text-rose-500" /> Email
                          </label>
                          <input autoComplete="off" name="emailId" type="email" defaultValue={editingDoctor?.emailId} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="doctor@example.com" />
                          <FieldError errors={validationErrors} field="EmailId" />
                        </div>
                        {!editingDoctor && (
<>
<div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <ShieldCheck className="w-4 h-4 text-slate-500" /> Password (Login)
                          </label>
                          <Input autoComplete="new-password" name="password" type="password" className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder={editingDoctor ? "Leave blank if unchanged" : "••••••••"} />
                          <FieldError errors={validationErrors} field="Password" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <ShieldCheck className="w-4 h-4 text-slate-500" /> Confirm Password
                          </label>
                          <Input autoComplete="new-password" name="confirmPassword" type="password" className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="••••••••" />
                          <FieldError errors={validationErrors} field="ConfirmPassword" />
                        </div>
</>
)}
                      </div>
                    </div>

                    {/* Section 3: Qualification Details */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Qualification Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Stethoscope className="w-4 h-4 text-indigo-500" /> Specialization
                          </label>
                          <input autoComplete="off" name="specialization" defaultValue={editingDoctor?.specialization} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Cardiologist" />
                          <FieldError errors={validationErrors} field="Specialization" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <GraduationCap className="w-4 h-4 text-purple-500" /> Qualification
                          </label>
                          <input autoComplete="off" name="qualification" defaultValue={editingDoctor?.qualification} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="MBBS, MD" />
                          <FieldError errors={validationErrors} field="Qualification" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Clock className="w-4 h-4 text-amber-500" /> Experience (Yrs)
                          </label>
                          <input autoComplete="off" name="experience" defaultValue={editingDoctor?.experience} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="5 Years" />
                          <FieldError errors={validationErrors} field="Experience" />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <ShieldCheck className="w-4 h-4 text-teal-500" /> Registration No.
                          </label>
                          <input autoComplete="off" name="registrationNumber" defaultValue={editingDoctor?.registrationNumber} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="MCI-12345" />
                          <FieldError errors={validationErrors} field="RegistrationNumber" />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Assigned Branches */}
                    <div>
                      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Assigned Branches</h3>
                      <div>
                        {!branches ? (
                          <div className="text-sm text-zinc-500">Loading branches...</div>
                        ) : branches.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {branches.map((branch: any) => (
                              <label key={branch.id} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  name="branchIds"
                                  value={branch.id}
                                  defaultChecked={editingDoctor?.branchIds?.some((id: string) => id.toLowerCase() === branch.id.toLowerCase())}
                                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                {branch.name}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-amber-600">No branches found. Please create a branch first.</div>
                        )}
                        <FieldError errors={validationErrors} field="BranchIds" />
                      </div>
                    </div>
                </form>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); setEditingDoctor(null); }}
                  className="btn-danger"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="submit"
                  form="doctor-form"
                  disabled={mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingDoctor ? 'Save Changes' : 'Enroll Doctor'}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setValidationErrors({}); setResettingDoctor(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  Reset Password
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Enter a new password for Dr. {resettingDoctor.name}.
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
                  ...resettingDoctor,
                  password: newPassword
                })

              }}>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Key className="w-4 h-4 text-amber-500" /> New Password
                      </label>
                      <Input autoComplete="new-password" name="password" type="password" placeholder="••••••••" className="w-full" />
                      <FieldError errors={validationErrors} field="Password" />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Confirm New Password
                      </label>
                      <Input autoComplete="new-password" name="confirmPassword" type="password" placeholder="••••••••" className="w-full" />
                      <FieldError errors={validationErrors} field="ConfirmPassword" />
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
                    <button type="button" onClick={() => { setValidationErrors({}); setResettingDoctor(null); }} className="btn-danger flex items-center gap-1.5">
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
