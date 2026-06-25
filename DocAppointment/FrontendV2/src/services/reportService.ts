import { api } from "@/lib/axios"

export interface BranchAnalytics {
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  pendingTokens: number;
  averageWaitTimeMinutes: number;
  averageRating: number;
  patientComposition: { newPatients: number; returningPatients: number; repeatRate: number };
  operations: { avgDoctorPunctualityMinutes: number; slotUtilizationPercent: number };
  staffPerformance: { staffName: string; tokensGenerated: number; averageRating: number }[];
  whatsAppStats: { totalSent: number; delivered: number; failed: number };
  platformStats: { totalOrganizations: number; totalBranches: number; avgApiResponseTimeMs: number; databaseSizeMb: number };
  hourlyTrends: { hour: number; count: number }[];
  doctorPerformance: { doctorName: string; tokenCount: number; avgWaitTime: number; averageRating: number }[];
  dailyWaitTimeTrends: { date: string; avgWaitTime: number }[];
  recentFeedback: { patientName: string; score: number; comment: string | null; date: string }[];
}

export const reportService = {
  getBranches: async () => {
    const response = await api.get('/reports/branches')
    return response.data
  },
  
  getBranchAnalytics: async (branchId?: string, startDate?: string, endDate?: string): Promise<BranchAnalytics> => {
    const params = new URLSearchParams()
    if (branchId && branchId !== 'org') params.append('branchId', branchId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await api.get(`/reports/branch-analytics?${params.toString()}`)
    return response.data
  },
}
