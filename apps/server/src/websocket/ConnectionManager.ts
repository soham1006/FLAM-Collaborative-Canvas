import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import {
  WSMessage,
  RoomJoinSchema,
  CursorMoveSchema,
  SelectionChangeSchema,
  ShapeCreateSchema,
  ShapeUpdateSchema,
  ShapeDeleteSchema,
  StrokeStartSchema,
  StrokeChunkSchema,
  StrokeEndSchema,
  UserPresence,
} from '@flam/shared';
import { RoomSession } from './RoomSession.js';
import { RoomService } from '../services/RoomService.js';
import { PersistenceQueue } from '../services/PersistenceQueue.js';

export class ConnectionManager {
  private rooms: Map<string, RoomSession> = new Map();
  private socketToUser: Map<WebSocket, { roomId: string; userId: string }> = new Map();
  private rateLimits: Map<WebSocket, { count: number; resetAt: number }> = new Map();

  constructor(
    private roomService: RoomService,
    private persistence: PersistenceQueue
  ) {}

  public async handleConnection(socket: WebSocket, _req: FastifyRequest): Promise<void> {
    socket.on('message', async (raw: Buffer | string) => {
      try {
        if (!this.checkRateLimit(socket)) {
          socket.send(
            JSON.stringify({
              type: 'ERROR',
              message: 'Rate limit exceeded: too many messages per second',
            })
          );
          return;
        }

        const msg: WSMessage = JSON.parse(raw.toString());
        await this.routeMessage(socket, msg);
      } catch (err: any) {
        console.error('[ConnectionManager] Invalid message payload:', err);
        socket.send(
          JSON.stringify({
            type: 'ERROR',
            message: 'Malformed message or validation error',
            details: err.message,
          })
        );
      }
    });

    socket.on('close', () => {
      this.handleDisconnect(socket);
    });

    socket.on('error', (err) => {
      console.error('[ConnectionManager] WebSocket socket error:', err);
      this.handleDisconnect(socket);
    });
  }

