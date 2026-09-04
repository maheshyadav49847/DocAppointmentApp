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

  getServices: async (organizationId: string, page: number = 1, pageSize: number = 10, search: string = ''): Promise<{ items: ServiceItem[], totalPages: number, totalCount: number }> => {
    let url = `/billing/services?organizationId=${organizationId}&page=${page}&pageSize=${pageSize}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await api.get(url);
    return response.data;
  },

  exportServices: async (organizationId: string, search: string = ''): Promise<Blob> => {
    let url = `/billing/services/export?organizationId=${organizationId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await api.get(url, { responseType: 'blob' });
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
