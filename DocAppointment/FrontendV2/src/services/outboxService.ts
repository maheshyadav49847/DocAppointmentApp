import { api } from "@/lib/axios";

export interface OutboxMessageItem {
  id: string;
  branchId: string;
  branchName: string;
  tokenId?: string;
  tokenNumber?: number;
  patientName?: string;
  patientVisitId?: string;
  channel: string;
  messageType: string;
  priority: number;
  recipient: string;
  messageBody?: string;
  fileName?: string;
  hasFile: boolean;
  status: "Pending" | "Processing" | "Sent" | "Failed" | "DeadLetter";
  retryCount: number;
  maxRetries: number;
  nextRetryAtUtc?: string;
  processedAtUtc?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface OutboxReportResponse {
  totalCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  deadLetterCount: number;
  page: number;
  pageSize: number;
  items: OutboxMessageItem[];
}

export const outboxService = {
  getMessages: async (params: {
    branchId?: string;
    channel?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<OutboxReportResponse> => {
    const cleanParams: any = { ...params };
    if (cleanParams.branchId === "all" || cleanParams.branchId === "org") delete cleanParams.branchId;
    if (cleanParams.channel === "All") delete cleanParams.channel;
    if (cleanParams.status === "All") delete cleanParams.status;
    if (!cleanParams.search) delete cleanParams.search;

    const response = await api.get("/outbox/messages", { params: cleanParams });
    return response.data;
  },

  retryMessage: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/outbox/messages/${id}/retry`);
    return response.data;
  }
};
