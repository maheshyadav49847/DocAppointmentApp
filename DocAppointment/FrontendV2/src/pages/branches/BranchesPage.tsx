import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import PhoneInput from "@/components/PhoneInput"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table"
import type { ColumnDef, PaginationState } from "@tanstack/react-table"
import {
  Building2, MapPin, Smartphone, Activity, ArrowRight,
  Edit, Trash2, Plus, X, Search, MessageSquare,
  LayoutGrid, List, Save, Image, Send
} from "lucide-react"
import toast from "react-hot-toast"

import { branchService } from "@/services/branchService"

import { PageLoader } from "@/components/ui/PageLoader"
import { useAuthStore } from "@/store/authStore"
import WhatsAppConfigModal from "./components/WhatsAppConfigModal"
import TelegramConfigModal from "./components/TelegramConfigModal"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"
import { handleApiError } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"

export default function BranchesPage() {
  const { user, setBranch: setAuthBranch, activeBranchId, setActiveBranchId } = useAuthStore()
  const { can } = usePermissions()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const currentBranchId = activeBranchId || user?.branchId

  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [whatsappConfigBranch, setWhatsappConfigBranch] = useState<any>(null)
  const [telegramConfigBranch, setTelegramConfigBranch] = useState<any>(null)
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => branchService.createBranch({ ...data, organizationId: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setIsDrawerOpen(false)
      setValidationErrors({})
      setApiError(null)
      toast.success("Branch created successfully")
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) setValidationErrors(error.response.data.errors)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => branchService.updateBranch(editingBranch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setIsDrawerOpen(false)
      setEditingBranch(null)
      setValidationErrors({})
      setApiError(null)
      toast.success("Branch updated successfully")
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) setValidationErrors(error.response.data.errors)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success("Branch deleted successfully")
    },
    onError: (error: any) => {
      handleApiError(error, "Failed to delete branch")
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      address: formData.get('address'),
      whatsAppNumber: formData.get('whatsAppNumber'),
      whatsAppDialCode: formData.get('whatsAppDialCode'),
      timezone: formData.get('timezone'),
      isActive: formData.get('isActive') === 'on',
      logoBase64
    }
    if (editingBranch) updateMutation.mutate({ ...editingBranch, ...data })
    else createMutation.mutate(data)
  }

  const handleSwitchBranch = (id: string) => {
    setAuthBranch(id)
    setActiveBranchId(id)
  }

  const filteredBranches = useMemo(() => {
    return branches?.filter((b: any) =>
      (b.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (b.address?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    ) || []
  }, [branches, searchQuery])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: "Branch",
      cell: ({ row }) => {
        const branch = row.original
        const isActiveContext = branch.id === currentBranchId
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${isActiveContext ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                {branch.name}
                {isActiveContext && <span className="bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Active Context</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${branch.isActive ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                <span className="text-xs font-medium text-slate-500">{branch.isActive ? 'Online & Accepting Bookings' : 'Offline'}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => {
        const branch = row.original
        return (
          <div className="flex flex-col gap-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[200px]" title={branch.address}>{branch.address || 'No address'}</span>
            </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>{branch.whatsAppNumber ? `${branch.whatsAppDialCode || ''} ${branch.whatsAppNumber}` : 'Not configured'}</span>
              </div>
          </div>
        )
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const branch = row.original
        const isActiveContext = branch.id === currentBranchId
        return (
          <div className="flex items-center gap-2">
            {!isActiveContext && (
              <button
                onClick={() => handleSwitchBranch(branch.id)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3" /> Switch Context
              </button>
            )}
            {can('Branches.Edit') && (
              <>
                <button
                  onClick={() => { setEditingBranch(branch); setLogoBase64(branch.logoBase64 || ''); setIsDrawerOpen(true); }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                  title="Edit Facility"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setWhatsappConfigBranch(branch) }}
                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                  title="WhatsApp Configuration"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setTelegramConfigBranch(branch) }}
                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-100"
                  title="Telegram Configuration"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
            {can('Branches.Delete') && (
              <button
                onClick={() => {
                  if (confirm('Delete this facility?')) deleteMutation.mutate(branch.id)
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                title="Delete Facility"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      }
    }
  ], [currentBranchId, role])

  const table = useReactTable({
    data: filteredBranches,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Branch</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage physical locations and organizational units.</p>
          </div>
        </div>
      </div>

      <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
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
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto order-1 lg:order-2">
            <div className="relative flex-1 sm:w-64 lg:w-64 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="saas-input w-full" style={{ paddingLeft: "2.5rem" }}
              />
            </div>
            {can('Branches.Add') && (
              <button
                onClick={() => { setEditingBranch(null); setIsDrawerOpen(true) }}
                className="btn-primary shrink-0 px-3 sm:px-5"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Branch</span>
              </button>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-slate-50/50 flex-1 overflow-auto">
          {isLoading ? (
            <PageLoader message="Loading branches..." minHeight="min-h-[20vh]" />
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Branches Found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or add a new facility.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white sm:rounded-b-xl sm:border border-slate-200 shadow-sm">
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
                const branch = row.original
                const isActiveContext = branch.id === currentBranchId
                return (
                  <div key={branch.id} className={`bg-white rounded-xl border ${isActiveContext ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10' : 'border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1'} p-5 transition-all duration-300 group relative overflow-hidden flex flex-col`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 transition-opacity ${isActiveContext ? 'bg-indigo-400' : 'bg-slate-200 group-hover:bg-indigo-200'}`}></div>
                    {isActiveContext && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl shadow-sm z-10">
                        Active Context
                      </div>
                    )}
                    <div className="flex items-start gap-4 mb-5 relative z-10">
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform duration-300 group-hover:scale-105 ${isActiveContext ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md shadow-indigo-500/20' : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 text-slate-600 group-hover:border-indigo-200 group-hover:text-indigo-600'}`}>
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{branch.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            {branch.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${branch.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          </span>
                          <span className={`text-xs font-semibold ${branch.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>{branch.isActive ? 'Online & Booking' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 mb-6 flex-1 relative z-10 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-start gap-3 text-sm text-slate-700">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-indigo-500 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="line-clamp-2 mt-1 font-medium">{branch.address || 'No address provided'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-green-500 shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{branch.whatsAppNumber ? `${branch.whatsAppDialCode || ''} ${branch.whatsAppNumber}` : 'Not configured'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100 relative z-10">
                      {!isActiveContext ? (
                        <button
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="flex-1 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          <ArrowRight className="w-4 h-4" /> Switch
                        </button>
                  ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm font-bold cursor-default">
                          <Activity className="w-4 h-4" /> Managing Now
                        </div>
                      )}
                      {can('Branches.Edit') && (
                        <>
                          <button
                            onClick={() => { setEditingBranch(branch); setLogoBase64(branch.logoBase64 || ''); setIsDrawerOpen(true); }}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 bg-slate-50 hover:shadow-sm"
                            title="Edit Facility"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => { setWhatsappConfigBranch(branch) }}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 bg-slate-50 hover:shadow-sm"
                            title="WhatsApp Configuration"
                          >
                            <MessageSquare className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => { setTelegramConfigBranch(branch) }}
                            className="p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-100 bg-slate-50 hover:shadow-sm"
                            title="Telegram Configuration"
                          >
                            <Send className="w-4.5 h-4.5" />
                          </button>
                        </>
                      )}
                      {can('Branches.Delete') && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this facility?')) deleteMutation.mutate(branch.id)
                          }}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 bg-slate-50 hover:shadow-sm"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <div className="font-medium">
            Showing {table.getRowModel().rows.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, filteredBranches.length)} of {filteredBranches.length} entries
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

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); setLogoBase64(''); setApiError(null); setValidationErrors({}); }}
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
                    {editingBranch ? <Edit className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingBranch ? 'Edit' : 'Add'}</span>
                      <span className="text-indigo-600">{editingBranch ? '' : 'New '}Branch</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{editingBranch ? 'Update facility details.' : 'Register a new branch location.'}</p>
                  </div>
                </div>
                <button onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); setLogoBase64(''); setApiError(null); setValidationErrors({}); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form noValidate autoComplete="off" id="branch-form" onSubmit={handleSubmit} className="space-y-5">
                  <ApiErrorAlert error={apiError} />
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Building2 className="w-4 h-4 text-indigo-500" /> Facility Name
                    </label>
                    <input autoComplete="off" name="name" defaultValue={editingBranch?.name} placeholder="e.g. South Extension Clinic" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <FieldError errors={validationErrors} field="Name" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Image className="w-4 h-4 text-purple-500" /> Branch Logo
                    </label>
                    <div className="flex items-center gap-4">
                      {logoBase64 && (
                        <img src={logoBase64} alt="Logo" className="w-12 h-12 rounded object-contain bg-slate-100 border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setLogoBase64(reader.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setLogoBase64('');
                          }
                        }}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <MapPin className="w-4 h-4 text-rose-500" /> Physical Address
                    </label>
                    <textarea autoComplete="off" rows={3} name="address" defaultValue={editingBranch?.address} placeholder="Enter full address" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    <FieldError errors={validationErrors} field="Address" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Smartphone className="w-4 h-4 text-green-500" /> WhatsApp Number
                    </label>
                    <PhoneInput
                      name="whatsAppNumber"
                      dialCodeName="whatsAppDialCode"
                      defaultValue={editingBranch?.whatsAppNumber?.replace(/^\+\d+/, '') || editingBranch?.whatsAppNumber}
                      defaultDialCode={editingBranch?.whatsAppDialCode || '+91'}
                    />
                    <FieldError errors={validationErrors} field="WhatsAppNumber" />
                    <p className="text-xs text-slate-500 mt-1">Include country code. Used for automated bot communications.</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Activity className="w-4 h-4 text-cyan-500" /> Timezone
                    </label>
                    <select name="timezone" defaultValue={editingBranch?.timezone || "Asia/Kolkata"} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="Asia/Kolkata">India Standard Time (IST)</option>
                      <option value="UTC">UTC (Universal Time)</option>
                      <option value="America/New_York">Eastern Standard Time (EST)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT/BST)</option>
                      <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                      <option value="Asia/Singapore">Singapore Standard Time (SGT)</option>
                    </select>
                    <FieldError errors={validationErrors} field="Timezone" />
                    <p className="text-xs text-slate-500 mt-1">Used for accurate queue resets and WhatsApp reminder scheduling.</p>
                  </div>
                  {editingBranch && (
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input autoComplete="off" type="checkbox" name="isActive" defaultChecked={editingBranch?.isActive} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                      <div className="flex-1">
                        <span className="block text-sm font-medium text-zinc-900">Active Status</span>
                        <span className="block text-xs text-slate-500">Allow new bookings for this location</span>
                      </div>
                    </label>
                  )}
                </form>
              </div>

              <div className="p-6 border-t bg-white flex justify-end gap-3">
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); setLogoBase64(''); }} className="btn-danger"><X className="w-4 h-4" /> Cancel</button>
                <button type="submit" form="branch-form" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingBranch ? 'Save Changes' : 'Create Facility'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* WhatsApp Configuration Modal */}
      {whatsappConfigBranch && (
        <WhatsAppConfigModal
          branch={whatsappConfigBranch}
          onClose={() => setWhatsappConfigBranch(null)}
        />
      )}

      {/* Telegram Configuration Modal */}
      {telegramConfigBranch && (
        <TelegramConfigModal
          branch={telegramConfigBranch}
          onClose={() => setTelegramConfigBranch(null)}
        />
      )}
    </div>
  )
}
