import { api } from "@/lib/axios";

export interface PeakHourDto {
  hour: number;
  tokenCount: number;
}

export interface BranchComparisonDto {
  branchId: string;
  branchName: string;
  patientCount: number;
}

export interface DoctorUtilizationDto {
  doctorId: string;
  doctorName: string;
  totalCapacity: number;
  bookedTokens: number;
  utilizationPercentage: number;
}

export interface OperationalAnalyticsDto {
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  noShowTokens: number;
  pendingTokens: number;
  averageWaitTimeMinutes: number;
  peakHours: PeakHourDto[];
  branchComparisons: BranchComparisonDto[];
  doctorUtilizations: DoctorUtilizationDto[];
  appointmentLogs: AppointmentLogDto[];
}

export interface AppointmentLogDto {
  date: string;
  tokenNumber: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  status: string;
  waitTimeMinutes: number;
  feePaid: number;
}

export interface DailyRevenueDto {
  date: string;
  revenue: number;
}

export interface PaymentModeBreakdownDto {
  mode: number;
  totalAmount: number;
}

export interface DoctorRevenueDto {
  doctorId: string;
  doctorName: string;
  totalRevenue: number;
}

export interface FinancialAnalyticsDto {
  totalRevenue: number;
  outstandingDues: number;
  revenueTrend: DailyRevenueDto[];
  paymentBreakdown: PaymentModeBreakdownDto[];
  doctorRevenues: DoctorRevenueDto[];
}

export interface DemographicDto {
  category: string;
  count: number;
}

export interface DiagnosisTrendDto {
  diagnosis: string;
  count: number;
}

export interface ClinicalAnalyticsDto {
  newPatients: number;
  returningPatients: number;
  ageDemographics: DemographicDto[];
  genderDemographics: DemographicDto[];
  topDiagnoses: DiagnosisTrendDto[];
}

export interface SystemAnalyticsDto {
  totalOrganizations: number;
  activeOrganizations: number;
  totalTokensBooked: number;
  totalMessagesSent: number;
  platformGrowth: {
    month: string;
    newOrganizations: number;
    tokensBooked: number;
  }[];
}

export const analyticsService = {
  getOperational: async (startDate: string, endDate: string, branchId?: string): Promise<OperationalAnalyticsDto> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (branchId) params.append('branchId', branchId);
    const response = await api.get(`/analytics/operational?${params}`);
    return response.data;
  },

  getFinancial: async (startDate: string, endDate: string, branchId?: string): Promise<FinancialAnalyticsDto> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (branchId) params.append('branchId', branchId);
    const response = await api.get(`/analytics/financial?${params}`);
    return response.data;
  },

  getClinical: async (startDate: string, endDate: string, branchId?: string): Promise<ClinicalAnalyticsDto> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (branchId) params.append('branchId', branchId);
    const response = await api.get(`/analytics/clinical?${params}`);
    return response.data;
  },

  getSystem: async (): Promise<SystemAnalyticsDto> => {
    const response = await api.get(`/analytics/system`);
    return response.data;
  }
};

export default analyticsService;
