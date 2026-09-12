import { Point2D } from '@flam/shared';

export class Vector2D implements Point2D {
  constructor(public x: number = 0, public y: number = 0) {}

  static from(point: Point2D): Vector2D {
    return new Vector2D(point.x, point.y);
  }

  add(v: Point2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  subtract(v: Point2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2D {
    if (scalar === 0) throw new Error('Division by zero');
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  distanceTo(v: Point2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2D {
    const len = this.length();
    if (len === 0) return new Vector2D(0, 0);
    return this.divide(len);
  }

  dot(v: Point2D): number {
    return this.x * v.x + this.y * v.y;
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }
}
