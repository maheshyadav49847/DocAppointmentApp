import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthUser {
  email: string
  role: string
  orgId: string
  branchId: string | null
  doctorId?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setBranch: (branchId: string) => void
  activeBranchId: string | null
  setActiveBranchId: (branchId: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      activeBranchId: null,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true, activeBranchId: user.branchId || null }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false, activeBranchId: null }),
      setBranch: (branchId) => set((state) => ({ user: state.user ? { ...state.user, branchId } : null })),
      setActiveBranchId: (branchId) => set({ activeBranchId: branchId })
    }),
    {
      name: "auth-storage", // stores state in localStorage
    }
  )
)
