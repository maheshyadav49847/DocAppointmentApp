import { Pill, Activity, ArrowRight } from "lucide-react"

export default function PharmacyPage() {
  return (
    <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="p-5 rounded-3xl text-cyan-500 flex items-center justify-center border-2 border-cyan-100 bg-transparent mb-6">
        <Pill className="w-12 h-12" />
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Consultation Workspace</h1>
      
      <p className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
        We're building a comprehensive electronic health record (EHR) and e-prescription portal. This module will allow doctors to manage prescriptions, vitals, and lab reports directly from the dashboard.
      </p>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full mb-8 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
        
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4 relative z-10">
          <Activity className="w-4 h-4 text-cyan-500" /> Coming Soon Features
        </h3>
        
        <ul className="space-y-3 relative z-10">
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            E-Prescription Management
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            Patient Vitals Tracking
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            Lab Report Integration
          </li>
        </ul>
      </div>

      <button className="btn-primary">
        Learn more about upcoming updates <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
