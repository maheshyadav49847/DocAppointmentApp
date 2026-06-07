import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import QueueOverview from "./components/QueueOverview"
import QueueManager from "./components/QueueManager"
import { useAuthStore } from "@/store/authStore"

export default function QueueDashboardPage() {
  const { user } = useAuthStore()
  const globalBranchId = user?.branchId
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || 'org')

  const [searchParams, setSearchParams] = useSearchParams()
  const viewMode = (searchParams.get('mode') as 'overview' | 'manage') || 'overview'
  const urlQueueId = searchParams.get('queueId')
  const [activeSession, setActiveSession] = useState<any>(null)

  const handleManageSession = (doctor: any, session: any, queueId: string) => {
    setActiveSession({ doctor, session, queueId })
    setSearchParams({ mode: 'manage', queueId: queueId })
  }

  const handleBackToOverview = () => {
    setSearchParams({})
    setActiveSession(null)
  }

  return (
    <div className="pb-12">
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
