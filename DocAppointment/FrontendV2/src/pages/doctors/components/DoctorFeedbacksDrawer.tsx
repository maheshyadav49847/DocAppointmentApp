import React from "react"
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
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl text-yellow-600 flex items-center justify-center border-2 border-yellow-100 bg-white shadow-sm">
                  <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-slate-900">Patient Feedbacks</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Dr. {doctor?.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p>Loading feedbacks...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500 gap-3">
                  <p>Failed to load feedbacks.</p>
                </div>
              ) : summary?.totalRatings === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <MessageSquare className="w-12 h-12 stroke-1" />
                  <p className="text-lg">No feedbacks yet</p>
                  <p className="text-sm">Patients haven't rated this doctor.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Average Rating</p>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-4xl font-bold text-slate-900">{summary?.averageScore.toFixed(1)}</span>
                        <span className="text-lg text-slate-400 mb-1">/ 5</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">Total Ratings</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.totalRatings}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Feedbacks</h3>
                    {summary?.recentRatings.map((rating) => (
                      <div key={rating.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                              {rating.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{rating.patientName}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold border border-yellow-200">
                            <Star className="w-3 h-3 fill-yellow-500" />
                            {rating.score}
                          </div>
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
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
