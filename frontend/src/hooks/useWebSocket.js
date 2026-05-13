import { useEffect, useRef } from "react"
import { useAuthStore } from "../store/authStore"
import { WS_URL } from "../config"

export function useWebSocket(onMessage) {
  const { accessToken, isAuthenticated } = useAuthStore()
  const onMessageRef = useRef(onMessage)
  const retryDelay = useRef(1_000)
  const ws = useRef(null)

  // Keep the callback ref current without triggering reconnects
  useEffect(() => { onMessageRef.current = onMessage })

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    let cancelled = false

    function connect() {
      if (cancelled) return
      ws.current = new WebSocket(`${WS_URL}?token=${accessToken}`)

      ws.current.onopen = () => {
        retryDelay.current = 1_000
      }

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          onMessageRef.current?.(data)
        } catch { /* ignore non-JSON messages */ }
      }

      ws.current.onclose = (e) => {
        if (cancelled) return
        if (e.code === 4001) return  // Auth rejected — don't retry
        const delay = retryDelay.current
        retryDelay.current = Math.min(delay * 2, 30_000)
        setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      cancelled = true
      ws.current?.close()
    }
  }, [isAuthenticated, accessToken])
}
