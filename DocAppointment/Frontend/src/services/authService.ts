import api from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  registerOrg: async (data: any) => {
    const response = await api.post('/organizations/register', data);
    return response.data;
  },
  forgotPassword: async (identifier: string, method: string) => {
    const response = await api.post('/auth/forgot-password', { identifier, method });
    return response.data;
  },
  resetPassword: async (identifier: string, token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { identifier, token, newPassword });
    return response.data;
  }
};
