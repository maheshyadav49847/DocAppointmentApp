import { api } from "@/lib/axios"

export const sessionService = {
  getSessions: async (doctorId: string, branchId?: string) => {
    const url = branchId ? `/sessions/doctor/${doctorId}?branchId=${branchId}` : `/sessions/doctor/${doctorId}`
    const response = await api.get(url)
    return response.data
  },
  createSession: async (data: any) => {
    const response = await api.post('/sessions', data)
    return response.data
  },
  deleteSession: async (id: string) => {
    await api.delete(`/sessions/${id}`)
  },
  updateSession: async (id: string, data: any) => {
    await api.put(`/sessions/${id}`, data)
  }
}
