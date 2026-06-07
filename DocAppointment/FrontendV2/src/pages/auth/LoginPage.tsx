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
        { email: response.email, role: response.role, orgId: response.orgId, branchId: response.branchId },
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
    <Card className="border-zinc-200/50 bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-900/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-zinc-900">Welcome back</CardTitle>
        <CardDescription className="text-center text-zinc-500">
          Enter your email and password to sign in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {serverError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-700 font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all hover:border-zinc-400"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-700 font-medium">Password</Label>
              <Link to="#" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors font-medium">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all hover:border-zinc-400"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>
          <Button 
            type="submit" 
            className="w-full bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-600/20 py-5 text-base mt-2 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-2">
        <p className="text-center text-sm text-zinc-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold">
            Sign up Organization
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
