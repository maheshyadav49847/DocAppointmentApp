import { api } from "@/lib/axios"

export interface Branch {
  id: string
  organizationId: string
  name: string
  address: string
  whatsAppDialCode?: string
  whatsAppNumber: string | null
  timezone?: string
  logoBase64?: string
  telegramBotToken?: string
  telegramBotUsername?: string
  whatsAppProvider?: string
  metaWabaId?: string
  metaPhoneNumberId?: string
  status: 'Active' | 'Inactive' | 'Closed'
  closureRemark?: string
  closedAt?: string
  closedBy?: string
  isActive: boolean
  isWhatsAppConfigured?: boolean
  isTelegramConfigured?: boolean
}

export interface BranchDependencySummary {
  canClose: boolean
  activeDoctorsCount: number
  activeSessionsCount: number
  activeStaffCount: number
  branchAdminsCount: number
  activeQueueTokensCount: number
  unsettledInvoicesCount: number
  dependencies: string[]
}

export const branchService = {
  getBranches: async (orgId?: string): Promise<Branch[]> => {
    if (!orgId || orgId === 'undefined' || orgId.trim() === '') {
      return branchService.getMyBranches()
    }
    const response = await api.get(`/branches/org/${orgId}`)
    return response.data
  },
  getMyBranches: async (): Promise<Branch[]> => {
    const response = await api.get('/branches/list')
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
  getBranchDependencies: async (id: string): Promise<BranchDependencySummary> => {
    const response = await api.get(`/branches/${id}/dependencies`)
    return response.data
  },
  closeBranch: async (id: string, closureRemark: string) => {
    const response = await api.post(`/branches/${id}/close`, { closureRemark })
    return response.data
  },
  testTelegramConnection: async (token: string) => {
    const response = await api.post('/branches/telegram/test', { token })
    return response.data
  },
  setTelegramWebhook: async (token: string, webhookUrl: string) => {
    const response = await api.post('/branches/telegram/set-webhook', { token, webhookUrl })
    return response.data
  }
}
