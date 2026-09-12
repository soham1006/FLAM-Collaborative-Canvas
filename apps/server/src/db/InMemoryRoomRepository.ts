import { ShapeDTO } from '@flam/shared';
import { IRoomRepository, RoomRecord } from './types.js';

export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<string, RoomRecord> = new Map();
  private shapes: Map<string, Map<string, ShapeDTO>> = new Map();

  constructor() {
    // Seed a default demo room for instant testing
    const defaultRoom: RoomRecord = {
      id: 'demo-room-id',
      name: 'Architecture Canvas',
      slug: 'flam-demo-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      isPublic: true,
    };
    this.rooms.set(defaultRoom.id, defaultRoom);
    this.shapes.set(defaultRoom.id, new Map());
  }

  async findRoomBySlug(slug: string): Promise<RoomRecord | null> {
    for (const room of this.rooms.values()) {
      if (room.slug === slug) return room;
    }
    return null;
  }

  async findRoomById(id: string): Promise<RoomRecord | null> {
    return this.rooms.get(id) || null;
  }

  async createRoom(data: { name: string; slug: string; isPublic?: boolean }): Promise<RoomRecord> {
    const id = 'room-' + Math.random().toString(36).substring(2, 9);
    const room: RoomRecord = {
      id,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      isPublic: data.isPublic ?? true,
    };

    this.rooms.set(id, room);
    this.shapes.set(id, new Map());
    return room;
  }

  async getShapesByRoomId(roomId: string): Promise<ShapeDTO[]> {
    const roomShapes = this.shapes.get(roomId);
    if (!roomShapes) return [];
    return Array.from(roomShapes.values());
  }

  async saveShapes(roomId: string, shapesList: ShapeDTO[]): Promise<void> {
    if (!this.shapes.has(roomId)) {
      this.shapes.set(roomId, new Map());
    }
    const map = this.shapes.get(roomId)!;
    for (const s of shapesList) {
      map.set(s.id, s);
    }
  }

  async deleteShapes(roomId: string, shapeIds: string[]): Promise<void> {
    const map = this.shapes.get(roomId);
    if (!map) return;
    for (const id of shapeIds) {
      map.delete(id);
    }
  }
}
