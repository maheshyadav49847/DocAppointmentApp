import { api } from "@/lib/axios"

export const queueService = {
  callNext: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/next`)
    return response.data
  },
  markArrived: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/arrived`)
    return response.data
  },
  getQueueDetails: async (queueId: string) => {
    const response = await api.get(`/queue/${queueId}`)
    return response.data
  },
  createToken: async (data: any) => {
    const response = await api.post('/tokens', data)
    return response.data
  },
  searchPatients: async (branchId: string, search: string) => {
    const response = await api.get(`/queue/search-patients?branchId=${branchId}&search=${search}`)
    return response.data
  },
  getBranches: async () => {
    const response = await api.get('/queue/branches')
    return response.data
  },
  getDoctors: async (branchId: string) => {
    const response = await api.get(`/queue/doctors?branchId=${branchId}`)
    return response.data
  },
  getSessions: async (doctorId: string, branchId: string) => {
    const response = await api.get(`/queue/sessions?doctorId=${doctorId}&branchId=${branchId}`)
    return response.data
  },
  getActiveQueue: async (doctorId: string) => {
    const response = await api.get(`/queue/active/${doctorId}`)
    return response.data
  },
  getActiveQueueBySession: async (doctorId: string, sessionId: string) => {
    const response = await api.get(`/queue/active/${doctorId}/${sessionId}`)
    return response.data
  },
  getUpcomingTokens: async (queueId: string) => {
    const response = await api.get(`/queue/${queueId}/tokens/upcoming`)
    return response.data
  },
  initializeQueue: async (doctorId: string, sessionId: string) => {
    const response = await api.post('/queue/initialize', { doctorId, sessionId })
    return response.data
  },
  skipToken: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/skip`)
    return response.data
  },
  completeToken: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/complete`)
    return response.data
  },
  endQueue: async (queueId: string, data?: { action?: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string }) => {
    const response = await api.post(`/queue/${queueId}/end`, data)
    return response.data
  },
  cancelQueue: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/cancel`)
    return response.data
  },
  alertPatient: async (queueId: string) => {
    const response = await api.post(`/queue/${queueId}/alert`)
    return response.data
  },
  deleteToken: async (tokenId: string, deletePatientIfOffline?: boolean) => {
    const response = await api.delete(`/tokens/${tokenId}${deletePatientIfOffline ? '?deleteOfflinePatient=true' : ''}`)
    return response.data
  },
  updateToken: async (tokenId: string, data: any) => {
    const response = await api.put(`/tokens/${tokenId}`, { tokenId, ...data })
    return response.data
  },
  requeueToken: async (tokenId: string) => {
    const response = await api.post(`/tokens/${tokenId}/requeue`)
    return response.data
  },
  getStats: async (branchId: string) => {
    const response = await api.get(`/queue/stats/${branchId}`)
    return response.data
  },
  checkWhatsAppNumber: async (branchId: string, phone: string) => {
    const response = await api.get(`/whatsapp/bridge/check-number/${branchId}/${phone}`)
    return response.data
  }
}
