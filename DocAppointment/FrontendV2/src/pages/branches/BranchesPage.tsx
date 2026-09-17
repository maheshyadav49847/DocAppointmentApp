import React, { useState, useMemo, useEffect } from "react"
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
  Building2, MapPin, Smartphone, Activity, ArrowRight, ArrowRightLeft,
  Edit, PlusCircle, X, Search, MessageSquare,
  LayoutGrid, List, Save, Image, Send, Lock,
  Radio, Globe, AlertOctagon, BookOpen
} from "lucide-react"
import toast from "react-hot-toast"

import { branchService } from "@/services/branchService"
import type { Branch } from "@/services/branchService"

import { PageLoader } from "@/components/ui/PageLoader"
import { useAuthStore } from "@/store/authStore"
import WhatsAppConfigModal from "./components/WhatsAppConfigModal"
import TelegramConfigModal from "./components/TelegramConfigModal"
import BranchClosureModal from "./components/BranchClosureModal"
import BranchConfigGuideModal from "./components/BranchConfigGuideModal"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"
import { usePermissions } from "@/hooks/usePermissions"
import { DataTablePagination } from "@/components/ui/DataTablePagination"

export default function BranchesPage() {
  const { user, setBranch: setAuthBranch, activeBranchId, setActiveBranchId } = useAuthStore()
  const { can } = usePermissions()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const currentBranchId = activeBranchId || user?.branchId

  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [guideChannel, setGuideChannel] = useState<'whatsapp' | 'telegram' | 'all'>('all')
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [closureBranch, setClosureBranch] = useState<Branch | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [whatsappConfigBranch, setWhatsappConfigBranch] = useState<Branch | null>(null)
  const [telegramConfigBranch, setTelegramConfigBranch] = useState<Branch | null>(null)
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    const handleOpenGuide = (e: any) => {
      const ch = e.detail?.channel || e.detail?.tab || 'all'
      setGuideChannel(ch)
      setIsGuideOpen(true)
    }
    window.addEventListener('open-branch-guide', handleOpenGuide)
    return () => window.removeEventListener('open-branch-guide', handleOpenGuide)
  }, [])

  const { data: branches, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId && orgId !== 'undefined',
    refetchOnWindowFocus: false,
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    
    const errors: Record<string, string[]> = {}
    if (!formData.get('name')) errors.Name = ["Branch Name is required."]
    if (!formData.get('address')) errors.Address = ["Address is required."]
    if (!formData.get('whatsAppNumber')) errors.WhatsAppNumber = ["WhatsApp Number is required."]
    if (!logoBase64 && !editingBranch) errors.LogoBase64 = ["Branch Logo is required."]

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const statusValue = editingBranch ? (formData.get('status') as string || 'Active') : 'Active'
    const data = {
      name: formData.get('name'),
      address: formData.get('address'),
      whatsAppNumber: formData.get('whatsAppNumber'),
      whatsAppDialCode: formData.get('whatsAppDialCode'),
      timezone: formData.get('timezone'),
      status: statusValue,
      isActive: statusValue === 'Active',
      logoBase64
    }
    if (editingBranch) updateMutation.mutate({ ...editingBranch, ...data })
    else createMutation.mutate(data)
  }

  const handleSwitchBranch = (id: string) => {
    setAuthBranch(id)
    setActiveBranchId(id)
  }

  const isBranchWhatsAppConfigured = (b: Branch) => {
    // Configured if backend flag is true OR if Meta Phone Number ID is linked OR if provider is explicitly Twilio
    return !!(
      b.isWhatsAppConfigured ||
      b.metaPhoneNumberId ||
      (b.whatsAppProvider === 'Twilio' && b.whatsAppNumber)
    )
  }

  const isBranchTelegramConfigured = (b: Branch) => {
    return !!(b.isTelegramConfigured || b.telegramBotToken)
  }

  const formatWhatsAppDisplay = (dialCode?: string, number?: string) => {
    if (!number) return 'Not registered'
    const trimmed = number.trim()
    if (trimmed.startsWith('+')) return trimmed
    return `${dialCode || '+91'} ${trimmed}`.trim()
  }

  const stats = useMemo(() => {
    const list: Branch[] = branches || []
    return {
      total: list.length,
      active: list.filter(b => b.status === 'Active').length,
      inactive: list.filter(b => b.status === 'Inactive').length,
      closed: list.filter(b => b.status === 'Closed').length,
      waConnected: list.filter(isBranchWhatsAppConfigured).length,
      telegramConnected: list.filter(isBranchTelegramConfigured).length
    }
  }, [branches])

  const filteredBranches = useMemo(() => {
    return (branches || []).filter((b: Branch) => {
      const matchesSearch =
        (b.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (b.address?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (b.whatsAppNumber || '').includes(searchQuery)
      
      const bStatus = (b.status || (b.isActive ? 'Active' : 'Inactive')).toLowerCase()
      const matchesStatus =
        statusFilter === 'all' ? true : bStatus === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [branches, searchQuery, statusFilter])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: "Branch",
      cell: ({ row }) => {
        const branch: Branch = row.original
        const isActiveContext = branch.id === currentBranchId
        const isClosed = branch.status === 'Closed'
        const isInactive = branch.status === 'Inactive'
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${isActiveContext ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                {branch.name}
                {isActiveContext && <span className="bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">Active Context</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isClosed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Closed
                  </span>
                ) : isInactive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Inactive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                )}
                {isClosed && branch.closureRemark && (
                  <span className="text-xs text-slate-400 italic truncate max-w-[160px]" title={branch.closureRemark}>
                    ({branch.closureRemark})
                  </span>
                )}
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
        const branch: Branch = row.original
        return (
          <div className="flex flex-col gap-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[200px]" title={branch.address}>{branch.address || 'No address'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{branch.whatsAppNumber ? `${branch.whatsAppDialCode || ''} ${branch.whatsAppNumber}` : 'Not configured'}</span>
            </div>
          </div>
        )
      }
    },
    {
      id: "channels",
      header: "Bot Channels",
      cell: ({ row }) => {
        const branch: Branch = row.original
        const hasWhatsApp = isBranchWhatsAppConfigured(branch)
        const hasTelegram = isBranchTelegramConfigured(branch)
        return (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-500">WhatsApp:</span>
              {hasWhatsApp ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                  Not Connected
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-500">Telegram:</span>
              {hasTelegram ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[10px]">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 border border-slate-200 text-[10px]">
                  Unconfigured
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const branch: Branch = row.original
        const isActiveContext = branch.id === currentBranchId
        const isClosed = branch.status === 'Closed'
        return (
          <div className="flex items-center gap-2">
            {!isActiveContext && !isClosed && (
              <button
                onClick={() => handleSwitchBranch(branch.id)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                <ArrowRight className="w-3 h-3" /> Switch
              </button>
            )}
            {can('Branches.Edit') && !isClosed && (
              <>
                <button
                  onClick={() => { setEditingBranch(branch); setLogoBase64(branch.logoBase64 || ''); setIsDrawerOpen(true); }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-transparent hover:border-indigo-100"
                  title="Edit Branch"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setWhatsappConfigBranch(branch) }}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-100"
                  title="WhatsApp Configuration"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setTelegramConfigBranch(branch) }}
                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors border border-transparent hover:border-sky-100"
                  title="Telegram Configuration"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
            {!isClosed && can('Branches.Edit') && (
              <button
                onClick={() => setClosureBranch(branch)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors border border-transparent hover:border-rose-100"
                title="Close Branch Facility"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      }
    }
  ], [currentBranchId, role, can])

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

  // Prevent grid disappearing if pageIndex is out of bounds
  useEffect(() => {
    if (pageIndex > 0 && pageIndex * pageSize >= filteredBranches.length) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [filteredBranches.length, pageIndex, pageSize])

  // Computed branches for grid view - fallback safely so branches never disappear
  const displayBranches = useMemo(() => {
    const rows = table.getRowModel().rows
    if (rows.length > 0) {
      return rows.map(r => r.original as Branch)
    }
    return filteredBranches.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  }, [table.getRowModel().rows, filteredBranches, pageIndex, pageSize])

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Branch</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Physical locations, bot communication channels & facility lifecycle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => { setGuideChannel('all'); setIsGuideOpen(true); }}
            className="btn-secondary h-9 px-3 text-xs flex items-center gap-1.5"
            title="Open step-by-step Bot Setup & Testing Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bot Setup Guide</span>
          </button>
        </div>
      </div>

      {/* Stats / Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Branches */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Facilities</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Registered locations</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Active Locations */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Online</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.active}</h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 mt-0.5 font-medium">Accepting bookings</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* WhatsApp Bot Active */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Bots</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.waConnected} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Configured channels</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Telegram Bot Active */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telegram Bots</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.telegramConnected} <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Live bot tokens</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main SaaS Card with Toolbar and Content */}
      <div className="saas-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full md:w-auto order-2 md:order-1">
            {/* View Mode Toggle */}
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

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Filter by status"
            >
              <option value="all">All Statuses ({stats.total})</option>
              <option value="active">Active Only ({stats.active})</option>
              <option value="inactive">Inactive Only ({stats.inactive})</option>
              <option value="closed">Closed Only ({stats.closed})</option>
            </select>

            {/* Rows Per Page */}
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

          {/* Search Input & Add Branch Button (Exact Same h-9 Height) */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto order-1 md:order-2">
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="search"
                name="branch_search_query"
                id="branch_search_query"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                placeholder="Search by name, address, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="saas-input h-9 w-full text-xs pr-8" style={{ paddingLeft: "2.5rem" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {can('Branches.Add') && (
              <button
                onClick={() => { setEditingBranch(null); setLogoBase64(''); setIsDrawerOpen(true) }}
                className="btn-primary h-9 px-3 sm:px-3.5 text-xs shrink-0 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Branch</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Card or Table Content Area */}
        <div className="p-3 sm:p-4 bg-slate-50/50">
          {isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-rose-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mb-3">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Failed to Load Branches</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to connect to the server. Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs rounded-md border border-indigo-200 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading branches..." minHeight="min-h-[25vh]" />
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-dashed border-slate-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-200 mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Branches Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || statusFilter !== 'all'
                  ? "No facilities match your search query or filter criteria. Try adjusting filters."
                  : "No clinic branch locations have been registered yet."}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto overflow-y-hidden bg-white rounded-lg border border-slate-200 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {displayBranches.map((branch) => {
                const isActiveContext = branch.id === currentBranchId
                const isClosed = branch.status === 'Closed'
                const isInactive = branch.status === 'Inactive'
                const hasWhatsApp = isBranchWhatsAppConfigured(branch)
                const hasTelegram = isBranchTelegramConfigured(branch)

                return (
                  <div
                    key={branch.id}
                    className={`bg-white rounded-lg border transition-all duration-300 flex flex-col group relative overflow-hidden ${
                      isActiveContext
                        ? 'border-slate-200/90 shadow-none'
                        : 'border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-indigo-200/90 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Top Accent Line */}
                    <div className={`h-1 w-full transition-all duration-300 ${
                      isActiveContext
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400'
                        : 'bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-indigo-500'
                    }`} />

                    {/* Card Header Section */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Branch Logo or Building Icon */}
                          <div className="relative shrink-0">
                            {branch.logoBase64 ? (
                              <img
                                src={branch.logoBase64}
                                alt={branch.name}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-contain bg-white border border-slate-200/90 shadow-xs p-1"
                              />
                            ) : (
                              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center border shadow-xs transition-transform duration-300 group-hover:scale-105 ${
                                isActiveContext
                                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                                  : isClosed
                                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                                    : 'bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-white border-indigo-100 text-indigo-600'
                              }`}>
                                <Building2 className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {/* Title & Status Badges */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors break-words" title={branch.name}>
                              {branch.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {/* Operational Status */}
                              {isClosed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Closed
                                </span>
                              ) : isInactive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Inactive
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                </span>
                              )}

                              {/* Timezone Badge */}
                              {branch.timezone && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Globe className="w-3 h-3 text-slate-400" /> {branch.timezone}
                                </span>
                              )}
                            </div>

                            {/* Closure Remark Note */}
                            {isClosed && branch.closureRemark && (
                              <p className="text-[11px] text-rose-600/90 italic font-medium mt-1 break-words" title={branch.closureRemark}>
                                Reason: "{branch.closureRemark}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Active Context Indicator */}
                        {isActiveContext && (
                          <div className="self-start shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-2xs">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
                            </span>
                            <span>Current</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Details Grid */}
                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5 bg-white">
                      {/* Physical Address */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50/80 border border-slate-100 group-hover:border-slate-200/80 transition-colors">
                        <div className="w-5 h-5 rounded-md bg-rose-50 border border-rose-100/60 text-rose-500 flex items-center justify-center shrink-0 shadow-2xs">
                          <MapPin className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-slate-600 font-medium truncate" title={branch.address}>
                          {branch.address || 'No physical address configured'}
                        </span>
                      </div>

                      {/* Communication Channels Overview - Stacked Full Width for Zero Truncation */}
                      <div className="flex flex-col gap-2 pt-0.5">
                        {/* WhatsApp Row */}
                        <div
                          onClick={() => can('Branches.Edit') && !isClosed && setWhatsappConfigBranch(branch)}
                          className={`flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer group/wa ${
                            hasWhatsApp
                              ? 'bg-gradient-to-r from-emerald-50/50 to-white border-emerald-200/90 hover:border-emerald-300 hover:shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-emerald-200 hover:bg-emerald-50/20'
                          }`}
                          title="Click to configure WhatsApp bot"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover/wa:scale-105 ${
                              hasWhatsApp ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <Smartphone className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800">WhatsApp</span>
                              <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                                {hasWhatsApp
                                  ? formatWhatsAppDisplay(branch.whatsAppDialCode, branch.whatsAppNumber)
                                  : (branch.whatsAppNumber ? formatWhatsAppDisplay(branch.whatsAppDialCode, branch.whatsAppNumber) : 'Not configured')}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                            hasWhatsApp
                              ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {hasWhatsApp ? 'Active' : 'Setup →'}
                          </span>
                        </div>

                        {/* Telegram Row */}
                        <div
                          onClick={() => can('Branches.Edit') && !isClosed && setTelegramConfigBranch(branch)}
                          className={`flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer group/tg ${
                            hasTelegram
                              ? 'bg-gradient-to-r from-sky-50/50 to-white border-sky-200/90 hover:border-sky-300 hover:shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-sky-200 hover:bg-sky-50/20'
                          }`}
                          title="Click to configure Telegram bot"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover/tg:scale-105 ${
                              hasTelegram ? 'bg-sky-500 text-white shadow-sky-500/20' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <Send className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800">Telegram</span>
                              <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                                {hasTelegram
                                  ? (branch.telegramBotUsername ? `@${branch.telegramBotUsername}` : 'Bot Active')
                                  : 'Not configured'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                            hasTelegram
                              ? 'bg-sky-100/90 text-sky-800 border-sky-300'
                              : 'bg-slate-200/70 text-slate-600 border-slate-300'
                          }`}>
                            {hasTelegram ? 'Active' : 'Setup →'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {!isActiveContext && !isClosed ? (
                        <button
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5 shadow-xs hover:shadow transition-all active:translate-y-0 shrink-0"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Switch to Branch</span>
                        </button>
                      ) : isActiveContext ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                          <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                          <span>Active Workplace</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md shrink-0">
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                          <span>Permanently Closed</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {can('Branches.Edit') && !isClosed && (
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button
                            onClick={() => { setEditingBranch(branch); setLogoBase64(branch.logoBase64 || ''); setIsDrawerOpen(true); }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all"
                            title="Edit Facility Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setWhatsappConfigBranch(branch)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 border border-slate-200/90 hover:border-emerald-200 shadow-2xs hover:shadow-xs transition-all"
                            title="WhatsApp Bot Configuration"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTelegramConfigBranch(branch)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-500 hover:text-sky-600 bg-white hover:bg-sky-50 border border-slate-200/90 hover:border-sky-200 shadow-2xs hover:shadow-xs transition-all"
                            title="Telegram Bot Configuration"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setClosureBranch(branch)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 shadow-2xs hover:shadow-xs transition-all"
                            title="Close Branch Facility (Audit Dependencies)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Standardized Pagination Footer */}
        <DataTablePagination table={table} totalCount={filteredBranches.length} />
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
                      <Building2 className="w-4 h-4 text-indigo-500" /> Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input required autoComplete="off" name="name" defaultValue={editingBranch?.name} placeholder="e.g. South Extension Clinic" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all" />
                    <FieldError errors={validationErrors} field="Name" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Image className="w-4 h-4 text-purple-500" /> Branch Logo <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      {logoBase64 && (
                        <img src={logoBase64} alt="Logo" className="w-12 h-12 rounded-md object-contain bg-slate-100 border p-1" />
                      )}
                      <input
                        required={!editingBranch && !logoBase64}
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
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none cursor-pointer"
                      />
                    </div>
                    <FieldError errors={validationErrors} field="LogoBase64" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <MapPin className="w-4 h-4 text-rose-500" /> Physical Address <span className="text-red-500">*</span>
                    </label>
                    <textarea required autoComplete="off" rows={3} name="address" defaultValue={editingBranch?.address} placeholder="Enter full physical address" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none text-sm transition-all" />
                    <FieldError errors={validationErrors} field="Address" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Smartphone className="w-4 h-4 text-green-500" /> WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <PhoneInput
                      name="whatsAppNumber"
                      dialCodeName="whatsAppDialCode"
                      defaultValue={editingBranch?.whatsAppNumber?.replace(/^\+\d+/, '') || editingBranch?.whatsAppNumber}
                      defaultDialCode={editingBranch?.whatsAppDialCode || '+91'}
                      required
                    />
                    <FieldError errors={validationErrors} field="WhatsAppNumber" />
                    <p className="text-xs text-slate-500 mt-1">Include country code. Used for automated bot communications.</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Activity className="w-4 h-4 text-cyan-500" /> Timezone
                    </label>
                    <select name="timezone" defaultValue={editingBranch?.timezone || "Asia/Kolkata"} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all">
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
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Activity className="w-4 h-4 text-indigo-500" /> Operational Status
                      </label>
                      <select
                        name="status"
                        defaultValue={editingBranch?.status || (editingBranch?.isActive ? "Active" : "Inactive")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all"
                      >
                        <option value="Active">Active (Operational & Accepting Bookings)</option>
                        <option value="Inactive">Inactive (Temporarily Paused / Offline)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">To permanently close this branch facility, use the Branch Closure workflow.</p>
                      <FieldError errors={validationErrors} field="Status" />
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t bg-white flex justify-end gap-3">
                <button type="button" onClick={() => { setIsDrawerOpen(false); setEditingBranch(null); setLogoBase64(''); }} className="btn-cancel"><X className="w-4 h-4" /> Cancel</button>
                <button type="submit" form="branch-form" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
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

      {/* Branch Closure Modal */}
      {closureBranch && (
        <BranchClosureModal
          branch={closureBranch}
          onClose={() => setClosureBranch(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
          }}
        />
      )}

      {/* Bot Configuration & Testing Guide Modal */}
      <BranchConfigGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        channel={guideChannel}
      />
    </div>
  )
}
