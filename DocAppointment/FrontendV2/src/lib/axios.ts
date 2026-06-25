import axios from "axios"
import { useAuthStore } from "@/store/authStore"
import toast from "react-hot-toast"

// Base Axios instance configured to point to our proxy which maps to http://localhost:5001
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1.0",
  withCredentials: true, // Send cookies like jwt_token
  headers: {
    "Content-Type": "application/json",
  },
})

// Optional: Interceptors for request/response handling globally
api.interceptors.request.use((config) => {
  const branchId = useAuthStore.getState().activeBranchId
  if (branchId) {
    config.headers['X-Branch-Id'] = branchId
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can handle global 401 Unauthorized errors here
    // But do not redirect if the error is from the login endpoint itself, so we can show the error message.
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
      console.error("Unauthorized: Session expired or invalid. Clearing local state.")
      // Clear store to force redirect to login
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      console.error("Forbidden: You do not have permission to perform this action.")
      toast.error("You do not have permission to perform this action.", {
        id: "forbidden-error", // Prevent duplicate toasts
        duration: 4000
      })
    }
    return Promise.reject(error)
  }
)
