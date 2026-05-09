import api from './api';

export const branchService = {
  getBranches: async (orgId: string) => {
    const response = await api.get(`/branches/org/${orgId}`);
    return response.data;
  },
  createBranch: async (data: any) => {
    const response = await api.post('/branches', data);
    return response.data;
  },
  updateBranch: async (id: string, data: any) => {
    const response = await api.put(`/branches/${id}`, data);
    return response.data;
  },
  getBranch: async (id: string) => {
    const response = await api.get(`/branches/${id}`);
    return response.data;
  },
  deleteBranch: async (id: string) => {
    const response = await api.delete(`/branches/${id}`);
    return response.data;
  }
};
