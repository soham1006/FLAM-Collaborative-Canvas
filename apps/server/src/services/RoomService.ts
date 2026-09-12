import { IRoomRepository, RoomRecord } from '../db/types.js';
import { ShapeDTO } from '@flam/shared';

export class RoomService {
  constructor(private repo: IRoomRepository) {}

  async getOrCreateRoom(slug: string, name?: string): Promise<{ room: RoomRecord; shapes: ShapeDTO[] }> {
    let room = await this.repo.findRoomBySlug(slug);

    if (!room) {
      room = await this.repo.createRoom({
        slug,
        name: name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }

    const shapes = await this.repo.getShapesByRoomId(room.id);
    return { room, shapes };
  }

  async getRoomBySlug(slug: string): Promise<RoomRecord | null> {
    return this.repo.findRoomBySlug(slug);
  }

  async exportRoomData(slug: string): Promise<{ room: RoomRecord; shapes: ShapeDTO[] } | null> {
    const room = await this.repo.findRoomBySlug(slug);
    if (!room) return null;

    const shapes = await this.repo.getShapesByRoomId(room.id);
    return { room, shapes };
  }
}
