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
  Building2, MapPin, Smartphone, Activity, ArrowRight,
  Edit, Trash2, Plus, X, Search, MessageSquare,
  LayoutGrid, List, Save
} from "lucide-react"

import { branchService } from "@/services/branchService"
import { useAuthStore } from "@/store/authStore"
import WhatsAppConfigModal from "./components/WhatsAppConfigModal"

export default function BranchesPage() {
  const { user, setBranch: setAuthBranch, activeBranchId, setActiveBranchId } = useAuthStore()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const currentBranchId = activeBranchId || user?.branchId

  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [whatsappConfigBranch, setWhatsappConfigBranch] = useState<any>(null)
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
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => branchService.updateBranch(editingBranch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setIsDrawerOpen(false)
      setEditingBranch(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] })
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      address: formData.get('address'),
      whatsAppNumber: formData.get('whatsAppNumber'),
      isActive: formData.get('isActive') === 'on'
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
              <span>{branch.whatsAppNumber || 'Not configured'}</span>
            </div>
          </div>
        )
      }
    },
    {
      id: "actions",
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
            <button
              onClick={() => { setEditingBranch(branch); setIsDrawerOpen(true); }}
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
            {['orgadmin', 'superadmin'].includes(role) && (
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
    <div className="animate-in fade-in duration-500 pb-12 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Branches</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage physical locations and branch-specific configurations.</p>
          </div>
        </div>
      </div>

      <div className="saas-card overflow-hidden flex flex-col">
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
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              onClick={() => { setEditingBranch(null); setIsDrawerOpen(true); }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="p-0 sm:p-6 bg-slate-50/50">
          {/* Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Branches Found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or add a new facility.</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {table.getRowModel().rows.map((row) => {
                const branch = row.original
                const isActiveContext = branch.id === currentBranchId
                return (
                  <div key={branch.id} className={`bg-white rounded-xl border ${isActiveContext ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md'} p-5 transition-all group relative overflow-hidden flex flex-col`}>

                    {isActiveContext && (
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg z-10">
                        Active Context
                      </div>
                    )}

                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${isActiveContext ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{branch.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                          <span className="text-xs font-medium text-slate-500">{branch.isActive ? 'Online & Accepting Bookings' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{branch.address || 'No address provided'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{branch.whatsAppNumber || 'Not configured'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                      {!isActiveContext ? (
                        <button
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="btn-primary flex-1 justify-center"
                        >
                          <ArrowRight className="w-4 h-4" /> Switch to Context
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-400 px-3 py-2 rounded-lg text-sm font-semibold cursor-default">
                          <Activity className="w-4 h-4" /> Managing Now
                        </div>
                      )}

                      <button
                        onClick={() => { setEditingBranch(branch); setIsDrawerOpen(true); }}
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

                      {['orgadmin', 'superadmin'].includes(role) && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this facility?')) deleteMutation.mutate(branch.id)
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Branch Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); }}
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
                <button onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="branch-form" onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Building2 className="w-4 h-4 text-indigo-500" /> Facility Name
                    </label>
                    <input required name="name" defaultValue={editingBranch?.name} placeholder="e.g. South Extension Clinic" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <MapPin className="w-4 h-4 text-rose-500" /> Physical Address
                    </label>
                    <textarea required rows={3} name="address" defaultValue={editingBranch?.address} placeholder="Enter full address" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Smartphone className="w-4 h-4 text-green-500" /> WhatsApp Number
                    </label>
                    <input name="whatsAppNumber" defaultValue={editingBranch?.whatsAppNumber} placeholder="e.g. +1234567890" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-slate-500 mt-1">Include country code. Used for automated bot communications.</p>
                  </div>
                  {editingBranch && (
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input type="checkbox" name="isActive" defaultChecked={editingBranch?.isActive} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                      <div className="flex-1">
                        <span className="block text-sm font-medium text-zinc-900">Active Status</span>
                        <span className="block text-xs text-slate-500">Allow new bookings for this location</span>
                      </div>
                    </label>
                  )}
                </form>
              </div>

              <div className="p-6 border-t bg-white flex justify-end gap-3">
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); }} className="btn-danger"><X className="w-4 h-4" /> Cancel</button>
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
    </div>
  )
}
