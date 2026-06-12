import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '@/store/authStore'

export const useQueueHub = (branchId: string | null | undefined) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!branchId) return

    const token = useAuthStore.getState().token
    const hubUrl = import.meta.env.VITE_HUB_URL || 'http://localhost:5001/queueHub'
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .build()

    setConnection(newConnection)

    return () => {
      newConnection.stop()
    }
  }, [branchId])

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log(`[QueueHub] Connected! Joining branch group: ${branchId}`)
          return connection.invoke('JoinBranchGroup', branchId)
        })
        .then(() => console.log(`[QueueHub] Successfully joined branch group: ${branchId}`))
        .catch(err => {
          if (err?.message?.includes('stopped during negotiation')) {
            console.warn('[QueueHub] Start aborted (strict mode).')
          } else {
            console.error("[QueueHub] Connection Error: ", err)
          }
        })
    }
  }, [connection, branchId])

  return connection
}
