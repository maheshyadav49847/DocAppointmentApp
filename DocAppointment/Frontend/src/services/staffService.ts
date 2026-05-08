import api from './api';

export const staffService = {
  getStaff: async (branchId: string) => {
    const response = await api.get(`/staff/${branchId}`);
    return response.data;
  },
  createStaff: async (data: {
    branchId: string;
    organizationId: string;
    email: string;
    password: string;
    role: number;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  }) => {
    const response = await api.post('/staff', data);
    return response.data;
  },
  updateStaff: async (id: string, data: {
    id: string;
    email: string;
    role: number;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    newPassword?: string;
  }) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },
  deleteStaff: async (id: string) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  }
};
