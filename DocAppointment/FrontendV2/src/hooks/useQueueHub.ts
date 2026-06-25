import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '@/store/authStore'

export const useQueueHub = (branchId: string | null | undefined) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!branchId) return

    const token = useAuthStore.getState().token
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1.0'
    const baseUrl = apiUrl.split('/api')[0]
    const hubUrl = import.meta.env.VITE_HUB_URL || `${baseUrl}/queueHub`
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .configureLogging({
        log: (logLevel, message) => {
          if (message.includes('stopped during negotiation')) return;
          if (logLevel === signalR.LogLevel.Error || logLevel === signalR.LogLevel.Critical) console.error(message);
          else if (logLevel === signalR.LogLevel.Warning) console.warn(message);
        }
      })
      .build()

    let isMounted = true

    newConnection.start()
      .then(() => {
        if (!isMounted) return
        console.log(`[QueueHub] Connected! Joining branch group: ${branchId}`)
        return newConnection.invoke('JoinBranchGroup', branchId)
      })
      .then(() => {
        if (isMounted) console.log(`[QueueHub] Successfully joined branch group: ${branchId}`)
      })
      .catch(err => {
        if (err?.message?.includes('stopped during negotiation')) {
          console.warn('[QueueHub] Start aborted (strict mode).')
        } else {
          console.error("[QueueHub] Connection Error: ", err)
        }
      })

    setConnection(newConnection)

    return () => {
      isMounted = false
      newConnection.stop()
    }
  }, [branchId])

  return connection
}
