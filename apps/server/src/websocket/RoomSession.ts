import { WebSocket } from 'ws';
import {
  ShapeDTO,
  ShapeUpdateDTO,
  UserPresence,
  WSMessage,
} from '@flam/shared';

export interface ConnectedClient {
  socket: WebSocket;
  user: UserPresence;
}

export class RoomSession {
  public readonly id: string;
  public readonly name: string;
  private seq: number = 0;
  private shapes: Map<string, ShapeDTO> = new Map();
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(id: string, name: string, initialShapes: ShapeDTO[] = []) {
    this.id = id;
    this.name = name;
    for (const shape of initialShapes) {
      this.shapes.set(shape.id, shape);
    }
  }

  public getNextSeq(): number {
    return ++this.seq;
  }

  public getCurrentSeq(): number {
    return this.seq;
  }

  public getShapes(): ShapeDTO[] {
    return Array.from(this.shapes.values());
  }

  public getUsers(): UserPresence[] {
    return Array.from(this.clients.values()).map((c) => c.user);
  }

  public addClient(userId: string, socket: WebSocket, user: UserPresence): void {
    this.clients.set(userId, { socket, user });
  }

  public removeClient(userId: string): ConnectedClient | null {
    const client = this.clients.get(userId) || null;
    this.clients.delete(userId);
    return client;
  }

  public getClient(userId: string): ConnectedClient | null {
    return this.clients.get(userId) || null;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public updateCursor(userId: string, x: number, y: number): void {
    const client = this.clients.get(userId);
    if (client) {
      client.user.cursor = { x, y };
      client.user.lastActive = Date.now();
    }
  }

  public updateSelection(userId: string, shapeIds: string[]): void {
    const client = this.clients.get(userId);
    if (client) {
      client.user.selectedShapeIds = shapeIds;
      client.user.lastActive = Date.now();
    }
  }

  public applyShapeCreate(shape: ShapeDTO): number {
    const seq = this.getNextSeq();
    this.shapes.set(shape.id, { ...shape, version: seq });
    return seq;
  }

  public applyShapeUpdate(shapeId: string, changes: ShapeUpdateDTO): { updated: ShapeDTO | null; seq: number } {
    const existing = this.shapes.get(shapeId);
    if (!existing) return { updated: null, seq: 0 };

    const seq = this.getNextSeq();
    const merged = {
      ...existing,
      ...changes,
      version: seq,
    } as ShapeDTO;

    this.shapes.set(shapeId, merged);
    return { updated: merged, seq };
  }

  public applyShapeDelete(shapeIds: string[]): number {
    const seq = this.getNextSeq();
    for (const id of shapeIds) {
      this.shapes.delete(id);
    }
    return seq;
  }

  /**
   * Broadcasts a JSON message to all connected clients in this room.
   */
  public broadcast(message: WSMessage, excludeUserId?: string): void {
    const payload = JSON.stringify(message);

    for (const [userId, client] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;

      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(payload);
        } catch (err) {
          console.error(`[RoomSession] Failed to send message to user ${userId}:`, err);
        }
      }
    }
  }
}
