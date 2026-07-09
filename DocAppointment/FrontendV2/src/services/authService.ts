import { api } from "@/lib/axios"

export interface LoginResponse {
  token: string
  email: string
  role: string
  orgId: string
  branchId: string | null
  doctorId?: string
}

export const authService = {
  login: async (credentials: Record<string, string>): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/auth/login", credentials)
    return data
  },
  
  registerOrganization: async (payload: Record<string, string>): Promise<string> => {
    const { data } = await api.post<string>("/organizations/register", payload)
    return data
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout")
  },

  refresh: async (): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/auth/refresh")
    return data
  },

  forgotPassword: async (identifier: string, method: string): Promise<any> => {
    const { data } = await api.post("/auth/forgot-password", { identifier, method })
    return data
  },

  resetPassword: async (identifier: string, token: string, newPassword: string): Promise<any> => {
    const { data } = await api.post("/auth/reset-password", { identifier, token, newPassword })
    return data
  },

  changePassword: async (payload: Record<string, string>): Promise<any> => {
    const { data } = await api.post("/auth/change-password", payload)
    return data
  }
}
