import { api } from '../lib/axios';

export interface BridgeStatus {
  ready: boolean;
  hasQr?: boolean;
  lastQr?: string | null;
  lastQrAt?: string;
  error?: string;
  step?: string;
}

export const whatsappService = {
  getStatus: async (branchId: string): Promise<BridgeStatus> => {
    const response = await api.get(`/whatsapp/bridge/status/${branchId}`);
    return response.data;
  },

  restartBridge: async (branchId: string): Promise<void> => {
    await api.post(`/whatsapp/bridge/restart/${branchId}`);
  },

  logoutBridge: async (branchId: string): Promise<void> => {
    await api.post(`/whatsapp/bridge/logout/${branchId}`);
  }
};
