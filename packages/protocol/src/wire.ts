// Wire protocol types for WebSocket communication

/**
 * Client -> Server: request (replaces bridge.buildProvider)
 */
export type WsRequest = {
  type: 'request'
  id: string
  name: string
  data: unknown
}

/**
 * Server -> Client: response to a request
 */
export type WsResponse = {
  type: 'response'
  id: string
  data: unknown
  error?: string
}

/**
 * Server -> Client: push event (replaces bridge.buildEmitter)
 */
export type WsEvent = {
  type: 'event'
  name: string
  data: unknown
}

/**
 * Union of all WebSocket message types
 */
export type WsMessage = WsRequest | WsResponse | WsEvent

/**
 * Standard bridge response wrapper.
 * Kept for backward compatibility with existing endpoint signatures.
 */
export type IBridgeResponse<D = {}> = {
  success: boolean
  data?: D
  msg?: string
}
