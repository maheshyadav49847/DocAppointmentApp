import { useState, useEffect } from "react"
import { ClipboardList, Search, ChevronLeft, ChevronRight, Activity } from "lucide-react"
import { auditLogService, type AuditLog } from "@/services/auditLogService"
import { cn } from "@/lib/utils"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadLogs()
  }, [page])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) loadLogs()
      else setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await auditLogService.getAuditLogs(search, page, 20)
      setLogs(res.data)
      setTotalPages(res.totalPages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (status >= 400 && status < 500) return "text-amber-600 bg-amber-50 border-amber-200"
    if (status >= 500) return "text-rose-600 bg-rose-50 border-rose-200"
    return "text-slate-600 bg-slate-50 border-slate-200"
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET": return "text-blue-600"
      case "POST": return "text-emerald-600"
      case "PUT": return "text-amber-600"
      case "DELETE": return "text-rose-600"
      default: return "text-slate-600"
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col h-full min-h-0 gap-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">System</span>
              <span className="text-indigo-600">Audit Logs</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Monitor and track all system activities, actions, and API requests.
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="relative w-full sm:w-96 group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by action, path, or user ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="saas-input !pl-9"
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 p-4 sm:p-6 bg-slate-50/30 min-h-0 flex flex-col">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 outline outline-1 outline-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Method & Path</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Activity className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-xs w-10", getMethodColor(log.method))}>
                          {log.method}
                        </span>
                        <span className="text-slate-700 max-w-[200px] truncate" title={log.path}>
                          {log.path}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-900 font-medium">
                      {log.action || "API Request"}
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-md border", getStatusColor(log.statusCode))}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs max-w-[150px] truncate">
                      {log.userName ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{log.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5" title={log.userId}>{log.userId}</span>
                        </div>
                      ) : (
                        <span className="font-mono" title={log.userId || ""}>{log.userId || "Anonymous"}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages || 1}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
