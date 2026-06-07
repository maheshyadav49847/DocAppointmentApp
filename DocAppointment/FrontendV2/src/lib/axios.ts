import axios from "axios"
import { useAuthStore } from "@/store/authStore"

// Base Axios instance configured to point to our proxy which maps to http://localhost:5001
export const api = axios.create({
  baseURL: "/api",
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
    if (error.response?.status === 401) {
      console.error("Unauthorized: Session expired or invalid. Clearing local state.")
      // Clear store to force redirect to login
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
