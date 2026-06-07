import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/services/authService"

const registerSchema = z.object({
  orgName: z.string().min(2, { message: "Organization name is required." }),
  orgSlug: z.string().min(2, { message: "Slug is required." }).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  adminEmail: z.string().email({ message: "Please enter a valid email address." }),
  adminPhoneNumber: z.string().min(10, { message: "Phone number must be valid." }),
  adminPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

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
      await authService.registerOrganization(data)
      // On success, redirect to login page
      navigate("/login")
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Failed to register organization. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-zinc-200/50 bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-900/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-zinc-900">Register Organization</CardTitle>
        <CardDescription className="text-center text-zinc-500">
          Set up your clinic and admin account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {serverError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-zinc-700 font-medium">Clinic Name</Label>
              <Input
                id="orgName"
                placeholder="HealthPlus Clinic"
                className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                {...register("orgName")}
              />
              {errors.orgName && <p className="text-sm text-red-500 mt-1 font-medium">{errors.orgName.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgSlug" className="text-zinc-700 font-medium">Clinic Slug</Label>
              <Input
                id="orgSlug"
                placeholder="healthplus"
                className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                {...register("orgSlug")}
              />
              {errors.orgSlug && <p className="text-sm text-red-500 mt-1 font-medium">{errors.orgSlug.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail" className="text-zinc-700 font-medium">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@healthplus.com"
              className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              {...register("adminEmail")}
            />
            {errors.adminEmail && <p className="text-sm text-red-500 mt-1 font-medium">{errors.adminEmail.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPhoneNumber" className="text-zinc-700 font-medium">Admin Phone</Label>
            <Input
              id="adminPhoneNumber"
              placeholder="+1234567890"
              className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              {...register("adminPhoneNumber")}
            />
            {errors.adminPhoneNumber && <p className="text-sm text-red-500 mt-1 font-medium">{errors.adminPhoneNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPassword" className="text-zinc-700 font-medium">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              {...register("adminPassword")}
            />
            {errors.adminPassword && <p className="text-sm text-red-500 mt-1 font-medium">{errors.adminPassword.message}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-600/20 py-5 text-base mt-4 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </span>
            ) : "Register Organization"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-2">
        <p className="text-center text-sm text-zinc-500 mt-2">
          Already registered?{" "}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
