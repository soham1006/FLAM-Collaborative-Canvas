# Interview Preparation Guide: Technical Q&A

This document provides structured, senior-level answers to technical interview questions based directly on our real implementation.

---

### Q1: Why did you choose HTML5 Canvas 2D instead of DOM elements or SVG?
**Answer:**
"For a visual collaboration canvas, DOM elements and SVG scale poorly with object count. Every SVG element and DOM node is a live browser node registered in the DOM tree, requiring CSS style calculation, layout reflow, and paint cycles. At 1,000+ objects, DOM manipulation causes severe jank.

With the Canvas 2D API, shapes are rasterized immediately into a GPU-backed bitmap buffer. The DOM contains only two canvas elements regardless of whether there are 10 shapes or 10,000 shapes on screen. Furthermore, Canvas gives us total control over memory usage, affine matrix transformations, and spatial culling via an in-memory spatial index."

---

### Q2: What is your Dual-Canvas Architecture and why did you build it?
**Answer:**
"In typical single-canvas setups, moving your mouse cursor or hovering a selection handle triggers a complete redraw of the entire scene. If the canvas has 2,000 shapes, your mouse move takes ~25 ms, causing dropped frames.

To solve this, I designed a two-canvas layering model:
1. **Base Layer (`canvas-base`)**: Renders static shapes. It is repainted *only* when shapes are added, deleted, moved, or when the camera pans/zooms. It uses an AABB Spatial Grid to cull shapes outside the viewport frustum.
2. **Overlay Layer (`canvas-overlay`)**: Absolutely positioned above the base canvas. It handles high-frequency transient UI: peer live cursors, active drawing preview vectors, selection marquee box, and transform handles.

When a collaborator moves their cursor or I hover a handle, only the overlay canvas clears and redraws (taking <0.5 ms), preserving a silky-smooth 60–120 FPS."

---

### Q3: Where did you apply Object-Oriented Programming (OOP) and Design Patterns?
**Answer:**
"I used OOP in `packages/drawing-engine` where it naturally simplifies geometric modeling:
1. **Polymorphic Shape Hierarchy (`BaseShape`)**:
   - Uses the **Template Method Pattern**: `BaseShape.render()` coordinates world translations, rotations, alpha opacity, and stroke styling before invoking `drawGeometry()`.
   - Subclasses (`Rectangle`, `Circle`, `Line`, `Arrow`, `TextShape`, `FreehandPath`) encapsulate their own geometry drawing, hit testing, and serialization.
2. **Command Pattern (`ICommand`)**:
   - `AddShapeCommand`, `DeleteShapeCommand`, and `MoveShapeCommand` encapsulate operations as reversible objects. This decouples UI buttons and hotkeys (`Ctrl+Z`, `Ctrl+Y`) from the engine and powers the `HistoryManager`.
3. **Factory Pattern (`ShapeFactory`)**:
   - Instantiates the correct polymorphic shape subclass from serialized JSON DTOs received over WebSockets.
4. **Spatial Partitioning (`SpatialGrid`)**:
   - Organizes shapes into 2D grid cells for $\mathcal{O}(k)$ viewport culling.
5. **Repository Pattern (`IRoomRepository`)**:
   - Decoupled the database layer using dependency inversion, allowing the server to run with zero-config in-memory persistence in development and PostgreSQL in production."

---

### Q4: How does your undo/redo system work?
**Answer:**
"Undo/redo is built using the **Command Pattern**. Every state mutation implements `ICommand` with `execute()`, `undo()`, and `redo()`:
- `AddShapeCommand`: `execute()` adds the shape to the engine; `undo()` removes it; `redo()` restores it.
- `DeleteShapeCommand`: Clones deleted shapes to preserve their snapshot in memory; `undo()` re-adds them.
- `MoveShapeCommand`: Applies opposite $(\Delta x, \Delta y)$ vectors on undo.

The `HistoryManager` maintains bounded undo and redo stacks (max depth 50). When a new command executes, the redo stack is cleared. If the stack exceeds 50 commands, the oldest command is shifted off to cap memory consumption."

---

### Q5: How do you handle real-time synchronization and conflicts without a full CRDT?
**Answer:**
"For a 2D spatial canvas, a full CRDT (like Yjs or Automerge) introduces significant runtime complexity, memory overhead from tombstones, and large network packets. Instead, I implemented a pragmatic, battle-tested approach:
1. **Server-Authoritative Monotonic Sequence (`seq`)**: The server assigns an atomic sequence number to every mutating operation.
2. **Field-Level Last-Write-Wins (LWW)**: Updates to independent shape properties (e.g. User A changing color while User B moves position) merge cleanly without conflict.
3. **Idempotent UUIDs**: Every shape has a client-generated UUID, ensuring duplicated packets (e.g. during reconnections) never spawn duplicate shapes.
4. **Optimistic UI with Reconciliation**: Local mutations render immediately. If the server broadcasts an authoritative update with a higher sequence number, the client reconciles its local state."

