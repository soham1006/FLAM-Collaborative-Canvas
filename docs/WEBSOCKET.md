# WebSocket Protocol Specification

## 1. Protocol Overview

The real-time collaboration engine utilizes raw **RFC 6455 WebSockets** (`ws`) managed by a Fastify WebSocket Gateway.

### Message Envelope Structure
Every message conforms to a strict, typed envelope validated at runtime via **Zod**:

```typescript
interface WSMessage<T = unknown> {
  type: WSMessageType;
  roomId: string;
  senderId: string;
  seq?: number;           // Monotonically increasing sequence number assigned by server
  timestamp: number;      // Epoch millis
  payload: T;
}
```

---

## 2. Event Catalog

| Event Type | Direction | Description | Throttling / Batching Policy |
| :--- | :--- | :--- | :--- |
| `ROOM_JOIN` | Client $\rightarrow$ Server | Initial handshake payload containing user display name and color. | On connection / reconnection |
| `ROOM_STATE` | Server $\rightarrow$ Client | Authoritative state of the room: current shapes, active users, latest `seq`. | Unicast to joining client |
| `USER_JOINED` | Server $\rightarrow$ Client | Broadcast informing peers that a new user joined. | Broadcast (omitting sender) |
| `USER_LEFT` | Server $\rightarrow$ Client | Broadcast informing peers of user departure or disconnect. | Broadcast |
| `CURSOR_MOVE` | Client $\rightarrow$ Server | Transmits mouse pointer $(x_w, y_w)$ in world space. | **Throttled to 30ms (33 Hz)** |
| `CURSOR_BROADCAST`| Server $\rightarrow$ Client | Relays peer cursor positions and user tags. | Broadcast (omitting sender) |
| `STROKE_START` | Client $\rightarrow$ Server | Signals start of live freehand stroke with initial quantized anchor. | Immediate on pointer down |
| `STROKE_START_BROADCAST` | Server $\rightarrow$ Client | Relays live stroke initiation with user identity and color. | Broadcast (omitting sender) |
| `STROKE_CHUNK` | Client $\rightarrow$ Server | Batched 0.1px quantized delta points for active stroke. | **RAF / 33ms buffer (<350 bytes)** |
| `STROKE_CHUNK_BROADCAST` | Server $\rightarrow$ Client | Relays stroke delta points to peer overlay canvases. | Broadcast (omitting sender) |
| `STROKE_END` | Client $\rightarrow$ Server / Broadcast | Signals conclusion of live freehand stroke before shape consolidation. | Immediate on pointer up |
| `SHAPE_CREATE` | Client $\rightarrow$ Server | Optimistically drawn local shape sent to server. | Immediate |
| `SHAPE_CREATED`| Server $\rightarrow$ Client | Confirmed shape stamped with atomic sequence number. | Broadcast to all clients |
| `SHAPE_UPDATE` | Client $\rightarrow$ Server | Partial updates during dragging or multi-handle resizing. | Throttled during drag; final on pointer up |
| `SHAPE_UPDATED`| Server $\rightarrow$ Client | Broadcast of shape mutations with new sequence number. | Broadcast |
| `SHAPE_DELETE` | Client $\rightarrow$ Server | Request to delete one or more shapes. | Immediate |
| `SHAPE_DELETED`| Server $\rightarrow$ Client | Confirms deletion with atomic sequence number. | Broadcast |
| `SELECTION_CHANGE` | Client $\rightarrow$ Server | Transmits IDs of currently selected shapes. | Throttled (50ms) |
| `SELECTION_BROADCAST` | Server $\rightarrow$ Client | Peer selection bounding box broadcast. | Broadcast (omitting sender) |
| `PING` | Client $\rightarrow$ Server | Keepalive ping to detect dead sockets. | Every 20 seconds |
| `PONG` | Server $\rightarrow$ Client | Keepalive reply with current server timestamp. | Immediate reply |
| `ERROR` | Server $\rightarrow$ Client | Rate limit exceeded, validation error, or malformed JSON. | Unicast |

---

## 3. Conflict Resolution Strategy

### Server-Authoritative Sequencing (`seq`)
Every room maintains an atomic in-memory monotonic sequence counter `seq`. Every mutating message (`SHAPE_CREATE`, `SHAPE_UPDATE`, `SHAPE_DELETE`) receives an incremented sequence number:
$$\text{seq} = ++\text{roomSeq}$$

### Field-Level Last-Write-Wins (LWW)
- Shape attributes (position, size, stroke color, fill color) are independent fields.
- If User A modifies `strokeColor` while User B moves the shape $(x, y)$, both updates merge non-destructively.
- If User A and User B concurrently move the same shape, the update with the higher server sequence number wins. The client reconciles its local state to match the authoritative server state.

---

## 4. Reconnection & Network Resiliency

1. **Heartbeat Protocol**:
   - The client emits `PING` every 20 seconds.
   - If no message or `PONG` is received within 25 seconds, the client marks the connection as dead, closes the socket, and initiates reconnection.
2. **Exponential Backoff**:
   - On disconnect, the client schedules reconnection attempts with exponential jitter:
   $$\text{delay} = \min(1000 \times 1.5^{\text{attempt}}, 10000) \text{ ms}$$
3. **State Resynchronization**:
   - Upon reconnecting, the client re-emits `ROOM_JOIN`. The server responds with the fresh `ROOM_STATE`, instantly re-syncing any mutations missed during the network outage.
