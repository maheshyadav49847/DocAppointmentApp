import { api } from "@/lib/axios"

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  organizationId?: string;
  action: string;
  path: string;
  method: string;
  ipAddress: string;
  requestPayload?: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export const auditLogService = {
  getAuditLogs: async (search?: string, page: number = 1, limit: number = 50) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    
    const response = await api.get<PaginatedResponse<AuditLog>>(`/auditlogs?${params.toString()}`)
    return response.data
  }
}
