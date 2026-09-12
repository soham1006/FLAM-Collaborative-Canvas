import { ShapeDTO } from '@flam/shared';
import { IRoomRepository } from '../db/types.js';
import { env } from '../config/env.js';

export class PersistenceQueue {
  private dirtyShapes: Map<string, Map<string, ShapeDTO>> = new Map();
  private dirtyDeletes: Map<string, Set<string>> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;

  constructor(private repo: IRoomRepository) {
    this.startAutoFlush();
  }

  public enqueueSave(roomId: string, shape: ShapeDTO): void {
    if (!this.dirtyShapes.has(roomId)) {
      this.dirtyShapes.set(roomId, new Map());
    }
    this.dirtyShapes.get(roomId)!.set(shape.id, shape);

    // If it was marked for deletion earlier, remove from delete set
    const deletes = this.dirtyDeletes.get(roomId);
    if (deletes) {
      deletes.delete(shape.id);
    }
  }

  public enqueueDelete(roomId: string, shapeIds: string[]): void {
    if (!this.dirtyDeletes.has(roomId)) {
      this.dirtyDeletes.set(roomId, new Set());
    }
    const deletes = this.dirtyDeletes.get(roomId)!;

    const shapes = this.dirtyShapes.get(roomId);
    for (const id of shapeIds) {
      deletes.add(id);
      if (shapes) {
        shapes.delete(id);
      }
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      // 1. Process Saves
      for (const [roomId, shapesMap] of this.dirtyShapes.entries()) {
        if (shapesMap.size > 0) {
          const batch = Array.from(shapesMap.values());
          shapesMap.clear();
          await this.repo.saveShapes(roomId, batch);
        }
      }

      // 2. Process Deletes
      for (const [roomId, deletesSet] of this.dirtyDeletes.entries()) {
        if (deletesSet.size > 0) {
          const ids = Array.from(deletesSet);
          deletesSet.clear();
          await this.repo.deleteShapes(roomId, ids);
        }
      }
    } catch (err) {
      console.error('[PersistenceQueue] Error during database flush:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  private startAutoFlush(): void {
    this.timer = setInterval(() => {
      this.flush().catch((err) =>
        console.error('[PersistenceQueue] Background flush error:', err)
      );
    }, env.PERSISTENCE_FLUSH_INTERVAL_MS);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
