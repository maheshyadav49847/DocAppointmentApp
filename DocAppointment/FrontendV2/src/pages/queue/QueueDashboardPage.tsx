import { useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import QueueOverview from "./components/QueueOverview"
import QueueManager from "./components/QueueManager"
import { useAuthStore } from "@/store/authStore"

export default function QueueDashboardPage() {
  const { user, activeBranchId, setActiveBranchId } = useAuthStore()
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const globalBranchId = user?.branchId
  const isMultiBranchDoctor = role === 'doctor';
  const selectedBranchId = (role === 'orgadmin' || isMultiBranchDoctor) ? (activeBranchId || 'org') : (globalBranchId || 'org');
  const setSelectedBranchId = setActiveBranchId

  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get('mode') as 'overview' | 'manage') || 'overview'
  const urlQueueId = searchParams.get('queueId')
  const [activeSession, setActiveSession] = useState<any>(null)

  const handleManageSession = useCallback((doctor: any, session: any, queueId: string) => {
    setActiveSession({ doctor, session, queueId })
    setSearchParams({ mode: 'manage', queueId: queueId })
  }, [setSearchParams])

  const handleBackToOverview = useCallback(() => {
    setSearchParams(new URLSearchParams())
    setActiveSession(null)
  }, [setSearchParams])

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {viewMode === 'overview' ? (
        <QueueOverview 
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          onManage={handleManageSession}
        />
      ) : (
        <QueueManager 
          sessionData={activeSession || { queueId: urlQueueId }}
          onBack={handleBackToOverview}
        />
      )}
    </div>
  )
}
