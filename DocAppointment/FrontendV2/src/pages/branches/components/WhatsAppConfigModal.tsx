import { 
  Smartphone, CheckCircle2, 
  X
} from "lucide-react"

import MetaEmbeddedSignup from "./MetaEmbeddedSignup"

export default function WhatsAppConfigModal({ branch, onClose }: { branch: any, onClose: () => void }) {
  if (!branch) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Configuration</h2>
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
           <div className="bg-white rounded-lg border border-slate-200 h-full min-h-[450px] flex flex-col relative overflow-hidden shadow-sm p-8">
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto relative z-10">
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-200">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Meta Cloud Configuration</h2>
                <p className="text-slate-600 mb-4">
                  Node <strong>{branch.name}</strong> connects via the official Meta Cloud API.
                  Messages are routed instantly and securely without device syncing.
                </p>

                <div className="w-full pt-6 border-t border-slate-100 mt-6">
                  <MetaEmbeddedSignup branchId={branch.id} onSuccess={() => window.location.reload()} />
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
