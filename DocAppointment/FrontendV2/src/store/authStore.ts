import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthUser {
  email: string
  role: string
  orgId: string
  branchId: string | null
  doctorId?: string
  permissions?: string[]
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
      setAuth: (user, token) => {
        let permissions: string[] = [];
        try {
          const payloadStr = atob(token.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          if (payload.permissions) {
            permissions = payload.permissions.split(',');
          }
        } catch (e) {
          console.error("Failed to decode token permissions", e);
        }
        
        const finalUser = { ...user, permissions };
        set({ user: finalUser, token, isAuthenticated: true, activeBranchId: finalUser.branchId || null });
      },
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false, activeBranchId: null }),
      setBranch: (branchId) => set((state) => ({ user: state.user ? { ...state.user, branchId } : null })),
      setActiveBranchId: (branchId) => set({ activeBranchId: branchId })
    }),
    {
      name: "auth-storage", // stores state in localStorage
    }
  )
)
