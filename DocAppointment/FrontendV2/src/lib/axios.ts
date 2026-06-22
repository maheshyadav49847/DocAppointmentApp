import axios from "axios"
import { useAuthStore } from "@/store/authStore"

// Base Axios instance configured to point to our proxy which maps to http://localhost:5001
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1.0",
  withCredentials: true, // Send cookies like jwt_token
  headers: {
    "Content-Type": "application/json",
  },
})

// Optional: Interceptors for request/response handling globally
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
    }
    return Promise.reject(error)
  }
)
