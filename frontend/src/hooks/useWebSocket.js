import { useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "../store/authStore"
import { WS_URL } from "../config"

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const { user, isAuthenticated } = useAuthStore()

  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return
    ws.current = new WebSocket(`${WS_URL}/${user.id}`)

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage?.(data)
      } catch {}
    }

    ws.current.onclose = () => {
      // Reconnect after 5s on unexpected close
      setTimeout(connect, 5_000)
    }
  }, [isAuthenticated, user?.id, onMessage])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])
}