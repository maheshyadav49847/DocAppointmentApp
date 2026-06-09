import { api } from "@/lib/axios";

export interface MedicineDto {
  id: string;
  name: string;
  genericName?: string;
  type?: string;
  manufacturer?: string;
  isActive: boolean;
}

export interface CreateMedicineCommand {
  name: string;
  genericName?: string;
  type?: string;
  manufacturer?: string;
}

export interface UpdateMedicineCommand extends CreateMedicineCommand {
  id: string;
}

export interface PaginatedList<T> {
  items: T[];
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const medicineService = {
  getAll: async (search?: string, pageNumber: number = 1, pageSize: number = 50): Promise<PaginatedList<MedicineDto>> => {
    const params: any = { pageNumber, pageSize };
    if (search) params.search = search;
    const response = await api.get('/api/medicines', { params });
    return response.data;
  },

  getById: async (id: string): Promise<MedicineDto> => {
    const response = await api.get(`/api/medicines/${id}`);
    return response.data;
  },

  create: async (data: CreateMedicineCommand): Promise<string> => {
    const response = await api.post('/api/medicines', data);
    return response.data;
  },

  update: async (id: string, data: UpdateMedicineCommand): Promise<void> => {
    await api.put(`/api/medicines/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/medicines/${id}`);
  },

  importCsv: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    await api.post('/api/medicines/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};
