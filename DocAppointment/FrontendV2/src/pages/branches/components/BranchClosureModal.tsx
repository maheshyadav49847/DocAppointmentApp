import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertOctagon, X, Lock, CheckCircle2, Building2, Stethoscope, Clock, Users, ReceiptIndianRupee, Ticket } from "lucide-react"
import toast from "react-hot-toast"
import { branchService } from "@/services/branchService"
import type { Branch } from "@/services/branchService"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"

interface BranchClosureModalProps {
  branch: Branch | null
  onClose: () => void
  onSuccess: () => void
}

export default function BranchClosureModal({ branch, onClose, onSuccess }: BranchClosureModalProps) {
  const queryClient = useQueryClient()
  const [closureRemark, setClosureRemark] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)

  const { data: depSummary, isLoading, error: depError } = useQuery({
    queryKey: ['branch-dependencies', branch?.id],
    queryFn: () => branch ? branchService.getBranchDependencies(branch.id) : null,
    enabled: !!branch?.id
  })

  const closeMutation = useMutation({
    mutationFn: (remark: string) => {
      if (!branch) throw new Error("No branch selected")
      return branchService.closeBranch(branch.id, remark)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success(`Branch "${branch?.name}" has been closed successfully.`)
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors)
      }
    }
  })

  const handleConfirmClosure = (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})

    if (!closureRemark.trim()) {
      setValidationErrors({
        ClosureRemark: ["Closure remark is mandatory to permanently close a branch facility."]
      })
      return
    }

    closeMutation.mutate(closureRemark.trim())
  }

  if (!branch) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation()
          onClose()
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Close Branch Facility
              </h2>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {branch.name}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200/80 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <ApiErrorAlert error={apiError || depError} />

          {/* Loading Dependencies */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Checking active branch dependencies...</p>
            </div>
          ) : depSummary && !depSummary.canClose ? (
            /* Dependencies Exist: Blocking Alert */
            <div className="space-y-4">
              <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">
                      Closure Blocked: Active Dependencies Found
                    </h3>
                    <p className="text-xs text-rose-700 mt-1">
                      This branch cannot be closed because it still has active clinical or operational resources assigned. Please settle or reassign all items listed below:
                    </p>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-2">
                  {depSummary.activeDoctorsCount > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{depSummary.activeDoctorsCount} Consulting Doctor(s) assigned</span>
                    </div>
                  )}
                  {depSummary.activeSessionsCount > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{depSummary.activeSessionsCount} Active OPD Session schedule(s)</span>
                    </div>
                  )}
                  {depSummary.activeStaffCount > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <Users className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>
                        {depSummary.activeStaffCount} Active Staff member(s)
                        {depSummary.branchAdminsCount > 0 && ` (including ${depSummary.branchAdminsCount} Branch Admin)`}
                      </span>
                    </div>
                  )}
                  {depSummary.activeQueueTokensCount > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <Ticket className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{depSummary.activeQueueTokensCount} Pending / In-progress Queue Visit(s)</span>
                    </div>
                  )}
                  {depSummary.unsettledInvoicesCount > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <ReceiptIndianRupee className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{depSummary.unsettledInvoicesCount} Unsettled invoice bill(s) pending payment</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">How to settle before closing:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Complete or cancel today's active patient queue visits.</li>
                  <li>Deactivate or delete recurring OPD session shifts in <strong>OPD Shifts</strong>.</li>
                  <li>Reassign or unlink doctors in <strong>Doctors</strong>.</li>
                  <li>Reassign staff and branch admins to another active branch in <strong>Staff</strong>.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Safe to Close Form */
            <form id="closure-form" onSubmit={handleConfirmClosure} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-800 font-medium">
                  <span className="font-bold">Zero Active Dependencies:</span> All doctors, schedules, staff, and tokens are settled. This facility is safe to be permanently closed.
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg text-xs text-amber-800">
                <p className="font-bold">Important Notice:</p>
                <p className="mt-0.5">
                  Closing a branch halts all online patient bookings and bot integrations. This action is permanent and records are archived for historical audits.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mandatory Closure Remark / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={closureRemark}
                  onChange={(e) => {
                    setClosureRemark(e.target.value)
                    if (validationErrors.ClosureRemark) setValidationErrors({})
                  }}
                  placeholder="e.g. Relocated to North Clinic facility, lease expired, or operations consolidated."
                  className={`w-full px-3 py-2 text-xs font-medium border rounded-md focus:outline-none transition-all resize-none ${
                    validationErrors.ClosureRemark
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white'
                  }`}
                  required
                />
                <FieldError errors={validationErrors} field="ClosureRemark" />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="btn-cancel"
          >
            <X className="w-4 h-4" /> Cancel
          </button>

          {depSummary?.canClose && (
            <button
              type="submit"
              form="closure-form"
              disabled={closeMutation.isPending}
              className="btn-primary bg-rose-600 hover:bg-rose-700 border-rose-700 focus:ring-rose-200"
            >
              {closeMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Permanently Close Branch
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