  private async getOrCreateSession(roomId: string): Promise<RoomSession> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    // Load from repository if not in memory
    const { room, shapes } = await this.roomService.getOrCreateRoom(roomId);
    const session = new RoomSession(room.slug, room.name, shapes);
    this.rooms.set(roomId, session);
    return session;
  }

  private async routeMessage(socket: WebSocket, msg: WSMessage): Promise<void> {
    const { type, roomId, senderId, payload } = msg;

    if (type === 'PING') {
      socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      return;
    }

    const session = await this.getOrCreateSession(roomId);

    switch (type) {
      case 'ROOM_JOIN': {
        const data = RoomJoinSchema.parse(payload);
        const user: UserPresence = {
          id: senderId,
          name: data.userName,
          color: data.userColor || '#4f46e5',
          selectedShapeIds: [],
          lastActive: Date.now(),
        };

        session.addClient(senderId, socket, user);
        this.socketToUser.set(socket, { roomId, userId: senderId });

        // 1. Send authoritative ROOM_STATE to the joining client
        socket.send(
          JSON.stringify({
            type: 'ROOM_STATE',
            roomId,
            senderId: 'server',
            seq: session.getCurrentSeq(),
            timestamp: Date.now(),
            payload: {
              roomId: session.id,
              roomName: session.name,
              seq: session.getCurrentSeq(),
              users: session.getUsers(),
              shapes: session.getShapes(),
            },
          })
        );

        // 2. Broadcast USER_JOINED to existing peers
        session.broadcast(
          {
            type: 'USER_JOINED',
            roomId,
            senderId,
            timestamp: Date.now(),
            payload: { user },
          },
          senderId
        );
        break;
      }

      case 'CURSOR_MOVE': {
        const coords = CursorMoveSchema.parse(payload);
        session.updateCursor(senderId, coords.x, coords.y);

        const client = session.getClient(senderId);
        if (client) {
          session.broadcast(
            {
              type: 'CURSOR_BROADCAST',
              roomId,
              senderId,
              timestamp: Date.now(),
              payload: {
                userId: senderId,
                userName: client.user.name,
                color: client.user.color,
                x: coords.x,
                y: coords.y,
              },
            },
            senderId
          );
        }
        break;
      }

      case 'SELECTION_CHANGE': {
        const data = SelectionChangeSchema.parse(payload);
        session.updateSelection(senderId, data.shapeIds);

        session.broadcast(
          {
            type: 'SELECTION_BROADCAST',
            roomId,
            senderId,
            timestamp: Date.now(),
            payload: {
              userId: senderId,
              shapeIds: data.shapeIds,
            },
          },
          senderId
        );
        break;
      }

      case 'SHAPE_CREATE': {
        const { shape } = ShapeCreateSchema.parse(payload);
        const seq = session.applyShapeCreate(shape);

        // Enqueue for debounced database persistence
        this.persistence.enqueueSave(roomId, shape);

        // Broadcast authoritative creation with server sequence
        session.broadcast({
          type: 'SHAPE_CREATED',
          roomId,
          senderId,
          seq,
          timestamp: Date.now(),
          payload: { shape, seq },
        });
        break;
      }

      case 'SHAPE_UPDATE': {
        const { shapeId, changes } = ShapeUpdateSchema.parse(payload);
        const { updated, seq } = session.applyShapeUpdate(shapeId, changes);

        if (updated) {
          this.persistence.enqueueSave(roomId, updated);

          session.broadcast({
            type: 'SHAPE_UPDATED',
            roomId,
            senderId,
            seq,
            timestamp: Date.now(),
            payload: { shapeId, changes, seq },
          });
        }
        break;
      }

      case 'SHAPE_DELETE': {
        const { shapeIds } = ShapeDeleteSchema.parse(payload);
        const seq = session.applyShapeDelete(shapeIds);

        this.persistence.enqueueDelete(roomId, shapeIds);

        session.broadcast({
          type: 'SHAPE_DELETED',
          roomId,
          senderId,
          seq,
          timestamp: Date.now(),
          payload: { shapeIds, seq },
        });
        break;
      }

      case 'STROKE_START': {
        const data = StrokeStartSchema.parse(payload);
        session.broadcast(
          {
            type: 'STROKE_START_BROADCAST',
            roomId,
            senderId,
            timestamp: Date.now(),
            payload: {
              userId: senderId,
              strokeId: data.strokeId,
              tool: data.tool,
              strokeColor: data.strokeColor,
              strokeWidth: data.strokeWidth,
              opacity: data.opacity,
              startPoint: data.startPoint,
            },
          },
          senderId
        );
        break;
      }

      case 'STROKE_CHUNK': {
        const data = StrokeChunkSchema.parse(payload);
        session.broadcast(
          {
            type: 'STROKE_CHUNK_BROADCAST',
            roomId,
            senderId,
            timestamp: Date.now(),
            payload: {
              userId: senderId,
              strokeId: data.strokeId,
              points: data.points,
            },
          },
          senderId
        );
        break;
      }

      case 'STROKE_END': {
        const data = StrokeEndSchema.parse(payload);
        session.broadcast(
          {
            type: 'STROKE_END',
            roomId,
            senderId,
            timestamp: Date.now(),
            payload: {
              strokeId: data.strokeId,
            },
          },
          senderId
        );
        break;
      }
    }
  }

  private handleDisconnect(socket: WebSocket): void {
    const info = this.socketToUser.get(socket);
    this.rateLimits.delete(socket);

    if (info) {
      const { roomId, userId } = info;
      this.socketToUser.delete(socket);

      const session = this.rooms.get(roomId);
      if (session) {
        session.removeClient(userId);

        session.broadcast({
          type: 'USER_LEFT',
          roomId,
          senderId: userId,
          timestamp: Date.now(),
          payload: { userId },
        });

        // If room is empty, trigger immediate persistence flush
        if (session.getClientCount() === 0) {
          this.persistence.flush();
        }
      }
    }
  }

  private checkRateLimit(socket: WebSocket): boolean {
    const now = Date.now();
    let record = this.rateLimits.get(socket);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + 1000 };
      this.rateLimits.set(socket, record);
      return true;
    }

    record.count++;
    return record.count <= 60; // Max 60 messages/sec per client
  }
}
