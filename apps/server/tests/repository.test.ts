import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRoomRepository } from '../src/db/SqliteRoomRepository.js';
import { RoomService } from '../src/services/RoomService.js';
import { ShapeDTO } from '@flam/shared';

describe('SqliteRoomRepository & RoomService', () => {
  let repo: SqliteRoomRepository;
  let service: RoomService;
  let roomId: string;

  before(() => {
    // Test with in-memory SQLite database
    repo = new SqliteRoomRepository(':memory:');
    service = new RoomService(repo);
  });

  after(() => {
    repo.close();
  });

  it('creates and retrieves a new room by slug', async () => {
    const { room, shapes } = await service.getOrCreateRoom('test-room-1', 'Test Architecture');
    assert.equal(room.slug, 'test-room-1');
    assert.equal(room.name, 'Test Architecture');
    assert.ok(room.id);
    assert.equal(shapes.length, 0);

    roomId = room.id;

    const found = await service.getRoomBySlug('test-room-1');
    assert.ok(found);
    assert.equal(found.id, room.id);
    assert.equal(found.slug, 'test-room-1');
    assert.equal(found.name, 'Test Architecture');
  });

  it('persists and retrieves shapes for a room', async () => {
    const testShape: ShapeDTO = {
      id: 'shape-rect-1',
      type: 'rectangle',
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      strokeColor: '#0284c7',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await repo.saveShapes(roomId, [testShape]);

    const shapes = await repo.getShapesByRoomId(roomId);
    assert.equal(shapes.length, 1);
    assert.equal(shapes[0].id, 'shape-rect-1');
    assert.equal(shapes[0].width, 200);
  });

  it('lists recent rooms with shape counts', async () => {
    await service.getOrCreateRoom('test-room-2', 'Sprint Board');
    const rooms = await service.listRecentRooms(10);

    assert.ok(rooms.length >= 2);
    const room1 = rooms.find((r) => r.slug === 'test-room-1');
    assert.ok(room1);
    assert.equal(room1.shapeCount, 1);
  });

  it('exports room state as JSON bundle', async () => {
    const exported = await service.exportRoomData('test-room-1');
    assert.ok(exported);
    assert.equal(exported.room.slug, 'test-room-1');
    assert.equal(exported.shapes.length, 1);
  });

  it('deletes shapes cleanly from room', async () => {
    await repo.deleteShapes(roomId, ['shape-rect-1']);
    const shapes = await repo.getShapesByRoomId(roomId);
    assert.equal(shapes.length, 0);
  });
});
