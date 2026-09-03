import { api } from '@/lib/axios';

export interface ServiceItem {
  id: string;
  name: string;
  category?: string;
  defaultPrice: number;
  isActive: boolean;
}

export interface CreateServiceItemDto {
  organizationId: string;
  name: string;
  category?: string;
  defaultPrice: number;
}

export interface UpdateServiceItemDto {
  id: string;
  organizationId: string;
  name: string;
  category?: string;
  defaultPrice: number;
  isActive: boolean;
}

export const billingService = {
  getInvoiceById: async (id: string, organizationId: string): Promise<any> => {
    const response = await api.get('/billing/invoices/' + id + '?organizationId=' + organizationId);
    return response.data;
  },

  getServices: async (organizationId: string): Promise<ServiceItem[]> => {
    const response = await api.get('/billing/services/' + organizationId);
    return response.data;
  },

  createService: async (data: CreateServiceItemDto): Promise<string> => {
    const response = await api.post('/billing/services', data);
    return response.data;
  },

  updateService: async (id: string, data: UpdateServiceItemDto): Promise<void> => {
    await api.put('/billing/services/' + id, data);
  },

  deleteService: async (id: string): Promise<void> => {
    await api.delete('/billing/services/' + id);
  }
};
