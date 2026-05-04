import api from './api';

export const sessionService = {
  getSessions: async (doctorId: string) => {
    const response = await api.get(`/sessions/doctor/${doctorId}`);
    return response.data;
  },
  createSession: async (data: any) => {
    const response = await api.post('/sessions', data);
    return response.data;
  },
  deleteSession: async (id: string) => {
    await api.delete(`/sessions/${id}`);
  },
  updateSession: async (id: string, data: any) => {
    await api.put(`/sessions/${id}`, data);
  }
};
