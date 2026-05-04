import api from './api';

export const doctorService = {
  getDoctors: async (branchId: string) => {
    const response = await api.get(`/doctors/${branchId}`);
    return response.data;
  },
  createDoctor: async (data: any) => {
    const response = await api.post('/doctors', data);
    return response.data;
  },
  deleteDoctor: async (id: string) => {
    await api.delete(`/doctors/${id}`);
  },
  updateDoctor: async (id: string, data: any) => {
    await api.put(`/doctors/${id}`, data);
  }
};
