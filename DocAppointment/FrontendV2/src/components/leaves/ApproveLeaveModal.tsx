import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, X, Bell, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import { leaveService, type LeaveRecordDto } from "@/services/leaveService"

interface ApproveLeaveModalProps {
  leave: LeaveRecordDto | null
  onClose: () => void
  onSuccess?: () => void
}

export default function ApproveLeaveModal({ leave, onClose, onSuccess }: ApproveLeaveModalProps) {
  const queryClient = useQueryClient()
  const [notifyPatients, setNotifyPatients] = useState<boolean>(true)

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!leave) throw new Error("No leave selected")
      return leaveService.approveLeave(leave.id, notifyPatients)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      toast.success(res.message || "Leave approved successfully.")
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to approve leave.")
    }
  })

  if (!leave) return null

  const entityName = leave.doctorName ? `Dr. ${leave.doctorName}` : (leave.staffName || "Staff Member")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Approve Leave</h2>
              <p className="text-xs text-slate-500 font-medium">{entityName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Period:</span>
              <span className="font-bold text-slate-900">{leave.startDate} to {leave.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Scope:</span>
              <span className="font-semibold text-slate-800">{leave.sessionName} • {leave.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Reason:</span>
              <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">{leave.reason}</span>
            </div>
          </div>

          {leave.doctorId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Patient Booking Blocking</span>
                <span className="text-[11px] block mt-0.5">
                  Approving will prevent new appointments and cancel existing active tokens during this leave window.
                </span>
              </div>
            </div>
          )}

          {leave.doctorId && (
            <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPatients}
                onChange={(e) => setNotifyPatients(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                Dispatch cancellation alerts to booked patients via WhatsApp / Telegram
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={approveMutation.isPending}
            className="btn-cancel h-10 px-4 flex items-center text-xs font-semibold"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="h-10 px-4 rounded-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  )
}
