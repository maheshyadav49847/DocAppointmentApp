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

  getDailyCollection: async (branchId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (branchId && (branchId !== 'all' && branchId !== 'org')) params.append('branchId', branchId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const response = await api.get(`/reports/daily-collection?${params.toString()}`)
    return response.data
  },

  getDoctorRevenue: async (branchId?: string, doctorId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (branchId && (branchId !== 'all' && branchId !== 'org')) params.append('branchId', branchId)
    if (doctorId && doctorId !== 'all') params.append('doctorId', doctorId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const response = await api.get(`/reports/doctor-revenue?${params.toString()}`)
    return response.data
  },

  getServiceRevenue: async (branchId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (branchId && (branchId !== 'all' && branchId !== 'org')) params.append('branchId', branchId)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const response = await api.get(`/reports/service-revenue?${params.toString()}`)
    return response.data
  },

  getOutstandingDues: async (branchId?: string) => {
    const params = new URLSearchParams()
    if (branchId && (branchId !== 'all' && branchId !== 'org')) params.append('branchId', branchId)
    const response = await api.get(`/reports/outstanding-dues?${params.toString()}`)
    return response.data
  },

  getFootfallAnalysisReport: async (params: { startDate: string; endDate: string; branchId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/operational/footfall', { params: cleanParams });
    return response.data;
  },
  getAppointmentSummaryReport: async (params: { startDate: string; endDate: string; branchId?: string; doctorId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/operational/appointment-summary', { params: cleanParams });
    return response.data;
  },
  getQueueWaitTimeReport: async (params: { startDate: string; endDate: string; branchId?: string; doctorId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/operational/queue-wait-time', { params: cleanParams });
    return response.data;
  },
  getStaffProductivityReport: async (params: { startDate: string; endDate: string; branchId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/operational/staff-productivity', { params: cleanParams });
    return response.data;
  },
  getDiagnosisSummaryReport: async (params: { startDate: string; endDate: string; branchId?: string; doctorId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/clinical/diagnosis-summary', { params: cleanParams });
    return response.data;
  },
  getPatientDemographicsReport: async (params: { startDate: string; endDate: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/clinical/patient-demographics', { params: cleanParams });
    return response.data;
  },
  getNewVsReturningReport: async (params: { startDate: string; endDate: string; branchId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/clinical/new-vs-returning', { params: cleanParams });
    return response.data;
  },
  getReferralTrackingReport: async (params: { startDate: string; endDate: string; branchId?: string; }) => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === 'all' || cleanParams.branchId === 'org') delete cleanParams.branchId;
    if (cleanParams.doctorId === 'all') delete cleanParams.doctorId;
    const response = await api.get('/reports/clinical/referral-tracking', { params: cleanParams });
    return response.data;
  },
}
