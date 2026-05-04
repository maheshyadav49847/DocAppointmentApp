import api from './api';

export interface DoctorRatingDto {
  id: string;
  tokenId: string;
  patientName: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface DoctorRatingsSummaryDto {
  doctorId: string;
  averageScore: number;
  totalRatings: number;
  recentRatings: DoctorRatingDto[];
}

export const ratingService = {
  getDoctorRatings: async (doctorId: string): Promise<DoctorRatingsSummaryDto> => {
    const response = await api.get(`/ratings/doctor/${doctorId}`);
    return response.data;
  }
};
