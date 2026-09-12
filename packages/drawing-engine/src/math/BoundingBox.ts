import { Point2D, BoundingBox as IBoundingBox } from '@flam/shared';

export class BoundingBox implements IBoundingBox {
  constructor(
    public minX: number,
    public minY: number,
    public maxX: number,
    public maxY: number
  ) {}

  get width(): number {
    return this.maxX - this.minX;
  }

  get height(): number {
    return this.maxY - this.minY;
  }

  get centerX(): number {
    return (this.minX + this.maxX) / 2;
  }

  get centerY(): number {
    return (this.minY + this.maxY) / 2;
  }

  static fromPoints(points: Point2D[]): BoundingBox {
    if (points.length === 0) {
      return new BoundingBox(0, 0, 0, 0);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    return new BoundingBox(minX, minY, maxX, maxY);
  }

  static fromRect(x: number, y: number, width: number, height: number): BoundingBox {
    const minX = Math.min(x, x + width);
    const maxX = Math.max(x, x + width);
    const minY = Math.min(y, y + height);
    const maxY = Math.max(y, y + height);
    return new BoundingBox(minX, minY, maxX, maxY);
  }

  contains(point: Point2D): boolean {
    return (
      point.x >= this.minX &&
      point.x <= this.maxX &&
      point.y >= this.minY &&
      point.y <= this.maxY
    );
  }

  intersects(other: BoundingBox): boolean {
    return (
      this.minX <= other.maxX &&
      this.maxX >= other.minX &&
      this.minY <= other.maxY &&
      this.maxY >= other.minY
    );
  }

  expand(padding: number): BoundingBox {
    return new BoundingBox(
      this.minX - padding,
      this.minY - padding,
      this.maxX + padding,
      this.maxY + padding
    );
  }
}
