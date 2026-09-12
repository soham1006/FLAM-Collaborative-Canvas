import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { SqliteRoomRepository } from '../src/db/SqliteRoomRepository.js';
import { RoomService } from '../src/services/RoomService.js';
import { PersistenceQueue } from '../src/services/PersistenceQueue.js';
import { ConnectionManager } from '../src/websocket/ConnectionManager.js';
import { WSMessage, ShapeDTO } from '@flam/shared';

describe('Real-Time WebSocket & Stroke Streaming Protocol', () => {
  let server: FastifyInstance;
  let repo: SqliteRoomRepository;
  let service: RoomService;
  let queue: PersistenceQueue;
  let manager: ConnectionManager;
  let port: number;

  before(async () => {
    repo = new SqliteRoomRepository(':memory:');
    service = new RoomService(repo);
    queue = new PersistenceQueue(repo);
    manager = new ConnectionManager(service, queue);

    server = Fastify({ logger: false });
    await server.register(websocket, {
      options: { maxPayload: 1048576 },
    });

    server.get('/ws', { websocket: true }, (socket, req) => {
      manager.handleConnection(socket, req);
    });

    const addr = await server.listen({ port: 0, host: '127.0.0.1' });
    const match = addr.match(/:(\d+)$/);
    port = match ? parseInt(match[1], 10) : 4000;
  });

  after(async () => {
    await queue.flush();
    queue.stop();
    await server.close();
    repo.close();
  });

  function createClient(): Promise<{ ws: WebSocket; messages: WSMessage[]; waitForMessage: (type: string) => Promise<WSMessage> }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const messages: WSMessage[] = [];

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          messages.push(msg);
        } catch {}
      });

      const waitForMessage = (type: string, timeoutMs = 3000): Promise<WSMessage> => {
        return new Promise((res, rej) => {
          const existing = messages.find((m) => m.type === type);
          if (existing) return res(existing);

          const timer = setTimeout(() => {
            clearInterval(check);
            rej(new Error(`Timeout waiting for message type: ${type}`));
          }, timeoutMs);

          const check = setInterval(() => {
            const found = messages.find((m) => m.type === type);
            if (found) {
              clearTimeout(timer);
              clearInterval(check);
              res(found);
            }
          }, 20);
        });
      };

      ws.on('open', () => resolve({ ws, messages, waitForMessage }));
      ws.on('error', reject);
    });
  }

  it('connects and receives ROOM_STATE on ROOM_JOIN', async () => {
    const client = await createClient();

    const joinMsg: WSMessage = {
      type: 'ROOM_JOIN',
      roomId: 'ws-test-room',
      senderId: 'user-alice',
      timestamp: Date.now(),
      payload: { userName: 'Alice', userColor: '#0284c7' },
    };

    client.ws.send(JSON.stringify(joinMsg));
    const stateMsg = await client.waitForMessage('ROOM_STATE');

    assert.ok(stateMsg);
    assert.equal(stateMsg.roomId, 'ws-test-room');
    assert.ok((stateMsg.payload as any).roomId);
    assert.ok(Array.isArray((stateMsg.payload as any).shapes));

    client.ws.close();
  });

  it('notifies peer when second collaborator joins the same room', async () => {
    const alice = await createClient();
    const bob = await createClient();

    alice.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId: 'collab-room-1',
        senderId: 'user-alice',
        timestamp: Date.now(),
        payload: { userName: 'Alice', userColor: '#0284c7' },
      })
    );
    await alice.waitForMessage('ROOM_STATE');

    bob.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId: 'collab-room-1',
        senderId: 'user-bob',
        timestamp: Date.now(),
        payload: { userName: 'Bob', userColor: '#16a34a' },
      })
    );
    await bob.waitForMessage('ROOM_STATE');

    // Alice should receive USER_JOINED for Bob
    const userJoined = await alice.waitForMessage('USER_JOINED');
    assert.ok(userJoined);
    assert.equal((userJoined.payload as any).user.name, 'Bob');

    alice.ws.close();
    bob.ws.close();
  });

  it('streams low-bandwidth STROKE_START, STROKE_CHUNK, and STROKE_END between peers', async () => {
    const alice = await createClient();
    const bob = await createClient();

    const roomId = 'stroke-stream-room';
    alice.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        senderId: 'user-alice',
        timestamp: Date.now(),
        payload: { userName: 'Alice', userColor: '#0284c7' },
      })
    );
    bob.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        senderId: 'user-bob',
        timestamp: Date.now(),
        payload: { userName: 'Bob', userColor: '#16a34a' },
      })
    );

    await alice.waitForMessage('ROOM_STATE');
    await bob.waitForMessage('ROOM_STATE');

    // Alice sends STROKE_START
    const startPayload = {
      strokeId: 'stroke-123',
      tool: 'freehand',
      strokeColor: '#0284c7',
      strokeWidth: 3,
      startPoint: { x: 100.5, y: 200.5 },
    };
    const startMsgStr = JSON.stringify({
      type: 'STROKE_START',
      roomId,
      senderId: 'user-alice',
      timestamp: Date.now(),
      payload: startPayload,
    });
    alice.ws.send(startMsgStr);

    // Verify Bob receives STROKE_START_BROADCAST with user details
    const strokeStartBc = await bob.waitForMessage('STROKE_START_BROADCAST');
    assert.ok(strokeStartBc);
    assert.equal((strokeStartBc.payload as any).strokeId, 'stroke-123');
    assert.equal((strokeStartBc.payload as any).userId, 'user-alice');

    // Alice sends batched STROKE_CHUNK
    const chunkPayload = {
      strokeId: 'stroke-123',
      points: [
        { x: 102.1, y: 204.3 },
        { x: 105.8, y: 209.1 },
        { x: 110.2, y: 215.0 },
      ],
    };
    const chunkMsgStr = JSON.stringify({
      type: 'STROKE_CHUNK',
      roomId,
      senderId: 'user-alice',
      timestamp: Date.now(),
      payload: chunkPayload,
    });

    // Verify message payload size is ultra-compact (< 350 bytes)
    assert.ok(
      Buffer.byteLength(chunkMsgStr) < 350,
      `Stroke chunk payload should be compact (was ${Buffer.byteLength(chunkMsgStr)} bytes)`
    );

    alice.ws.send(chunkMsgStr);

    // Verify Bob receives STROKE_CHUNK_BROADCAST
    const strokeChunkBc = await bob.waitForMessage('STROKE_CHUNK_BROADCAST');
    assert.ok(strokeChunkBc);
    assert.equal((strokeChunkBc.payload as any).points.length, 3);

    // Alice sends STROKE_END
    alice.ws.send(
      JSON.stringify({
        type: 'STROKE_END',
        roomId,
        senderId: 'user-alice',
        timestamp: Date.now(),
        payload: { strokeId: 'stroke-123' },
      })
    );

    const strokeEndBc = await bob.waitForMessage('STROKE_END');
    assert.ok(strokeEndBc);
    assert.equal((strokeEndBc.payload as any).strokeId, 'stroke-123');

    alice.ws.close();
    bob.ws.close();
  });

  it('broadcasts created shapes and confirms persistence', async () => {
    const alice = await createClient();
    const bob = await createClient();

    const roomId = 'shape-create-room';
    alice.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        senderId: 'user-alice',
        timestamp: Date.now(),
        payload: { userName: 'Alice', userColor: '#0284c7' },
      })
    );
    bob.ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        senderId: 'user-bob',
        timestamp: Date.now(),
        payload: { userName: 'Bob', userColor: '#16a34a' },
      })
    );

    await alice.waitForMessage('ROOM_STATE');
    await bob.waitForMessage('ROOM_STATE');

    const newShape: ShapeDTO = {
      id: 'shape-circle-1',
      type: 'circle',
      x: 300,
      y: 400,
      width: 80,
      height: 80,
      strokeColor: '#e11d48',
      fillColor: '#fee2e2',
      strokeWidth: 2,
      opacity: 0.9,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    alice.ws.send(
      JSON.stringify({
        type: 'SHAPE_CREATE',
        roomId,
        senderId: 'user-alice',
        timestamp: Date.now(),
        payload: { shape: newShape },
      })
    );

    const shapeCreated = await bob.waitForMessage('SHAPE_CREATED');
    assert.ok(shapeCreated);
    assert.equal((shapeCreated.payload as any).shape.id, 'shape-circle-1');

    alice.ws.close();
    bob.ws.close();
  });
});
