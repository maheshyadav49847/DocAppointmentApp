import api from './api';

export interface BranchAnalytics {
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  pendingTokens: number;
  averageWaitTimeMinutes: number;
  totalRevenue: number;
  averageRating: number;
  financials: { cash: number; upi: number; card: number; online: number };
  patientComposition: { newPatients: number; returningPatients: number };
  operations: { avgDoctorPunctualityMinutes: number; slotUtilizationPercent: number };
  staffPerformance: { staffName: string; tokensGenerated: number }[];
  whatsAppStats: { totalSent: number; delivered: number; failed: number };
  hourlyTrends: { hour: number; count: number }[];
  doctorPerformance: { doctorName: string; tokenCount: number; avgWaitTime: number; revenue: number }[];
  dailyWaitTimeTrends: { date: string; avgWaitTime: number }[];
  recentFeedback: { patientName: string; score: number; comment: string | null; date: string }[];
}

export const reportService = {
  getBranchAnalytics: async (branchId?: string, startDate?: string, endDate?: string): Promise<BranchAnalytics> => {
    const params = new URLSearchParams();
    if (branchId && branchId !== 'org') params.append('branchId', branchId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/reports/branch-analytics?${params.toString()}`);
    return response.data;
  },
};
