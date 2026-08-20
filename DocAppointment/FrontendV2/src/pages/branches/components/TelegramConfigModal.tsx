import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Save, X, Activity, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { branchService } from "@/services/branchService"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"

export default function TelegramConfigModal({ branch, onClose }: { branch: any, onClose: () => void }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(branch?.telegramBotToken || "")
  const [apiError, setApiError] = useState<any>(null)

  const [botInfo, setBotInfo] = useState<any>(null)

  const testConnectionMutation = useMutation({
    mutationFn: (t: string) => branchService.testTelegramConnection(t),
    onSuccess: (data) => {
      setBotInfo(data)
      toast.success("Bot connected successfully!")
      setApiError(null)
    },
    onError: (error: any) => {
      setBotInfo(null)
      setApiError(error)
    }
  })

  const handleTest = () => {
    if (!token) {
        toast.error("Please enter a bot token first.")
        return
    }
    testConnectionMutation.mutate(token)
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => branchService.updateBranch(branch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setApiError(null)
      toast.success("Telegram configuration updated successfully")
      onClose()
    },
    onError: (error: any) => {
      setApiError(error)
    }
  })

  const handleSave = () => {
    updateMutation.mutate({ ...branch, telegramBotToken: token })
  }

  if (!branch) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Telegram Configuration</h2>
              <p className="text-xs font-medium text-slate-500">Node: {branch.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
           <div className="bg-white rounded-lg border border-slate-200 relative shadow-sm p-6">
              <ApiErrorAlert error={apiError} />
              
              <div className="mb-6">
                 <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Connect Telegram Bot
                 </h3>
                 <p className="text-sm text-slate-600 mb-4">
                    Create a new bot via <strong>BotFather</strong> on Telegram and paste the HTTP API Token below. 
                    Telegram bots do not have phone numbers, they are accessed via their `@username`.
                 </p>
                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Bot Token</label>
                    <div className="flex gap-2">
                        <input 
                        type="text" 
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="e.g. 123456789:ABCdefGHIjklmnoPQRstuvWXYZ" 
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-mono text-sm"
                        />
                        <button 
                            onClick={handleTest}
                            disabled={testConnectionMutation.isPending}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            {testConnectionMutation.isPending && <Activity className="w-4 h-4 animate-spin" />}
                            Test Connection
                        </button>
                    </div>
                 </div>

                 {botInfo && botInfo.success && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold text-emerald-800">Connection Successful</h4>
                            <button
                                onClick={async () => {
                                    try {
                                        const apiPath = import.meta.env.VITE_API_URL;
                                        let webhookUrl = "";
                                        if (apiPath.startsWith("http")) {
                                            webhookUrl = `${apiPath}/telegram/webhook/${branch.id}`;
                                        } else {
                                            webhookUrl = `${window.location.origin}${apiPath}/telegram/webhook/${branch.id}`;
                                        }
                                        await branchService.setTelegramWebhook(token, webhookUrl);
                                        toast.success("Webhook configured successfully!");
                                        handleTest(); // Refresh info
                                    } catch (e: any) {
                                        toast.error("Failed to set webhook: " + (e.response?.data?.message || e.message));
                                    }
                                }}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded shadow-sm transition-colors"
                            >
                                Set Webhook Automatically
                            </button>
                        </div>
                        <div className="space-y-1 text-sm text-emerald-700">
                            <p><span className="font-medium">Bot Name:</span> {botInfo.bot?.result?.first_name}</p>
                            <p><span className="font-medium">Username:</span> @{botInfo.bot?.result?.username}</p>
                            <p className="break-all"><span className="font-medium">Webhook URL:</span> {botInfo.webhook?.result?.url || "Not set"}</p>
                        </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Cancel
           </button>
           <button 
             onClick={handleSave} 
             disabled={updateMutation.isPending}
             className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
           >
              {updateMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
           </button>
        </div>
      </div>
    </div>
  )
}
