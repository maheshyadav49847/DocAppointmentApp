import { Outlet } from "react-router-dom"
import { Activity, MessageSquare, Building2, Sparkles } from "lucide-react"
import { BrandLogo } from '../components/BrandLogo'

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex bg-white">

      {/* Left Half - Premium Details Section */}
      <div className="hidden lg:flex w-1/2 relative bg-indigo-900 overflow-hidden flex-col justify-between p-12 xl:p-16 border-r border-indigo-950">

        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

        <div className="relative z-10">
          <BrandLogo theme="dark" size="xl" showSubtitle align="start" />
        </div>

        {/* Middle Content - Application Details */}
        <div className="relative z-10 w-full mt-16 mb-auto animate-in fade-in slide-in-from-left-8 duration-1000 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-sm font-semibold mb-6 shadow-sm backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300" /> AI-Powered Platform
          </div>

          <div className="mt-8">
            <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
              Wait Less.<br />
              <span className="text-indigo-300">Care More.</span>
            </h1>
            <p className="mt-6 text-indigo-100/90 text-lg lg:text-xl max-w-md font-medium leading-relaxed">
              The intelligent clinic OS. Manage queues, appointments, and patient records seamlessly.
            </p>
          </div>

          <div className="space-y-5 mt-12">
            <div className="flex items-start gap-5 group p-5 -ml-5 rounded-lg bg-white/5 hover:bg-white/10 hover:shadow-xl hover:shadow-indigo-900/10 transition-all duration-300 border border-white/10 hover:border-white/20">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white group-hover:border-white transition-all duration-300 shadow-sm">
                <Activity className="w-6 h-6 text-white group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-wide">AI-Powered Analytics</h3>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed pr-4 font-medium">Predict patient flow, estimate wait times, and maximize doctor efficiency effortlessly.</p>
              </div>
            </div>

            <div className="flex items-start gap-5 group p-5 -ml-5 rounded-lg bg-white/5 hover:bg-white/10 hover:shadow-xl hover:shadow-indigo-900/10 transition-all duration-300 border border-white/10 hover:border-white/20">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white group-hover:border-white transition-all duration-300 shadow-sm">
                <MessageSquare className="w-6 h-6 text-white group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-wide">WhatsApp Integration</h3>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed pr-4 font-medium">Automatically notify patients about their turn, reducing crowding in the waiting room.</p>
              </div>
            </div>

            <div className="flex items-start gap-5 group p-5 -ml-5 rounded-lg bg-white/5 hover:bg-white/10 hover:shadow-xl hover:shadow-indigo-900/10 transition-all duration-300 border border-white/10 hover:border-white/20">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white group-hover:border-white transition-all duration-300 shadow-sm">
                <Building2 className="w-6 h-6 text-white group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-wide">Multi-Branch Support</h3>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed pr-4 font-medium">Manage multiple clinics or hospital branches from a unified central dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 mt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="p-4 rounded-lg bg-white/10 border border-white/10 shadow-sm inline-flex items-center gap-5 hover:shadow-md transition-shadow cursor-default backdrop-blur-sm">
            <div className="flex -space-x-3">
              <img src="https://i.pravatar.cc/100?img=33" alt="Doctor 1" className="w-10 h-10 rounded-full border-2 border-indigo-600 shadow-sm" />
              <img src="https://i.pravatar.cc/100?img=47" alt="Doctor 2" className="w-10 h-10 rounded-full border-2 border-indigo-600 shadow-sm" />
              <img src="https://i.pravatar.cc/100?img=12" alt="Doctor 3" className="w-10 h-10 rounded-full border-2 border-indigo-600 shadow-sm" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Trusted by 500+ Hospitals</p>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Half - Form Container (Outlet) */}
      <div className="w-full lg:w-1/2 flex justify-center items-start pt-16 lg:pt-14 p-6 sm:p-12 lg:px-18 bg-slate-50 relative">
        <div className="w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-700 relative z-10 mt-8 lg:mt-0">

          {/* Mobile Logo */}
          <div className="lg:hidden flex mb-10 w-full justify-center">
            <BrandLogo theme="light" size="lg" showSubtitle align="center" />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}
