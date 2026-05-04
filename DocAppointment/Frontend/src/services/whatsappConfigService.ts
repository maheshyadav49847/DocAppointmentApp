import api from './api';

export const whatsappConfigService = {
  getConfig: async () => {
    const response = await api.get('/whatsapp/config');
    return response.data;
  },
  saveConfig: async (data: { accountSid: string; authToken: string; fromNumber: string }) => {
    const response = await api.post('/whatsapp/config', data);
    return response.data;
  },
  testConnection: async (data: { accountSid: string; authToken: string; fromNumber: string }) => {
    const response = await api.post('/whatsapp/webhook/test', data);
    return response.data;
  }
};
