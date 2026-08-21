import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { patientService } from "@/services/patientService"
import { api } from "@/lib/axios"
import { Search, Bot, User, AlertCircle, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react"

export default function ChatbotAnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [platform, setPlatform] = useState<"all" | "whatsapp" | "telegram">("all")

  // Fetch Patients for dropdown
  const { data: patientsData, isLoading: isLoadingPatients } = useQuery({
    queryKey: ["patientsSearch", searchTerm],
    queryFn: () => patientService.getPatients(undefined, 1, 10, searchTerm),
    enabled: searchTerm.length > 2 || selectedPatient === null // Load initial list or search
  })

  // Fetch Chat Logs for Selected Patient
  const { data: chatLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["chatbotLogs", selectedPatient?.id],
    queryFn: async () => {
      const res = await api.get(`/whatsapp/messages/${selectedPatient.id}/logs`)
      return res.data
    },
    enabled: !!selectedPatient?.id
  })

  const filteredLogs = chatLogs?.filter((log: any) => 
    (platform === "all" || log.platform === platform) && 
    !log.type.startsWith("BookingConfirmation")
  )
    .sort((a: any, b: any) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.direction === 'inbound' ? -1 : 1;
    }) || []

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
      case 'read':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-7 h-7 text-indigo-600" />
            Chatbot Process Analyzer
          </h1>
          <p className="text-slate-500 mt-1">Visualize request and bot reply flows to analyze drop-offs and failures.</p>
        </div>
        
        {/* Platform Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setPlatform("all")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platform === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setPlatform("whatsapp")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platform === 'whatsapp' ? 'bg-emerald-50 shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setPlatform("telegram")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platform === 'telegram' ? 'bg-sky-50 shadow-sm text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Telegram
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection Sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col h-[calc(100vh-180px)]">
          <div className="relative mb-4">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoadingPatients ? (
              <p className="text-center text-slate-400 text-sm mt-10">Loading...</p>
            ) : patientsData?.data?.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-10">No patients found</p>
            ) : (
              patientsData?.data?.map((patient: any) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedPatient?.id === patient.id 
                      ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                      : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-800 text-sm truncate">{patient.name}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">{patient.phone}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Flow Chart */}
        <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
          {selectedPatient ? (
            <>
              <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">Conversation Flow: {selectedPatient.name}</h2>
                  <p className="text-sm font-medium text-slate-500">{selectedPatient.phone}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> User Request</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300"></div> Bot Reply</div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 font-medium animate-pulse">Loading flow...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">No {platform !== 'all' ? platform : ''} conversation history found.</p>
                  </div>
                ) : (
                  <div className="relative max-w-2xl mx-auto">
                    {/* Connecting Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 z-0 hidden md:block"></div>
                    
                    <div className="space-y-8 relative z-10">
                      {filteredLogs.map((log: any) => {
                        const isUser = log.direction === "inbound";
                        const isTelegram = log.platform === "telegram";
                        
                        return (
                          <div key={log.id} className={`flex flex-col md:flex-row gap-4 items-center ${isUser ? "md:flex-row-reverse" : ""}`}>
                            
                            {/* Content Card */}
                            <div className={`w-full md:w-[calc(50%-2rem)] flex ${isUser ? "justify-end" : "justify-start"}`}>
                              <div className={`p-4 rounded-2xl shadow-sm border max-w-sm w-full ${
                                isUser 
                                  ? (isTelegram ? "bg-sky-50 border-sky-200" : "bg-emerald-50 border-emerald-200") + " rounded-tr-sm" 
                                  : "bg-indigo-50 border-indigo-200 rounded-tl-sm"
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    isUser 
                                      ? (isTelegram ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700") 
                                      : "bg-indigo-100 text-indigo-700"
                                  }`}>
                                    {log.type}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    {isTelegram ? "Telegram" : "WhatsApp"} &bull; {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                
                                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap break-words">
                                  {log.body || <span className="italic text-slate-400">Media/Template message</span>}
                                </p>
                                
                                {!isUser && (
                                  <div className="mt-3 pt-3 border-t border-indigo-100/50 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                      Status: <span className="flex items-center gap-1">{getStatusIcon(log.status)} {log.status}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {log.error && (
                                  <div className="mt-2 text-xs font-semibold text-red-600 flex items-start gap-1 bg-red-50 p-2 rounded-lg border border-red-100">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>{log.error}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Center Node */}
                            <div className="hidden md:flex shrink-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 items-center justify-center shadow-sm z-10">
                              {isUser ? <User className={`w-4 h-4 ${isTelegram ? 'text-sky-500' : 'text-emerald-500'}`} /> : <Bot className="w-4 h-4 text-indigo-500" />}
                            </div>
                            
                            {/* Empty spacer for alternating layout */}
                            <div className="hidden md:block w-[calc(50%-2rem)]"></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Select a patient to analyze their chatbot process.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
