import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Send, Save, X, Activity, CheckCircle2,
  Plug, BookOpen, KeyRound, ExternalLink,
  Eye, EyeOff, ShieldCheck, RefreshCw,
  AlertCircle, Check
} from "lucide-react"
import toast from "react-hot-toast"
import { branchService } from "@/services/branchService"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"

interface TelegramConfigModalProps {
  branch: any
  onClose: () => void
}

export default function TelegramConfigModal({ branch, onClose }: TelegramConfigModalProps) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(branch?.telegramBotToken || "")
  const [showToken, setShowToken] = useState(false)
  const [apiError, setApiError] = useState<any>(null)
  const [validationError, setValidationError] = useState("")
  const [botInfo, setBotInfo] = useState<any>(null)
  const [isSettingWebhook, setIsSettingWebhook] = useState(false)

  const isConfigured = !!branch?.telegramBotToken || !!branch?.isTelegramConfigured

  const testConnectionMutation = useMutation({
    mutationFn: (t: string) => branchService.testTelegramConnection(t),
    onSuccess: (data) => {
      setBotInfo(data)
      toast.success("Bot connected successfully!")
      setApiError(null)
      setValidationError("")
    },
    onError: (error: any) => {
      setBotInfo(null)
      setApiError(error)
      toast.error("Bot connection failed. Please verify the token.")
      setValidationError("Connection failed. Please check the token with @BotFather.")
    }
  })

  // Auto-test on mount if branch already has a token
  useEffect(() => {
    if (branch?.telegramBotToken) {
      testConnectionMutation.mutate(branch.telegramBotToken)
    }
  }, [branch?.id])

  const handleTest = () => {
    if (!token.trim()) {
      setValidationError("Please enter a bot HTTP API token first.")
      return
    }
    setValidationError("")
    testConnectionMutation.mutate(token.trim())
  }

  const handleSetWebhook = async () => {
    if (!token.trim()) return
    setIsSettingWebhook(true)
    try {
      const apiPath = import.meta.env.VITE_API_URL || ""
      let webhookUrl = ""
      if (apiPath.startsWith("http")) {
        webhookUrl = `${apiPath}/telegram/webhook/${branch.id}`
      } else {
        webhookUrl = `${window.location.origin}${apiPath}/telegram/webhook/${branch.id}`
      }
      await branchService.setTelegramWebhook(token.trim(), webhookUrl)
      toast.success("Webhook configured successfully!")
      handleTest() // Refresh webhook info
    } catch (e: any) {
      toast.error("Failed to set webhook: " + (e.response?.data?.message || e.message))
    } finally {
      setIsSettingWebhook(false)
    }
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => branchService.updateBranch(branch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setApiError(null)
      toast.success("Telegram configuration saved successfully")
      onClose()
    },
    onError: (error: any) => {
      setApiError(error)
    }
  })

  const handleSave = () => {
    if (!token.trim()) {
      setValidationError("Bot token cannot be empty.")
      return
    }
    updateMutation.mutate({ ...branch, telegramBotToken: token.trim() })
  }

  if (!branch) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation()
          onClose()
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Telegram Bot Configuration</h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isConfigured ? 'Active Channel' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Facility: <strong className="text-slate-700">{branch.name}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const event = new CustomEvent('open-branch-guide', { detail: { channel: 'telegram' } })
                window.dispatchEvent(event)
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Telegram Guide</span>
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }} 
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <ApiErrorAlert error={apiError} />

          {/* Channel Overview & BotFather Banner */}
          <div className="bg-gradient-to-r from-sky-50/80 via-white to-slate-50 border border-sky-200/80 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span>Dedicated Telegram Channel</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                Patients can access your clinic mini-app, book OPD tokens, and track real-time queue numbers directly inside Telegram.
              </p>
            </div>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 bg-white border border-sky-200 hover:border-sky-300 text-sky-700 hover:bg-sky-50/80 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <span>Open @BotFather</span>
              <ExternalLink className="w-3 h-3 text-sky-500" />
            </a>
          </div>

          {/* Quick 4-Step Process Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <span className="font-medium text-slate-700 truncate">@BotFather</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <span className="font-medium text-slate-700 truncate">Send /newbot</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <span className="font-medium text-slate-700 truncate">Paste Token</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
              <span className="font-medium text-slate-700 truncate">Test & Webhook</span>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Bot Authentication Credentials
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    HTTP API Token generated by BotFather
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Bot HTTP API Token <span className="text-rose-500">*</span></span>
                {token && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {token.length} chars
                  </span>
                )}
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="telegram_bot_token_field"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    value={token}
                    style={showToken ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                    onChange={(e) => {
                      setToken(e.target.value)
                      setValidationError("")
                      setBotInfo(null)
                    }}
                    placeholder="e.g. 7123456789:AAHq_xSampleTokenString..."
                    className={`saas-input w-full pr-10 font-mono text-xs ${
                      validationError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testConnectionMutation.isPending || !token.trim()}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  {testConnectionMutation.isPending ? (
                    <Activity className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  ) : (
                    <Plug className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>Test Connection</span>
                </button>
              </div>

              {validationError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verified Bot Identity & Webhook Card */}
          {botInfo && botInfo.success && (
            <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 rounded-lg p-5 shadow-2xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {botInfo.bot?.result?.first_name || "Telegram Bot"}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    </div>
                    <p className="text-xs font-medium text-emerald-800 flex items-center gap-1 mt-0.5">
                      <span>@{botInfo.bot?.result?.username}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">ID: {botInfo.bot?.result?.id}</span>
                    </p>
                  </div>
                </div>

                {botInfo.bot?.result?.username && (
                  <a
                    href={`https://t.me/${botInfo.bot?.result?.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <span>Open in App</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Webhook Status Section */}
              <div className="bg-white border border-slate-200/80 rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">Webhook Binding:</span>
                    {botInfo.webhook?.result?.url ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Not Bound
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSetWebhook}
                    disabled={isSettingWebhook}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                  >
                    {isSettingWebhook ? (
                      <Activity className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>Set Webhook Automatically</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded p-2 text-slate-600 break-all">
                  {botInfo.webhook?.result?.url || "No webhook URL registered yet. Click 'Set Webhook Automatically' to bind this bot."}
                </div>

                {botInfo.webhook?.result?.pending_update_count !== undefined && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Pending updates in queue: <strong className="text-slate-700">{botInfo.webhook.result.pending_update_count}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Encrypted & isolated per clinic branch.</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="btn-cancel h-10 px-4 text-xs font-semibold"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              type="button"
              onClick={handleSave} 
              disabled={updateMutation.isPending || !token.trim()}
              className="h-10 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:translate-y-0 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <Activity className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
