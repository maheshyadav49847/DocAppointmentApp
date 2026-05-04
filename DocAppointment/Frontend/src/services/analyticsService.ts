import api from './api';

export interface DailyStatDto {
  date: string;
  totalPatients: number;
  completed: number;
  skipped: number;
  avgWaitTimeMinutes: number;
}

export interface HistoricalStatsDto {
  dailyStats: DailyStatDto[];
  totalPatientsInPeriod: number;
  totalCompletedInPeriod: number;
  totalSkippedInPeriod: number;
  averageWaitTimeInPeriod: number;
}

export const analyticsService = {
  getHistoricalStats: async (branchId: string, startDate: string, endDate: string): Promise<HistoricalStatsDto> => {
    const response = await api.get(`/analytics/historical/${branchId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  }
};
