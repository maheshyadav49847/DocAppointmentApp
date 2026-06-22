import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Shield, KeyRound, Smartphone, Save, Activity, X, Link as LinkIcon, Hash, Phone, MessageSquare
} from "lucide-react"

import { whatsappConfigService } from "@/services/whatsappConfigService"
import { useAuthStore } from "@/store/authStore"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const orgId = user?.orgId
  const queryClient = useQueryClient()

  const [isTwilioDrawerOpen, setIsTwilioDrawerOpen] = useState(false)

  const { data: twilioData } = useQuery({
    queryKey: ['twilioConfig'],
    queryFn: whatsappConfigService.getConfig,
    enabled: !!orgId && ['orgadmin', 'superadmin'].includes(role)
  })

  const saveTwilioMutation = useMutation({
    mutationFn: (data: any) => whatsappConfigService.saveConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilioConfig'] })
      setIsTwilioDrawerOpen(false)
      alert("Twilio settings saved successfully.")
    }
  })

  const testTwilioMutation = useMutation({
    mutationFn: (data: any) => whatsappConfigService.testConnection(data),
    onSuccess: (res) => {
      if (res.connected) alert('Connection successful!')
      else alert('Could not authenticate with Twilio.')
    },
    onError: () => alert('Test request failed.')
  })

  const handleTwilioSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    let authToken = formData.get('authToken') as string
    if (authToken === '********') authToken = ''
    
    const data = {
      accountSid: formData.get('accountSid') as string,
      authToken,
      fromNumber: formData.get('fromNumber') as string
    }
    saveTwilioMutation.mutate(data)
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Organization</span>
              <span className="text-indigo-600">Settings</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage global configurations and your personal profile.</p>
          </div>
        </div>
        {['orgadmin', 'superadmin'].includes(role) && (
          <button 
            onClick={() => setIsTwilioDrawerOpen(true)}
            className="btn-secondary"
          >
            <Smartphone className="w-4 h-4" /> Global Twilio Config
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="mt-6 max-w-2xl space-y-6">
        <div className="saas-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" /> Account Information
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Email Address</p>
                <p className="text-lg font-bold text-slate-900">{user?.email}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Access Role</p>
                <div className="mt-0.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                  {user?.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="saas-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" /> Security
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              To change your password or update sensitive security credentials, please contact your organization administrator or use the forgot password flow on the login screen.
            </p>
          </div>
        </div>
      </div>

      {/* Twilio Config Drawer */}
      <AnimatePresence>
        {isTwilioDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTwilioDrawerOpen(false)}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">Global</span>
                      <span className="text-indigo-600">Twilio Config</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure credentials used by all branches.</p>
                  </div>
                </div>
                <button onClick={() => setIsTwilioDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form noValidate id="twilio-form" onSubmit={handleTwilioSubmit} className="space-y-5">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-6 flex gap-3">
                    <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
                    <p className="text-sm text-indigo-800">These credentials securely connect your organization's automated message routing directly to Twilio infrastructure.</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Hash className="w-4 h-4 text-blue-500" /> Account SID
                    </label>
                    <input required name="accountSid" defaultValue={twilioData?.accountSid} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <KeyRound className="w-4 h-4 text-amber-500" /> Auth Token
                    </label>
                    <input required type="password" name="authToken" defaultValue={twilioData?.authTokenConfigured ? '********' : ''} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                      <Phone className="w-4 h-4 text-green-500" /> Master Outbound Number
                    </label>
                    <input required name="fromNumber" defaultValue={twilioData?.fromNumber} placeholder="whatsapp:+1415..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t bg-white flex flex-col sm:flex-row justify-between gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    const form = document.getElementById('twilio-form') as HTMLFormElement
                    if(form) {
                      testTwilioMutation.mutate({
                        accountSid: (form.elements.namedItem('accountSid') as HTMLInputElement).value,
                        authToken: (form.elements.namedItem('authToken') as HTMLInputElement).value === '********' ? '' : (form.elements.namedItem('authToken') as HTMLInputElement).value,
                        fromNumber: (form.elements.namedItem('fromNumber') as HTMLInputElement).value
                      })
                    }
                  }}
                  disabled={testTwilioMutation.isPending}
                  className="btn-secondary"
                >
                  {testTwilioMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} Test Connection
                </button>
                <div className="flex gap-3">
                  <button type="submit" form="twilio-form" disabled={saveTwilioMutation.isPending} className="btn-primary flex-1 sm:flex-none justify-center">
                    {saveTwilioMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
