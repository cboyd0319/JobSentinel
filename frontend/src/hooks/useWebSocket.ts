/**
 * React hook for WebSocket connection management.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Message type filtering
 * - Heartbeat/ping-pong support
 * - TypeScript type safety
 */

import { useEffect, useRef, useState, useCallback } from 'react'

export type WebSocketMessage = {
  type: string
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface UseWebSocketOptions {
  /** WebSocket URL (default: ws://localhost:8000/api/v1/ws/jobs) */
  url?: string
  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean
  /** Max reconnection attempts (default: 5) */
  maxReconnectAttempts?: number
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number
  /** Heartbeat interval in seconds (default: 30) */
  heartbeatInterval?: number
  /** Message filter - only receive messages of these types */
  messageTypes?: string[]
  /** Callback for connection state changes */
  onConnectionChange?: (state: ConnectionState) => void
}

export interface UseWebSocketReturn {
  /** Current connection state */
  state: ConnectionState
  /** Latest received message */
  lastMessage: WebSocketMessage | null
  /** All received messages (limited to last 100) */
  messages: WebSocketMessage[]
  /** Send a message to the server */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (message: Record<string, any>) => void
  /** Manually connect */
  connect: () => void
  /** Manually disconnect */
  disconnect: () => void
  /** Clear message history */
  clearMessages: () => void
}

const DEFAULT_WS_URL = `ws://${window.location.hostname}:8000/api/v1/ws/jobs`

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = DEFAULT_WS_URL,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30,
    messageTypes = [],
    onConnectionChange,
  } = options

  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldConnectRef = useRef(true)

  const updateState = useCallback(
    (newState: ConnectionState) => {
      setState(newState)
      onConnectionChange?.(newState)
    },
    [onConnectionChange]
  )

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
          })
        )
      }
    }, heartbeatInterval * 1000)
  }, [heartbeatInterval])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  // Forward declaration for connect function
  const connectRef = useRef<(() => void) | null>(null)

  const attemptReconnect = useCallback(() => {
    if (!reconnect || !shouldConnectRef.current) return
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('Max WebSocket reconnection attempts reached')
      updateState('error')
      return
    }

    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
    console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)

    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      if (connectRef.current) {
        connectRef.current()
      }
    }, delay)
  }, [reconnect, maxReconnectAttempts, reconnectDelay, updateState])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    try {
      updateState('connecting')
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        updateState('connected')
        reconnectAttemptsRef.current = 0
        startHeartbeat()

        // Subscribe to specific message types if provided
        if (messageTypes.length > 0) {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              events: messageTypes,
            })
          )
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          // Filter messages by type if specified
          if (messageTypes.length > 0 && !messageTypes.includes(message.type)) {
            return
          }

          setLastMessage(message)
          setMessages((prev) => {
            // Keep only last 100 messages to prevent memory issues
            const updated = [...prev, message]
            return updated.slice(-100)
          })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        updateState('error')
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        updateState('disconnected')
        stopHeartbeat()

        if (shouldConnectRef.current && attemptReconnect) {
          attemptReconnect()
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      updateState('error')
      if (attemptReconnect) {
        attemptReconnect()
      }
    }
  }, [url, messageTypes, updateState, startHeartbeat, stopHeartbeat, attemptReconnect])

  // Store connect function in ref for attemptReconnect
  connectRef.current = connect

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false
    stopHeartbeat()

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    updateState('disconnected')
  }, [stopHeartbeat, updateState])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const send = useCallback((message: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastMessage(null)
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    shouldConnectRef.current = true
    if (connect) {
      connect()
    }

    return () => {
      if (disconnect) {
        disconnect()
      }
    }
  }, [url, connect, disconnect])

  return {
    state,
    lastMessage,
    messages,
    send,
    connect,
    disconnect,
    clearMessages,
  }
}
