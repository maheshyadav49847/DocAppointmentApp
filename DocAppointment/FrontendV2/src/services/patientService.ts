import { api } from "@/lib/axios"

export interface Patient {
  id: string
  patientCode: string
  name: string
  phone: string
  email: string
  address: string
  age: string | number
  gender: string
  maritalStatus?: string
  bloodGroup: string
  preExistingConditions: string
  height: number
  emergencyContactName: string
  emergencyContactPhone: string
  organizationId: string
  branchId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

export const patientService = {
  getPatients: async (
    branchId?: string, 
    page: number = 1, 
    limit: number = 10, 
    search?: string
  ): Promise<PaginatedResponse<Patient>> => {
    const response = await api.get('/patients', {
      params: {
        branchId: branchId === 'all' ? undefined : branchId,
        page,
        limit,
        search: search || undefined
      }
    })
    return response.data
  },

  createPatient: async (data: Partial<Patient>): Promise<Patient> => {
    const response = await api.post('/patients', data)
    return response.data
  },

  updatePatientProfile: async (id: string, data: Partial<Patient>): Promise<Patient> => {
    const response = await api.put(`/patientclinical/${id}`, data)
    return response.data
  }
}
