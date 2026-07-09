import { api } from '../lib/axios';

export const staffService = {
  getStaff: async (orgId: string, branchId: string | null) => {
    const params = new URLSearchParams();
    params.append('orgId', orgId);
    if (branchId) params.append('branchId', branchId);
    
    const response = await api.get(`/staff?${params.toString()}`);
    return response.data;
  },
  getBranches: async () => {
    const response = await api.get('/staff/branches');
    return response.data;
  },
  getRoles: async () => {
    const response = await api.get('/staff/roles');
    return response.data;
  },
  createStaff: async (data: {
    branchId: string | null;
    organizationId: string;
    email: string;
    password: string;
    roleId: string;
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
    roleId: string;
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
