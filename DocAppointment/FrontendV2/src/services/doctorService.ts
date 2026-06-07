import { api } from "@/lib/axios"

export interface Doctor {
  id: string
  name: string
  specialization: string
  contactNumber?: string
  mobile?: string
  emailId?: string
  gender?: string
  qualification?: string
  experience?: string
  registrationNumber?: string
  organizationId: string
  branchIds?: string[]
}

export const doctorService = {
  getOrganizationDoctors: async (): Promise<Doctor[]> => {
    const response = await api.get('/doctors')
    return response.data
  },
  
  getBranchDoctors: async (branchId: string): Promise<Doctor[]> => {
    if (!branchId) return []
    const response = await api.get(`/doctors/${branchId}`)
    return response.data
  },

  createDoctor: async (data: Omit<Doctor, 'id'>): Promise<Doctor> => {
    const response = await api.post('/doctors', data)
    return response.data
  },

  updateDoctor: async (id: string, data: Partial<Doctor>): Promise<void> => {
    await api.put(`/doctors/${id}`, data)
  },

  deleteDoctor: async (id: string): Promise<void> => {
    await api.delete(`/doctors/${id}`)
  }
}
