import { useAuthStore } from "@/store/authStore"

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  
  const permissions = user?.permissions || []
  const isSuperAdmin = user?.role === "SuperAdmin"
  const isOrgAdmin = user?.role === "OrgAdmin"
  
  // Method to check if user has a specific permission
  const can = (permission: string) => {
    if (isSuperAdmin) return true; // SuperAdmin can do anything
    return permissions.includes(permission);
  }
  
  // Method to check if user has ANY of the provided permissions
  const canAny = (permissionList: string[]) => {
    if (isSuperAdmin) return true;
    return permissionList.some(p => permissions.includes(p));
  }
  
  // Method to check if user has ALL of the provided permissions
  const canAll = (permissionList: string[]) => {
    if (isSuperAdmin) return true;
    return permissionList.every(p => permissions.includes(p));
  }

  return {
    permissions,
    isSuperAdmin,
    isOrgAdmin,
    can,
    canAny,
    canAll
  }
}
