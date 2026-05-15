import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  orgId: string | null;
  branchId: string | null;
  setAuth: (data: { token: string; email: string; role: string; orgId: string; branchId: string | null }) => void;
  setBranch: (branchId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      role: null,
      orgId: null,
      branchId: null,
      setAuth: (data) => set({ ...data }),
      setBranch: (branchId) => set({ branchId }),
      logout: () => set({ token: null, email: null, role: null, orgId: null, branchId: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        email: state.email, 
        role: state.role, 
        orgId: state.orgId, 
        branchId: state.branchId 
      }),
    }
  )
);
