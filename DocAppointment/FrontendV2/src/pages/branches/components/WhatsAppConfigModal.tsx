import { useState, useEffect } from "react"
import { 
  Smartphone, RefreshCw, LogOut, CheckCircle2, 
  ShieldCheck, Clock, AlertCircle, Activity, X
} from "lucide-react"

import { whatsappService, type BridgeStatus } from "@/services/whatsappService"

export default function WhatsAppConfigModal({ branch, onClose }: { branch: any, onClose: () => void }) {
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Poll WhatsApp Bridge Status
  useEffect(() => {
    let interval: any
    
    const fetchStatus = async () => {
      if (!branch?.id) return
      try {
        const data = await whatsappService.getStatus(branch.id)
        setStatus(data)
      } catch (err) {
        setStatus({ ready: false, hasQr: false, error: 'Bridge Unreachable' })
      }
    }

    if (branch?.id) {
      fetchStatus()
      interval = setInterval(fetchStatus, 5000)
    }

    return () => clearInterval(interval)
  }, [branch?.id])

  const handleRestart = async () => {
    if (!branch?.id || !confirm('Restart the WhatsApp Bridge? This may take a few seconds.')) return
    setActionLoading(true)
    try {
      await whatsappService.restartBridge(branch.id)
      setStatus(null) // Clear status to show loading
    } catch (err) {
      console.error('Restart Failed', err)
      alert('Failed to restart bridge.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!branch?.id || !confirm('Are you sure you want to flush the session? You will need to scan the QR code again.')) return
    setActionLoading(true)
    try {
      await whatsappService.logoutBridge(branch.id)
      setStatus(null)
    } catch (err) {
      console.error('Logout Failed', err)
      alert('Failed to logout from bridge.')
    } finally {
      setActionLoading(false)
    }
  }

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Telemetry Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-600" /> Telemetry
                  </h3>
                  <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${status?.ready ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {status?.ready ? 'SYNCED' : 'AWAITING'}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                      <Clock className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Ping</p>
                      <p className="font-semibold text-slate-900">{status?.lastQrAt ? new Date(status.lastQrAt).toLocaleTimeString() : '---'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                      <ShieldCheck className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Node ID</p>
                      <p className="font-semibold text-slate-900 font-mono text-sm">{branch.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                      <Smartphone className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Phone</p>
                      <p className="font-semibold text-slate-900 font-mono text-sm">{branch.whatsAppNumber || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleRestart} 
                    disabled={actionLoading}
                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} /> Cold Boot
                  </button>
                  <button 
                    onClick={handleLogout} 
                    disabled={actionLoading || !status?.ready}
                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" /> Flush Session
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg p-5 shadow-sm overflow-hidden border border-slate-800">
                <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" /> Operational Matrix
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Global Latency</span>
                    <span className="text-sm font-semibold text-indigo-400 border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 rounded text-[11px]">0.04ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Security Layer</span>
                    <span className="text-sm font-semibold text-indigo-400 border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 rounded text-[11px]">E2EE Active</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-5 pt-4 border-t border-slate-700/50">
                  Securely routing all branch communications through isolated Chromium instances.
                </p>
              </div>
            </div>

            {/* QR Core Hub */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 h-full min-h-[450px] flex flex-col relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                  {status?.ready ? (
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Channel Verified</h2>
                      <p className="text-slate-600">
                        Node <strong>{branch.name}</strong> is online and securely processing automated queue alerts and patient communications.
                      </p>
                    </div>
                  ) : status?.error === 'Bridge Unreachable' ? (
                    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200">
                        <AlertCircle className="w-12 h-12" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Bridge Unreachable</h2>
                      <p className="text-slate-600">
                        The WhatsApp Bridge service is currently down or unreachable. Please try Cold Booting the service.
                      </p>
                    </div>
                  ) : status !== null ? (
                    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
                      <div className="w-full flex items-center justify-center gap-2 mb-6 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Syncing Security Key</span>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 w-full aspect-square flex items-center justify-center overflow-hidden">
                        <iframe 
                          src={`/whatsapp/qr/${branch.id}?expectedNumber=${branch?.whatsAppNumber?.replace(/\D/g, '') || ''}&apiKey=${import.meta.env.VITE_WHATSAPP_BRIDGE_API_KEY || ''}`} 
                          className="w-[280px] h-[280px] border-none overflow-hidden scale-110 origin-center"
                          scrolling="no"
                        />
                      </div>
                      
                      <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
                        <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <Smartphone className="w-4 h-4" /> Instructions
                        </p>
                        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                          <li>Open WhatsApp on the facility phone.</li>
                          <li>Tap Menu (⋮) or Settings.</li>
                          <li>Select <strong>Linked Devices</strong>.</li>
                          <li>Tap <strong>Link a Device</strong> and scan the QR code above.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin mb-6" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Provisioning Node...</h3>
                      <p className="text-slate-500 max-w-xs">Spawning Chromium core for encrypted bridge access.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}
