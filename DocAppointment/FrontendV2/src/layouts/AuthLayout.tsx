import { Outlet } from "react-router-dom"

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px]" />
      </div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10"></div>
      
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-white/60 border border-zinc-200 shadow-xl shadow-indigo-900/5 backdrop-blur-md">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">DocAppointments</h1>
          <p className="text-zinc-500 mt-2 font-medium">Manage your clinical schedule easily</p>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
