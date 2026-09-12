import { PrismaClient, CanvasObject } from '@prisma/client';
import { ShapeDTO } from '@flam/shared';
import { IRoomRepository, RoomRecord } from './types.js';

export class PrismaRoomRepository implements IRoomRepository {
  constructor(private prisma: PrismaClient) {}

  async findRoomBySlug(slug: string): Promise<RoomRecord | null> {
    const room = await this.prisma.room.findUnique({
      where: { slug },
    });
    return room;
  }

  async findRoomById(id: string): Promise<RoomRecord | null> {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });
    return room;
  }

  async createRoom(data: { name: string; slug: string; isPublic?: boolean }): Promise<RoomRecord> {
    const room = await this.prisma.room.create({
      data: {
        name: data.name,
        slug: data.slug,
        isPublic: data.isPublic ?? true,
      },
    });
    return room;
  }

  async getShapesByRoomId(roomId: string): Promise<ShapeDTO[]> {
    const records = await this.prisma.canvasObject.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { zIndex: 'asc' },
    });

    return records.map((r: CanvasObject) => {
      const extraData = (r.data as Record<string, unknown>) || {};
      return {
        id: r.id,
        type: r.type as any,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        rotation: r.rotation,
        strokeColor: r.strokeColor,
        fillColor: r.fillColor,
        strokeWidth: r.strokeWidth,
        opacity: r.opacity,
        zIndex: r.zIndex,
        version: r.version,
        ...extraData,
      } as ShapeDTO;
    });
  }

  async saveShapes(roomId: string, shapesList: ShapeDTO[]): Promise<void> {
    for (const s of shapesList) {
      const {
        id,
        type,
        x,
        y,
        width,
        height,
        rotation,
        strokeColor,
        fillColor,
        strokeWidth,
        opacity,
        zIndex,
        version,
        ...extra
      } = s;

      await this.prisma.canvasObject.upsert({
        where: { id },
        create: {
          id,
          roomId,
          type,
          x,
          y,
          width,
          height,
          rotation: rotation || 0,
          strokeColor: strokeColor || '#0f172a',
          fillColor: fillColor || 'transparent',
          strokeWidth: strokeWidth ?? 2,
          opacity: opacity ?? 1,
          zIndex: zIndex ?? 0,
          version: version ?? 1,
          data: extra as any,
        },
        update: {
          x,
          y,
          width,
          height,
          rotation: rotation || 0,
          strokeColor,
          fillColor,
          strokeWidth,
          opacity,
          zIndex,
          version,
          data: extra as any,
          deletedAt: null,
        },
      });
    }
  }

  async deleteShapes(roomId: string, shapeIds: string[]): Promise<void> {
    await this.prisma.canvasObject.updateMany({
      where: {
        roomId,
        id: { in: shapeIds },
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
