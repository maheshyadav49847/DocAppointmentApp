import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Star, X, MessageSquare, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { api } from "@/lib/axios"
import type { Doctor } from "@/services/doctorService"

interface DoctorRatingDto {
  id: string
  tokenId: string
  patientName: string
  score: number
  comment?: string
  createdAt: string
}

interface DoctorRatingsSummaryDto {
  doctorId: string
  averageScore: number
  totalRatings: number
  recentRatings: DoctorRatingDto[]
}

interface DoctorFeedbacksDrawerProps {
  isOpen: boolean
  onClose: () => void
  doctor: Doctor | null
}

export default function DoctorFeedbacksDrawer({ isOpen, onClose, doctor }: DoctorFeedbacksDrawerProps) {
  const { data: summary, isLoading, error } = useQuery<DoctorRatingsSummaryDto>({
    queryKey: ['doctor-feedbacks', doctor?.id],
    queryFn: async () => {
      const res = await api.get(`/ratings/doctor/${doctor?.id}`)
      return res.data
    },
    enabled: !!doctor?.id && isOpen,
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
          >
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-lg text-amber-600 flex items-center justify-center border-2 border-amber-100 bg-white shadow-xs">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-slate-900">Patient</span>
                    <span className="text-amber-600">Feedbacks</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Dr. {doctor?.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-medium">Loading feedbacks...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 gap-2">
                  <p className="text-sm font-semibold">Failed to load feedbacks.</p>
                </div>
              ) : summary?.totalRatings === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2.5">
                  <MessageSquare className="w-10 h-10 stroke-1" />
                  <p className="text-base font-bold text-slate-700">No feedbacks yet</p>
                  <p className="text-xs text-slate-400">Patients haven't rated this doctor.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rating</p>
                      <div className="flex items-end gap-1.5 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{summary?.averageScore.toFixed(1)}</span>
                        <span className="text-sm text-slate-400 mb-1">/ 5</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reviews</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{summary?.totalRatings}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Feedbacks</h3>
                    {summary?.recentRatings.map((rating) => (
                      <div key={rating.id} className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200/90 shadow-xs space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {rating.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{rating.patientName}</p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs font-bold border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {rating.score}
                          </div>
                        </div>
                        {rating.comment && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-md border border-slate-100">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
