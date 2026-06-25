import { api } from "@/lib/axios"

export interface Role {
  id: string
  name: string
  description?: string
  isSystemDefault: boolean
  permissions: string[]
}

export const rolesService = {
  getRoles: async (): Promise<Role[]> => {
    const { data } = await api.get<Role[]>("/roles")
    return data
  },
  createRole: async (payload: { name: string, description?: string, permissions: string[] }): Promise<string> => {
    const { data } = await api.post<string>("/roles", payload)
    return data
  },
  updatePermissions: async (roleId: string, permissions: string[]): Promise<void> => {
    await api.put(`/roles/${roleId}/permissions`, permissions)
  },
  deleteRole: async (roleId: string): Promise<void> => {
    await api.delete(`/roles/${roleId}`)
  },
  getAvailablePermissions: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>("/roles/permissions")
    return data
  }
}
