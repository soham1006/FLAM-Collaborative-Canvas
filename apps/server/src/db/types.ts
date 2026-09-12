import { ShapeDTO } from '@flam/shared';

export interface RoomRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  isPublic: boolean;
  shapeCount?: number;
}

export interface IRoomRepository {
  findRoomBySlug(slug: string): Promise<RoomRecord | null>;
  findRoomById(id: string): Promise<RoomRecord | null>;
  createRoom(data: { name: string; slug: string; isPublic?: boolean }): Promise<RoomRecord>;
  getShapesByRoomId(roomId: string): Promise<ShapeDTO[]>;
  saveShapes(roomId: string, shapes: ShapeDTO[]): Promise<void>;
  deleteShapes(roomId: string, shapeIds: string[]): Promise<void>;
  listRooms?(limit?: number): Promise<RoomRecord[]>;
}