---

### Q6: How does the backend prevent database thrashing during intense collaboration?
**Answer:**
"If 5 users are drawing continuously, the server can receive hundreds of WebSocket mutations per second. Writing each event directly to PostgreSQL would saturate the connection pool.

I implemented a **Debounced Persistence Queue** (`PersistenceQueue`):
- The server maintains the authoritative room state in memory for sub-millisecond response times.
- Mutated shape IDs are placed in a dirty set.
- A background worker flushes the dirty buffer to PostgreSQL in batched upserts every 2.5 seconds.
- An immediate flush is triggered when a room unloads or on graceful server shutdown (`SIGTERM`/`SIGINT`)."

---

### Q7: What would you change if this system needed to scale to 100,000 concurrent users?
**Answer:**
"To scale to 100,000 concurrent users across thousands of rooms:
1. **Horizontal Backend Scaling with Redis Pub/Sub**:
   - Multiple Fastify WebSocket instances behind an AWS ALB or Cloudflare Load Balancer.
   - Use Redis Pub/Sub or Dragonfly to broadcast room messages across instances so users in the same room on different servers receive each other's events.
2. **WebSocket Binary Serialization (Protobuf or MessagePack)**:
   - Replace JSON with Protocol Buffers or MessagePack, reducing bandwidth by ~60% and cutting JSON parsing CPU time.
3. **Room Sharding / Ephemeral Edge Actors**:
   - Migrate room state machines to Cloudflare Durable Objects or Fly.io edge machines, keeping authoritative room state close to users with single-digit millisecond latency.
4. **OffscreenCanvas in Web Workers**:
   - Offload spatial indexing and path geometry math to a background Web Worker so the main browser thread stays completely free for 120Hz display refresh."

---

### Q8: How did you diagnose and solve the WebSocket payload size limit (WS close 1009 / Max payload size exceeded)?
**Answer:**
"Rather than merely increasing server payload limits (which treats a symptom rather than the architectural root cause), I addressed the issue at the **protocol and data representation level**:
1. **Streaming Delta Chunks**: Instead of buffering and transmitting an entire monolithic freehand stroke or canvas state, the engine emits lightweight `STROKE_START`, `STROKE_CHUNK` (batched in 33ms RAF intervals), and `STROKE_END` events.
2. **0.1px Coordinate Quantization**: High-precision mouse events produce raw 64-bit IEEE floating-point numbers (`234.89127839481`). By rounding to $0.1\text{px}$ (`Math.round(val * 10) / 10`), each coordinate shrinks from ~17 characters down to 5 characters with zero perceptible loss of visual fidelity.
3. **Distance Filtering**: Sub-pixel micro-jitter ($\Delta x^2 + \Delta y^2 < 1.0\text{px}^2$) is dropped immediately before entering the buffer.
4. **Overlay Synthesis**: Peer clients receive these batched chunks and render them in real time to their overlay canvas, giving sub-millisecond perceived latency across the network.
5. **Results**: Peak message size plunged from **50 KB – 150 KB** down to **150 – 350 bytes per chunk** (>98% reduction), completely eliminating WebSocket 1009 errors and enabling butter-smooth remote rendering."

---

### Q9: How did you solve the problem of CanvasEngine being destroyed or re-created on React component re-renders?
**Answer:**
"In React, state updates (such as remote cursor movements, active tool changes, or color picker selections) trigger component re-renders. If `useEffect` hooks initializing the canvas engine depend directly on changing function callbacks (e.g. `onShapeCreated`, `onPointerMove`), the effect cleans up and re-instantiates `CanvasEngine`. This wipes out viewport camera position, cancels ongoing gesture drags, resets history undo/redo stacks, and causes visible canvas flashing.

I solved this by **decoupling the engine lifecycle from the React component lifecycle using Mutable Callback Refs**:
1. All parent event callbacks (`onShapeCreated`, `onShapeUpdated`, `onStrokeChunk`, etc.) are stored in a persistent `callbacksRef.current` object updated synchronously on every render without triggering effects.
2. The `CanvasEngine` initialization `useEffect` depends *only* on the physical DOM `<canvas>` mount.
3. The engine attaches its event listeners once to `callbacksRef.current.onX?.()`.
4. High-frequency store selectors in Zustand are granularized (`s => s.activeTool`, `s => s.strokeColor`), and property updates are pushed into the running engine via dedicated setters (`engine.setTool()`, `engine.setStyleProps()`) without ever tearing down or recreating the engine."

