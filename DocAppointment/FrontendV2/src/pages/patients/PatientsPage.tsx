import React, { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  Users, Plus, Search, ChevronLeft, ChevronRight, AlertCircle,
  Phone, Hash, Droplets, User, Calendar, X, Activity, Save, Stethoscope, Edit, LayoutGrid, List, Ruler, FileText, Mail, MapPin, HeartPulse, UserPlus, Droplet, Building2
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { patientService } from "@/services/patientService"
import type { Patient } from "@/services/patientService"
import { branchService } from "@/services/branchService"
import { useAuthStore } from "@/store/authStore"

export default function PatientsPage() {
  const { user, activeBranchId, setActiveBranchId } = useAuthStore()
  const selectedBranch = activeBranchId || 'all'
  const [globalFilter, setGlobalFilter] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Server-side pagination state
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      await patientService.createPatient(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setIsDrawerOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      await patientService.updatePatientProfile(editingPatient!.id, { ...data, id: editingPatient!.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setIsDrawerOpen(false)
      setEditingPatient(null)
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      age: formData.get('age') as string,
      gender: formData.get('gender') as string,
      bloodGroup: formData.get('bloodGroup') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      preExistingConditions: formData.get('preExistingConditions') as string,
      height: parseInt(formData.get('height') as string) || 0,
      emergencyContactName: formData.get('emergencyContactName') as string,
      emergencyContactPhone: formData.get('emergencyContactPhone') as string,
      organizationId: user?.orgId!,
      branchId: (selectedBranch === 'all' ? undefined : selectedBranch) as string | undefined
    }
    if (editingPatient) {
      updateMutation.mutate(data)
    } else {
      mutation.mutate(data)
    }
  }

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(globalFilter)
      setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page on search
    }, 400)
    return () => clearTimeout(handler)
  }, [globalFilter])

  const { data: branches } = useQuery({
    queryKey: ['branches', user?.orgId],
    queryFn: () => branchService.getBranches(user?.orgId!),
    enabled: !!user?.orgId && user?.role === 'OrgAdmin'
  })

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['patients', selectedBranch, pageIndex, pageSize, debouncedSearch],
    queryFn: () => patientService.getPatients(selectedBranch, pageIndex + 1, pageSize, debouncedSearch),
    enabled: !!user?.orgId
  })

  const patients = useMemo(() => paginatedData?.data || [], [paginatedData?.data])
  const totalCount = paginatedData?.totalCount || 0
  const totalPages = paginatedData?.totalPages || 0

  const columns = useMemo<ColumnDef<Patient>[]>(() => [
    {
      accessorKey: "patientCode",
      header: "Patient ID",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
          <Hash className="w-3 h-3 text-slate-400" /> {row.original.patientCode || 'PT-' + row.original.id.substring(0, 6)}
        </span>
      )
    },
    {
      accessorKey: "name",
      header: "Patient Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {row.original.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-800">{row.original.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {row.original.gender || 'N/A'}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> {Number(row.original.age) > 0 ? `${row.original.age} Yrs` : 'N/A'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Phone className="w-4 h-4 text-slate-400" />
          {row.original.phone || 'N/A'}
        </div>
      )
    },
    {
      accessorKey: "bloodGroup",
      header: "Blood Group",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100/50">
          <Droplets className="w-3 h-3 text-rose-500" /> {row.original.bloodGroup || 'Unknown'}
        </span>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setEditingPatient(row.original)
              setIsDrawerOpen(true)
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/consult/${row.original.id}`)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Consult"
          >
            <Stethoscope className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [navigate, setEditingPatient, setIsDrawerOpen])

  const table = useReactTable({
    data: patients,
    columns,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex, pageSize },
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
        <AlertCircle className="w-6 h-6" />
        <div>
          <h3 className="font-semibold">Failed to load patients</h3>
          <p className="text-sm opacity-90">Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Patient</span>
              <span className="text-indigo-600">Directory</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage registered patients and clinical records.</p>
          </div>
        </div>

        {user?.role === 'OrgAdmin' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full pr-1 flex items-center justify-end gap-1"><Building2 className="w-3 h-3 text-indigo-400" /> Branch Location</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setActiveBranchId(e.target.value === 'all' ? null : e.target.value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all hover:border-indigo-300"
            >
              <option value="all">All Branches</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="saas-card overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left Side: View Toggles & Row Count */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
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
                placeholder="Search patients by name or phone..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="saas-input w-full" style={{ paddingLeft: "2.5rem" }}
              />
            </div>

            <button
              onClick={() => {
                setEditingPatient(null)
                setIsDrawerOpen(true)
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Register Patient
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="p-0 sm:p-6 bg-slate-50/50 flex-1 overflow-auto">
          {viewMode === 'table' ? (
            <div className="bg-white sm:rounded-xl sm:border border-slate-200 shadow-sm relative">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 sm:-top-6 z-20 shadow-sm outline outline-1 outline-slate-200">
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
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-100 animate-pulse rounded-md" /></td>
                        <td className="px-6 py-4"><div className="h-10 w-48 bg-slate-100 animate-pulse rounded-lg" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 animate-pulse rounded-md" /></td>
                        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 animate-pulse rounded-md" /></td>
                        <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" /></td>
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length > 0 ? (
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
                          <Users className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-lg font-bold text-slate-800">No patients found</p>
                          <p className="text-sm mt-1">Try adjusting your search query.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-slate-100 rounded w-1/2" />
                          <div className="h-3 bg-slate-100 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between">
                        <div className="h-8 bg-slate-100 rounded w-20" />
                        <div className="h-8 bg-slate-100 rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : patients.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {patients.map(patient => (
                    <div key={patient.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                      {/* Header Section */}
                      <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{patient.name}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Active
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subtext equivalent */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                          <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                            <User className="w-3.5 h-3.5 text-indigo-500" /> {patient.gender || 'Unk'}
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" /> {patient.age ? `${patient.age} Yrs` : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-100/50 text-rose-700 px-2 py-1 rounded-md">
                            <Droplets className="w-3.5 h-3.5 text-rose-500" /> {patient.bloodGroup || '--'}
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 px-2 py-1 rounded-md">
                            <Ruler className="w-3.5 h-3.5 text-emerald-500" /> {patient.height ? `${patient.height} cm` : '--'}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-4 flex-1 bg-white">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0"><Hash className="w-4 h-4" /></div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Patient ID</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{patient.patientCode || 'PT-' + patient.id.substring(0, 6)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0"><Phone className="w-4 h-4" /></div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{patient.phone || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0"><FileText className="w-4 h-4" /></div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address</p>
                            <p className="text-xs font-semibold text-slate-700 truncate" title={patient.address}>{patient.address || '--'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0"><Phone className="w-4 h-4" /></div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emergency</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{patient.emergencyContactPhone || '--'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 mt-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPatient(patient)
                            setIsDrawerOpen(true)
                          }}
                          className="flex-1 btn-secondary text-xs px-3"
                        >
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/consult/` + patient.id)
                          }}
                          className="flex-1 btn-primary text-xs px-3"
                        >
                          <Stethoscope className="w-4 h-4" />
                          Consult
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">No patients found</h3>
                  <p className="text-slate-500">Try adjusting your search or register a new patient.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Server-Side Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <div className="font-medium">
            Showing {patients.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-2 font-medium">Page {pageIndex + 1} of {table.getPageCount() || 1}</span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Slide-over Drawer for Register Patient */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
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
                    {editingPatient ? <Edit className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingPatient ? 'Edit' : 'Register'}</span>
                      <span className="text-indigo-600">{editingPatient ? 'Patient Record' : 'New Patient'}</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{editingPatient ? 'Update patient clinical and contact details.' : 'Enter details to create a new patient record.'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="patient-form" onSubmit={handleSubmit} className="space-y-6">

                  {/* Section 1: Personal Info */}
                  <div>
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Personal Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <User className="w-4 h-4 text-blue-500" /> Full Name
                        </label>
                        <input defaultValue={editingPatient?.name} required name="name" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. John Doe" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Calendar className="w-4 h-4 text-orange-500" /> Age
                          </label>
                          <input defaultValue={editingPatient?.age || ''} required type="number" name="age" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. 30" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Users className="w-4 h-4 text-pink-500" /> Gender
                          </label>
                          <select defaultValue={editingPatient?.gender} required name="gender" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Droplet className="w-4 h-4 text-red-500" /> Blood Group
                          </label>
                          <select defaultValue={editingPatient?.bloodGroup} required name="bloodGroup" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`}>
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Ruler className="w-4 h-4 text-teal-500" /> Height (cm) <span className="text-zinc-400 font-normal ml-1">Opt</span>
                          </label>
                          <input defaultValue={editingPatient?.height || ''} type="number" name="height" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. 175" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Details */}
                  <div>
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Contact Details</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Phone className="w-4 h-4 text-green-500" /> Phone Number
                          </label>
                          <input defaultValue={editingPatient?.phone} required name="phone" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. 9876543210" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Mail className="w-4 h-4 text-indigo-500" /> Email <span className="text-zinc-400 font-normal ml-1">Opt</span>
                          </label>
                          <input defaultValue={editingPatient?.email} type="email" name="email" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="pt@example.com" />
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <MapPin className="w-4 h-4 text-rose-500" /> Address <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <textarea defaultValue={editingPatient?.address} name="address" rows={2} className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none bg-white`} placeholder="Enter full address"></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Clinical & Emergency */}
                  <div>
                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Clinical & Emergency</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <HeartPulse className="w-4 h-4 text-rose-500" /> Pre-existing Conditions <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <input defaultValue={editingPatient?.preExistingConditions} name="preExistingConditions" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. Diabetes, Hypertension" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <UserPlus className="w-4 h-4 text-emerald-500" /> Emerg. Contact <span className="text-zinc-400 font-normal ml-1">Opt</span>
                          </label>
                          <input defaultValue={editingPatient?.emergencyContactName} name="emergencyContactName" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="Relative's Name" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                            <Phone className="w-4 h-4 text-red-500" /> Emerg. Phone <span className="text-zinc-400 font-normal ml-1">Opt</span>
                          </label>
                          <input defaultValue={editingPatient?.emergencyContactPhone} name="emergencyContactPhone" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="Phone Number" />
                        </div>
                      </div>
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="btn-danger"
                >
                  <X className="w-4 h-4" /> {editingPatient ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  form="patient-form"
                  disabled={mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingPatient ? 'Save Changes' : 'Register Patient'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
