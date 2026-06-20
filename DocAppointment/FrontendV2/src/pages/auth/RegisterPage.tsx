import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Building, Link as LinkIcon, Mail, Phone, Lock, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"

const registerSchema = z.object({
  orgName: z.string().min(2, { message: "Organization name is required." }),
  orgSlug: z.string().min(2, { message: "Slug is required." }).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  adminEmail: z.string().email({ message: "Please enter a valid email address." }),
  adminPhoneNumber: z.string().min(10, { message: "Phone number must be valid." }),
  adminPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[!@#$%^&*()_+=\[{\]};:<>|./?,-]/, { message: "Password must contain at least one special character." }),
  confirmPassword: z.string().min(8, { message: "Please confirm your password." })
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    setServerError(null)
    try {
      await authService.registerOrganization({
        orgName: data.orgName,
        orgSlug: data.orgSlug,
        adminEmail: data.adminEmail,
        adminPhoneNumber: data.adminPhoneNumber,
        adminPassword: data.adminPassword,
      })
      // On success, redirect to login page
      navigate("/login")
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Failed to register organization. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-start">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          Create <span className="text-indigo-600">Organization</span>
        </h2>
        <p className="text-slate-500 mt-2 text-sm">Enter your details to set up your hospital's portal.</p>
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
          <Label htmlFor="orgName" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
            <Building className="h-4 w-4 text-indigo-600" />
            Organization Name
          </Label>
          <Input
            id="orgName"
            placeholder="e.g. LifeCare Hospital"
            className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
            {...register("orgName")}
          />
          {errors.orgName && (
            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
               {errors.orgName.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgSlug" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
            <LinkIcon className="h-4 w-4 text-indigo-600" />
            Unique URL Slug
          </Label>
          <div className="relative flex items-center">
            <Input
              id="orgSlug"
              placeholder="lifecare-hospital"
              className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 pl-4 pr-24 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
              {...register("orgSlug")}
            />
            <span className="absolute right-4 text-slate-400 text-sm font-medium select-none">
              .docapp.live
            </span>
          </div>
          {errors.orgSlug ? (
             <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
               {errors.orgSlug.message}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1.5">Used for your hospital's public booking page.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminEmail" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-indigo-600" />
              Admin Email Address
            </Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@example.com"
              className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
              {...register("adminEmail")}
            />
            {errors.adminEmail && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.adminEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminPhoneNumber" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-indigo-600" />
              Admin Phone Number
            </Label>
            <Input
              id="adminPhoneNumber"
              placeholder="+91 9876543210"
              className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
              {...register("adminPhoneNumber")}
            />
            {errors.adminPhoneNumber && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.adminPhoneNumber.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="adminPassword" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" />
              Password
            </Label>
            <Input
              id="adminPassword"
              type="password"
              placeholder="••••••••"
              className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
              {...register("adminPassword")}
            />
            {errors.adminPassword && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.adminPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" />
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.confirmPassword.message}
              </p>
            )}
          </div>
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
              Creating Account...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Register Organization <UserPlus className="w-5 h-5" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-8">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
