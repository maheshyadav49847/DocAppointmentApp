import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, X } from "lucide-react"
import toast from "react-hot-toast"
import { leaveService, type LeaveRecordDto } from "@/services/leaveService"

interface RejectLeaveModalProps {
  leave: LeaveRecordDto | null
  onClose: () => void
  onSuccess?: () => void
}

export default function RejectLeaveModal({ leave, onClose, onSuccess }: RejectLeaveModalProps) {
  const queryClient = useQueryClient()
  const [rejectionReason, setRejectionReason] = useState<string>("")
  const [error, setError] = useState<string>("")

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!leave) throw new Error("No leave selected")
      return leaveService.rejectLeave(leave.id, reason)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      toast.success(res.message || "Leave rejected.")
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reject leave.")
    }
  })

  if (!leave) return null

  const entityName = leave.doctorName ? `Dr. ${leave.doctorName}` : (leave.staffName || "Staff Member")

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection.")
      return
    }
    rejectMutation.mutate(rejectionReason.trim())
  }

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
            <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reject Leave Application</h2>
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
        <form onSubmit={handleConfirm} className="p-5 space-y-3.5">
          <p className="text-xs text-slate-600">
            Please enter the rejection rationale. This note will be recorded and visible to the applicant.
          </p>

          <div>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value)
                if (error) setError("")
              }}
              placeholder="e.g. Critical clinic shift cover needed, overlapping leaves..."
              className="w-full p-2.5 text-xs rounded-md border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={rejectMutation.isPending}
            className="btn-cancel h-10 px-4 flex items-center text-xs font-semibold"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={rejectMutation.isPending}
            className="h-10 px-4 rounded-md text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-xs flex items-center gap-1.5 transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  )
}
