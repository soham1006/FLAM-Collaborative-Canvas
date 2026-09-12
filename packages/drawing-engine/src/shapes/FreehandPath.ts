import { Point2D, FreehandProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';
import { BoundingBox } from '../math/BoundingBox.js';
import { simplifyPathRDP } from '../math/RDP.js';

export class FreehandPath extends BaseShape {
  public readonly type = 'freehand';
  public points: Point2D[];

  constructor(props: FreehandProps) {
    super(props);
    this.points = props.points || [];
  }

  public simplify(epsilon: number = 1.2): void {
    this.points = simplifyPathRDP(this.points, epsilon);
    this.updateBoundsFromPoints();
  }

  public addPoint(point: Point2D): void {
    this.points.push(point);
    this.updateBoundsFromPoints();
  }

  private updateBoundsFromPoints(): void {
    const box = BoundingBox.fromPoints(this.points);
    this.x = box.minX;
    this.y = box.minY;
    this.width = box.width;
    this.height = box.height;
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    if (this.points.length === 0) return;

    ctx.beginPath();

    if (this.points.length === 1) {
      // Single dot
      ctx.arc(this.points[0].x, this.points[0].y, this.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.strokeColor;
      ctx.fill();
      return;
    }

    if (this.points.length === 2) {
      ctx.moveTo(this.points[0].x, this.points[0].y);
      ctx.lineTo(this.points[1].x, this.points[1].y);
      ctx.stroke();
      return;
    }

    // Smooth Quadratic Bezier Curves through midpoints
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) / 2;
      const yc = (this.points[i].y + this.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
    }

    // Last segment
    const lastIndex = this.points.length - 1;
    ctx.lineTo(this.points[lastIndex].x, this.points[lastIndex].y);

    ctx.stroke();
  }

  public override getBounds(): BoundingBox {
    return BoundingBox.fromPoints(this.points).expand(Math.max(this.strokeWidth, 6));
  }

  public hitTest(worldPoint: Point2D): boolean {
    const threshold = Math.max(this.strokeWidth / 2, 8);

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dist = this.distanceToSegment(worldPoint, p1, p2);
      if (dist <= threshold) return true;
    }

    return false;
  }

  private distanceToSegment(p: Point2D, v: Point2D, w: Point2D): number {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);

    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);

    return Math.hypot(p.x - projX, p.y - projY);
  }

  public clone(newId?: string): FreehandPath {
    return new FreehandPath({
      ...this.serialize(),
      id: newId ?? this.id,
      points: this.points.map((p) => ({ ...p })),
    });
  }

  public serialize(): FreehandProps {
    return {
      id: this.id,
      type: 'freehand',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      strokeColor: this.strokeColor,
      fillColor: this.fillColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      zIndex: this.zIndex,
      version: this.version,
      points: this.points,
    };
  }
}
