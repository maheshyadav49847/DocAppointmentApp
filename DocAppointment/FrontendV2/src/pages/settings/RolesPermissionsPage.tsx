import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Plus, Save, Activity, Trash2, ChevronLeft, Copy, X } from "lucide-react"
import toast from "react-hot-toast"

import { rolesService } from "@/services/rolesService"
import type { Role } from "@/services/rolesService"

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")

  // State for editing permissions of the selected role
  const [editedPermissions, setEditedPermissions] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getRoles
  })

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesService.getAvailablePermissions
  })

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, string[]> = {}
    allPermissions.forEach(p => {
      const parts = p.split('.')
      const module = parts[0]
      if (!groups[module]) groups[module] = []
      groups[module].push(p)
    })
    return groups
  }, [allPermissions])

  const selectedRole = roles.find(r => r.id === selectedRoleId)

  // Handle Role Selection
  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id)
    setEditedPermissions([...role.permissions])
    setIsDirty(false)
  }

  // Handle Create Role
  const createRoleMutation = useMutation({
    mutationFn: rolesService.createRole,
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsCreatingRole(false)
      setNewRoleName("")
      setNewRoleDesc("")
      toast.success("Role created successfully!")
      setSelectedRoleId(newId)
    },
    onError: () => toast.error("Failed to create role")
  })

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return
    createRoleMutation.mutate({ name: newRoleName, description: newRoleDesc, permissions: [] })
  }

  const handleCloneRole = () => {
    if (!selectedRole) return
    const cloneName = prompt("Enter name for the cloned role:", `${selectedRole.name} (Copy)`)
    if (!cloneName || !cloneName.trim()) return
    createRoleMutation.mutate({ name: cloneName.trim(), description: selectedRole.description, permissions: editedPermissions })
  }

  // Handle Save Permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: (data: { id: string, perms: string[] }) => rolesService.updatePermissions(data.id, data.perms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success("Permissions updated!")
      setIsDirty(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update permissions")
  })

  const handleSavePermissions = () => {
    if (!selectedRoleId) return
    updatePermissionsMutation.mutate({ id: selectedRoleId, perms: editedPermissions })
  }

  // Handle Delete Role
  const deleteRoleMutation = useMutation({
    mutationFn: rolesService.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setSelectedRoleId(null)
      toast.success("Role deleted successfully")
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete role. It might be assigned to users.")
  })

  const togglePermission = (perm: string) => {
    setEditedPermissions(prev => {
      const next = prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
      setIsDirty(true)
      return next
    })
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
      
      {/* Sidebar - Roles List */}
      <div className={`md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col ${selectedRoleId ? 'hidden md:flex' : 'flex'} w-full shrink-0`}>
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" /> Roles
            </h2>
            <p className="text-xs text-slate-500 mt-1">Manage access profiles</p>
          </div>
          <button 
            onClick={() => setIsCreatingRole(true)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoadingRoles ? (
            <div className="flex justify-center p-8">
              <Activity className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  selectedRoleId === role.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className={`font-semibold ${selectedRoleId === role.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {role.name}
                  </h3>
                  {role.isSystemDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      System
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{role.description}</p>
                )}
                <div className="mt-2 text-[10px] text-slate-400 font-medium">
                  {role.permissions.length} Permissions
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Permissions Editor */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white ${!selectedRoleId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedRoleId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Shield className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Select a Role</h3>
            <p className="text-sm mt-2 max-w-sm">Choose a role from the sidebar to view or modify its permissions, or create a new one.</p>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white z-10">
              <div className="flex items-start sm:items-center gap-3">
                <button 
                  onClick={() => setSelectedRoleId(null)}
                  className="md:hidden p-1.5 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{selectedRole?.name}</h2>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{selectedRole?.description || "No description provided."}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                    {selectedRole?.name !== 'SuperAdmin' && selectedRole?.name !== 'OrgAdmin' && (
                      <button 
                        onClick={handleCloneRole}
                        disabled={createRoleMutation.isPending}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                        title="Clone Role"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    )}
                    {!selectedRole?.isSystemDefault && (
                      <button 
                        onClick={() => {
                          if(confirm("Are you sure you want to delete this role?")) {
                            deleteRoleMutation.mutate(selectedRole!.id)
                          }
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        title="Delete Role"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={handleSavePermissions}
                      disabled={!isDirty || updatePermissionsMutation.isPending}
                      className={`btn-primary px-4 py-2 text-sm ${!isDirty && 'opacity-50 cursor-not-allowed'}`}
                    >
                      {updatePermissionsMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{module}</h3>
                      <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                        {perms.filter(p => editedPermissions.includes(p)).length} / {perms.length}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {perms.map(perm => {
                        const isChecked = editedPermissions.includes(perm);
                        const actionName = perm.split('.')[1] || perm;
                        const isLockedForOrgAdmin = selectedRole?.name === 'OrgAdmin' && perm === 'Settings.ManageRoles';
                        
                        return (
                          <label 
                            key={perm} 
                            className={`flex items-center justify-between p-4 ${isLockedForOrgAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50 transition-colors'}`}
                          >
                            <div>
                              <div className="font-medium text-slate-700 text-sm">{actionName} {isLockedForOrgAdmin && <span className="text-[10px] ml-2 text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">Required</span>}</div>
                              <div className="text-xs text-slate-400 mt-0.5 font-mono">{perm}</div>
                            </div>
                            <div className="relative inline-flex items-center">
                              <input autoComplete="off" 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={isChecked || isLockedForOrgAdmin}
                                disabled={isLockedForOrgAdmin}
                                onChange={() => togglePermission(perm)}
                              />
                              <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isLockedForOrgAdmin ? 'peer-checked:bg-slate-400' : 'peer-checked:bg-indigo-600'}`}></div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {isCreatingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  Create Custom Role
                </h3>
                <button onClick={() => setIsCreatingRole(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form autoComplete="off" onSubmit={handleCreateRole}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Senior Doctor"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <textarea
                      rows={3}
                      placeholder="What can users with this role do?"
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreatingRole(false)} className="btn-secondary px-5 py-2">Cancel</button>
                  <button type="submit" disabled={createRoleMutation.isPending || !newRoleName.trim()} className="btn-primary px-5 py-2">
                    {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
