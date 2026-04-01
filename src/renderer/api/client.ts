import type { EndpointMap, EventMap, WsRequest, WsResponse, WsEvent } from '@aionui/protocol'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: number
}

const REQUEST_TIMEOUT_MS = 30_000
const RECONNECT_DELAY_INIT = 500
const RECONNECT_DELAY_MAX = 8_000

/**
 * Frontend API client that communicates with the backend via WebSocket.
 * Implements the wire protocol defined in @aionui/protocol.
 */
export class ApiClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private listeners = new Map<string, Set<(data: unknown) => void>>()
  private messageQueue: WsRequest[] = []
  private reconnectDelay = RECONNECT_DELAY_INIT
  private reconnectTimer: number | null = null
  private shouldReconnect = true

  constructor(private readonly serverUrl: string) {}

  // === Request / Response ===

  async request<K extends keyof EndpointMap>(
    name: K,
    data: EndpointMap[K]['request']
  ): Promise<EndpointMap[K]['response']> {
    const id = crypto.randomUUID()
    const message: WsRequest = { type: 'request', id, name: name as string, data }
    this.send(message)

    return new Promise<EndpointMap[K]['response']>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Request timeout: ${name as string}`))
      }, REQUEST_TIMEOUT_MS)

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })
    })
  }

  // === Event Subscription ===

  on<K extends keyof EventMap>(name: K, callback: (data: EventMap[K]) => void): () => void {
    const key = name as string
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    const cb = callback as (data: unknown) => void
    this.listeners.get(key)!.add(cb)
    return () => {
      this.listeners.get(key)?.delete(cb)
    }
  }

  // === Connection Management ===

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      this.ws = new WebSocket(this.serverUrl)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.addEventListener('open', () => {
      this.reconnectDelay = RECONNECT_DELAY_INIT
      this.flushQueue()
    })

    this.ws.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(event.data as string)
    })

    this.ws.addEventListener('close', (event: CloseEvent) => {
      this.ws = null
      this.handleClose(event)
    })

    this.ws.addEventListener('error', () => {
      this.ws?.close()
    })
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    this.ws?.close()
    this.ws = null
  }

  /** Re-enable reconnection and immediately connect (e.g. after login). */
  reconnect(): void {
    this.shouldReconnect = true
    this.reconnectDelay = RECONNECT_DELAY_INIT
    this.connect()
  }

  // === Private ===

  private send(message: WsRequest): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
      this.ensureSocket()
    }
  }

  private ensureSocket(): void {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect()
    }
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()
      if (msg) {
        this.ws.send(JSON.stringify(msg))
      }
    }
  }

  private handleMessage(raw: string): void {
    let msg: WsResponse | WsEvent | { name: string; data: unknown }
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    // Handle heartbeat ping (legacy format: { name: 'ping', data })
    if ('name' in msg && msg.name === 'ping') {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ name: 'pong', data: { timestamp: Date.now() } }))
      }
      return
    }

    // Handle auth-expired event (legacy format)
    if ('name' in msg && msg.name === 'auth-expired') {
      this.handleAuthExpired()
      return
    }

    // Wire protocol messages
    if ('type' in msg) {
      if (msg.type === 'response') {
        const resp = msg as WsResponse
        const pending = this.pending.get(resp.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pending.delete(resp.id)
          if (resp.error) {
            pending.reject(new Error(resp.error))
          } else {
            pending.resolve(resp.data)
          }
        }
        return
      }

      if (msg.type === 'event') {
        const evt = msg as WsEvent
        this.listeners.get(evt.name)?.forEach((cb) => cb(evt.data))
        return
      }
    }

    // Legacy event format: { name, data } (backwards compat during migration)
    if ('name' in msg && 'data' in msg) {
      this.listeners.get(msg.name)?.forEach((cb) => cb(msg.data))
    }
  }

  private handleClose(event: CloseEvent): void {
    // Auth failure: server sends 1008 for token issues
    if (event.code === 1008) {
      this.shouldReconnect = false
      this.clearReconnectTimer()
      this.redirectToLogin()
      return
    }

    this.scheduleReconnect()
  }

  private handleAuthExpired(): void {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    this.ws?.close()
    this.redirectToLogin()
  }

  private redirectToLogin(): void {
    if (window.location.pathname === '/login' || window.location.hash.includes('/login')) {
      return
    }
    setTimeout(() => {
      window.location.href = '/login'
    }, 500)
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || !this.shouldReconnect) {
      return
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_DELAY_MAX)
      this.connect()
    }, this.reconnectDelay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
