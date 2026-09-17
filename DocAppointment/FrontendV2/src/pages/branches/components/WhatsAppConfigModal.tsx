import { 
  Smartphone, BookOpen, ShieldCheck,
  X
} from "lucide-react"

import MetaEmbeddedSignup from "./MetaEmbeddedSignup"

interface WhatsAppConfigModalProps {
  branch: any
  onClose: () => void
}

export default function WhatsAppConfigModal({ branch, onClose }: WhatsAppConfigModalProps) {
  if (!branch) return null

  const isConfigured = !!(branch?.isWhatsAppConfigured || branch?.metaPhoneNumberId || (branch?.whatsAppProvider === 'Twilio' && branch?.whatsAppNumber))

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
            <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">WhatsApp Configuration</h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isConfigured ? 'Active Meta Bot' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Facility: <strong className="text-slate-700">{branch.name}</strong></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const event = new CustomEvent('open-branch-guide', { detail: { channel: 'whatsapp' } })
                window.dispatchEvent(event)
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>WhatsApp Guide</span>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {/* Channel Overview Banner */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 border border-emerald-200/80 rounded-lg p-4 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Meta Official Cloud Tech Provider</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect facility phone number <strong className="text-slate-800">{branch.whatsAppDialCode || ''} {branch.whatsAppNumber}</strong> via Meta Embedded Signup. Messages route with 99.9% uptime without keeping a personal phone online.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
            <MetaEmbeddedSignup branch={branch} onSuccess={() => window.location.reload()} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted Meta Cloud credentials isolated per branch.</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="btn-cancel"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
