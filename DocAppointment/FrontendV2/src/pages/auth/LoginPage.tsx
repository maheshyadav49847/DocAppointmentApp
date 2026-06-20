import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Lock, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"
import { useAuthStore } from "@/store/authStore"

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setServerError(null)
    try {
      const response = await authService.login({
        email: data.email,
        password: data.password
      })
      
      setAuth(
        { email: response.email, role: response.role, orgId: response.orgId, branchId: response.branchId, doctorId: response.doctorId },
        response.token
      )
      
      // Redirect to dashboard (assuming / is dashboard)
      navigate("/")
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-start">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          Welcome <span className="text-indigo-600">back</span>
        </h2>
        <p className="text-slate-500 mt-2 text-sm">Please enter your details to sign in to your account.</p>
      </div>
      
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        {serverError && (
          <div className="bg-red-50/50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {serverError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-indigo-600" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
               {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" />
              Password
            </Label>
            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline transition-colors font-medium">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300 tracking-widest placeholder:tracking-normal"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
               {errors.password.message}
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          variant="outline"
          className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl h-12 text-base mt-4 font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-600/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign in <LogIn className="w-5 h-5" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-8">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold transition-colors">
          Sign up Organization
        </Link>
      </p>
    </div>
  )
}
