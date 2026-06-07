import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthUser {
  email: string
  role: string
  orgId: string
  branchId: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setBranch: (branchId: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
      setBranch: (branchId) => set((state) => ({ user: state.user ? { ...state.user, branchId } : null })),
    }),
    {
      name: "auth-storage", // stores state in localStorage
    }
  )
)
