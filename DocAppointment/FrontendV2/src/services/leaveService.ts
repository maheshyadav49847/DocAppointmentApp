import { api } from "@/lib/axios"

export type LeaveType = 0 | 1 // 0: Planned, 1: Unplanned
export type LeaveStatus = 0 | 1 | 2 | 3 // 0: Pending, 1: Approved, 2: Rejected, 3: Cancelled

export interface LeaveRecordDto {
  id: string
  organizationId: string
  branchId?: string
  branchName: string
  staffId?: string
  staffName?: string
  staffEmail?: string
  doctorId?: string
  doctorName?: string
  doctorSpecialization?: string
  leaveType: LeaveType
  startDate: string // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
  sessionId?: string
  sessionName: string
  reason: string
  publicNotice?: string
  status: LeaveStatus
  appliedByStaffId: string
  appliedByName: string
  approvedByStaffId?: string
  approvedByName?: string
  approvedAt?: string
  rejectionReason?: string
  notifyPatients: boolean
  affectedTokensCount: number
  createdAt: string
}

export interface LeaveFilterParams {
  branchId?: string
  doctorId?: string
  staffId?: string
  status?: LeaveStatus
  type?: LeaveType
  startDate?: string
  endDate?: string
  search?: string
}

export interface ApplyLeaveRequest {
  staffId?: string
  doctorId?: string
  branchId?: string
  sessionId?: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
  publicNotice?: string
  notifyPatients?: boolean
}

export interface RejectLeaveRequest {
  rejectionReason: string
}

export interface DoctorAvailabilityResult {
  isAvailable: boolean
  onLeave: boolean
  leaveType?: string
  reason?: string
  publicNotice?: string
  startDate?: string
  endDate?: string
  nextAvailableDate?: string
}

export const leaveService = {
  getLeaves: async (params?: LeaveFilterParams): Promise<LeaveRecordDto[]> => {
    const response = await api.get('/leaves', { params })
    return response.data
  },

  applyLeave: async (data: ApplyLeaveRequest): Promise<{ id: string; status: string; message: string; affectedTokens: number }> => {
    const response = await api.post('/leaves', data)
    return response.data
  },

  updateLeave: async (id: string, data: ApplyLeaveRequest): Promise<{ message: string; leave: LeaveRecordDto }> => {
    const response = await api.put(`/leaves/${id}`, data)
    return response.data
  },

  approveLeave: async (id: string, notifyPatients: boolean = true): Promise<{ message: string; affectedTokens: number }> => {
    const response = await api.put(`/leaves/${id}/approve`, { notifyPatients })
    return response.data
  },

  rejectLeave: async (id: string, rejectionReason: string): Promise<{ message: string }> => {
    const response = await api.put(`/leaves/${id}/reject`, { rejectionReason })
    return response.data
  },

  cancelLeave: async (id: string, reopenTodayQueue?: boolean): Promise<{ message: string; reopenedQueues?: number }> => {
    const response = await api.delete(`/leaves/${id}`, {
      params: reopenTodayQueue ? { reopenTodayQueue: true } : undefined
    })
    return response.data
  },

  checkDoctorAvailability: async (
    doctorId: string,
    date: string,
    sessionId?: string,
    branchId?: string
  ): Promise<DoctorAvailabilityResult> => {
    const response = await api.get('/leaves/check-doctor-availability', {
      params: { doctorId, date, sessionId, branchId }
    })
    return response.data
  }
}
