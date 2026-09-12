import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { ShapeDTO } from '@flam/shared';
import { IRoomRepository, RoomRecord } from './types.js';

export class SqliteRoomRepository implements IRoomRepository {
  private db: DatabaseSync;

  constructor(dbPath: string = './dev.db') {
    // Ensure parent directory exists if a nested path is passed
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastActiveAt TEXT NOT NULL,
        isPublic INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);

      CREATE TABLE IF NOT EXISTS canvas_objects (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        rotation REAL NOT NULL DEFAULT 0,
        strokeColor TEXT NOT NULL DEFAULT '#0f172a',
        fillColor TEXT NOT NULL DEFAULT 'transparent',
        strokeWidth REAL NOT NULL DEFAULT 2,
        opacity REAL NOT NULL DEFAULT 1,
        zIndex INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        data TEXT NOT NULL DEFAULT '{}',
        deletedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_canvas_objects_room ON canvas_objects(roomId, deletedAt);
    `);
  }

  async findRoomBySlug(slug: string): Promise<RoomRecord | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, slug, createdAt, updatedAt, lastActiveAt, isPublic
      FROM rooms
      WHERE slug = ?
    `);
    const row = stmt.get(slug) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastActiveAt: new Date(row.lastActiveAt),
      isPublic: Boolean(row.isPublic),
    };
  }

  async findRoomById(id: string): Promise<RoomRecord | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, slug, createdAt, updatedAt, lastActiveAt, isPublic
      FROM rooms
      WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastActiveAt: new Date(row.lastActiveAt),
      isPublic: Boolean(row.isPublic),
    };
  }

  async createRoom(data: { name: string; slug: string; isPublic?: boolean }): Promise<RoomRecord> {
    const id = 'room-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const isPublic = data.isPublic ?? true;

    const stmt = this.db.prepare(`
      INSERT INTO rooms (id, name, slug, createdAt, updatedAt, lastActiveAt, isPublic)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.slug, now, now, now, isPublic ? 1 : 0);

    return {
      id,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      lastActiveAt: new Date(now),
      isPublic,
    };
  }

  async getShapesByRoomId(roomId: string): Promise<ShapeDTO[]> {
    const stmt = this.db.prepare(`
      SELECT id, type, x, y, width, height, rotation, strokeColor, fillColor,
             strokeWidth, opacity, zIndex, version, data
      FROM canvas_objects
      WHERE roomId = ? AND deletedAt IS NULL
      ORDER BY zIndex ASC
    `);

    const rows = stmt.all(roomId) as any[];
    return rows.map((r) => {
      let extra = {};
      try {
        extra = JSON.parse(r.data);
      } catch {
        extra = {};
      }

      return {
        id: r.id,
        type: r.type,
        x: Number(r.x),
        y: Number(r.y),
        width: Number(r.width),
        height: Number(r.height),
        rotation: Number(r.rotation || 0),
        strokeColor: r.strokeColor,
        fillColor: r.fillColor,
        strokeWidth: Number(r.strokeWidth),
        opacity: Number(r.opacity),
        zIndex: Number(r.zIndex),
        version: Number(r.version),
        ...extra,
      } as ShapeDTO;
    });
  }

  async saveShapes(roomId: string, shapesList: ShapeDTO[]): Promise<void> {
    const now = new Date().toISOString();
    const upsertStmt = this.db.prepare(`
      INSERT INTO canvas_objects (
        id, roomId, type, x, y, width, height, rotation, strokeColor, fillColor,
        strokeWidth, opacity, zIndex, version, data, deletedAt, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, NULL, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        x = excluded.x,
        y = excluded.y,
        width = excluded.width,
        height = excluded.height,
        rotation = excluded.rotation,
        strokeColor = excluded.strokeColor,
        fillColor = excluded.fillColor,
        strokeWidth = excluded.strokeWidth,
        opacity = excluded.opacity,
        zIndex = excluded.zIndex,
        version = excluded.version,
        data = excluded.data,
        deletedAt = NULL,
        updatedAt = excluded.updatedAt
    `);

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

      upsertStmt.run(
        id,
        roomId,
        type,
        x,
        y,
        width,
        height,
        rotation || 0,
        strokeColor || '#0f172a',
        fillColor || 'transparent',
        strokeWidth ?? 2,
        opacity ?? 1,
        zIndex ?? 0,
        version ?? 1,
        JSON.stringify(extra),
        now,
        now
      );
    }
  }

  async deleteShapes(roomId: string, shapeIds: string[]): Promise<void> {
    if (shapeIds.length === 0) return;
    const now = new Date().toISOString();
    const placeholders = shapeIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE canvas_objects
      SET deletedAt = ?
      WHERE roomId = ? AND id IN (${placeholders})
    `);
    stmt.run(now, roomId, ...shapeIds);
  }

  async listRooms(limit: number = 20): Promise<RoomRecord[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, slug, createdAt, updatedAt, lastActiveAt, isPublic
      FROM rooms
      ORDER BY updatedAt DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      lastActiveAt: new Date(r.lastActiveAt),
      isPublic: Boolean(r.isPublic),
    }));
  }
}

