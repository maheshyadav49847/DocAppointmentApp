import { api } from "@/lib/axios";

export interface MedicineDto {
  id: string;
  name: string;
  genericName?: string;
  type?: string;
  medicineTypeId?: string;
  manufacturer?: string;
  isActive: boolean;
  popularityScore: number;
  isDoctorFrequent: boolean;
}

export interface MedicineTypeDto {
  id: string;
  name: string;
}

export interface CreateMedicineCommand {
  name: string;
  genericName?: string;
  medicineTypeId?: string;
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
  getAll: async (search?: string, doctorId?: string, pageNumber: number = 1, pageSize: number = 50, sortColumn?: string, sortDirection?: string): Promise<PaginatedList<MedicineDto>> => {
    const params: any = { pageNumber, pageSize };
    if (search) params.search = search;
    if (doctorId) params.doctorId = doctorId;
    if (sortColumn) params.sortColumn = sortColumn;
    if (sortDirection) params.sortDirection = sortDirection;
    const response = await api.get('/medicines', { params });
    return response.data;
  },
  getTypes: async (): Promise<MedicineTypeDto[]> => {
    const response = await api.get('/medicines/types');
    return response.data;
  },

  createType: async (name: string): Promise<{ id: string; name: string }> => {
    const response = await api.post('/medicines/types', { name });
    return response.data;
  },

  getById: async (id: string): Promise<MedicineDto> => {
    const response = await api.get(`/medicines/${id}`);
    return response.data;
  },

  create: async (data: CreateMedicineCommand): Promise<string> => {
    const response = await api.post('/medicines', data);
    return response.data;
  },

  update: async (id: string, data: UpdateMedicineCommand): Promise<void> => {
    await api.put(`/medicines/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/medicines/${id}`);
  },

  importCsv: async (file: File, onUploadProgress?: (progressEvent: any) => void): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/medicines/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
    return response.data;
  }
};
