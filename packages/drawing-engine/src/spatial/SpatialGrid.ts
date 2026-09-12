import { BaseShape } from '../shapes/BaseShape.js';
import { BoundingBox } from '../math/BoundingBox.js';

export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  private shapeMap: Map<string, BaseShape> = new Map();

  constructor(cellSize: number = 250) {
    this.cellSize = cellSize;
  }

  private getKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  public insert(shape: BaseShape): void {
    this.shapeMap.set(shape.id, shape);
    const bounds = shape.getBounds();

    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = this.getKey(x, y);
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(shape.id);
      }
    }
  }

  public remove(shapeId: string): void {
    const shape = this.shapeMap.get(shapeId);
    if (!shape) return;

    const bounds = shape.getBounds();
    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = this.getKey(x, y);
        const cell = this.cells.get(key);
        if (cell) {
          cell.delete(shapeId);
          if (cell.size === 0) {
            this.cells.delete(key);
          }
        }
      }
    }

    this.shapeMap.delete(shapeId);
  }

  public update(shape: BaseShape): void {
    this.remove(shape.id);
    this.insert(shape);
  }

  public clear(): void {
    this.cells.clear();
    this.shapeMap.clear();
  }

  /**
   * Queries all shapes intersecting a search bounding box (e.g. current viewport frustum).
   * Time Complexity: O(cells * average_shapes_per_cell) instead of O(N_total).
   */
  public query(box: BoundingBox): BaseShape[] {
    const minCellX = Math.floor(box.minX / this.cellSize);
    const maxCellX = Math.floor(box.maxX / this.cellSize);
    const minCellY = Math.floor(box.minY / this.cellSize);
    const maxCellY = Math.floor(box.maxY / this.cellSize);

    const candidates = new Set<string>();

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = this.getKey(x, y);
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            candidates.add(id);
          }
        }
      }
    }

    // Precise AABB intersection filter
    const results: BaseShape[] = [];
    for (const id of candidates) {
      const shape = this.shapeMap.get(id);
      if (shape && shape.getBounds().intersects(box)) {
        results.push(shape);
      }
    }

    // Sort by zIndex to preserve stacking order
    return results.sort((a, b) => a.zIndex - b.zIndex);
  }
}
