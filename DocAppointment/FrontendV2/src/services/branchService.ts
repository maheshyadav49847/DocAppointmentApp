import { api } from "@/lib/axios"

export interface Branch {
  id: string
  name: string
  address: string
  whatsAppNumber: string | null
  isActive: boolean
}

export const branchService = {
  getBranches: async (orgId: string): Promise<Branch[]> => {
    const response = await api.get(`/branches/org/${orgId}`)
    return response.data
  },
  createBranch: async (data: any) => {
    const response = await api.post('/branches', data)
    return response.data
  },
  updateBranch: async (id: string, data: any) => {
    const response = await api.put(`/branches/${id}`, data)
    return response.data
  },
  deleteBranch: async (id: string) => {
    const response = await api.delete(`/branches/${id}`)
    return response.data
  }
}
