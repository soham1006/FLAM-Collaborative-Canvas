import { Point2D, LineProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';
import { BoundingBox } from '../math/BoundingBox.js';

export class Line extends BaseShape {
  public readonly type = 'line';
  public x2: number;
  public y2: number;

  constructor(props: LineProps) {
    super(props);
    this.x2 = props.x2;
    this.y2 = props.y2;
    this.width = this.x2 - this.x;
    this.height = this.y2 - this.y;
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
  }

  public override getBounds(): BoundingBox {
    return BoundingBox.fromPoints([
      { x: this.x, y: this.y },
      { x: this.x2, y: this.y2 },
    ]).expand(Math.max(this.strokeWidth, 8));
  }

  public hitTest(worldPoint: Point2D): boolean {
    const threshold = Math.max(this.strokeWidth / 2, 8);
    const dist = this.distanceToSegment(worldPoint, { x: this.x, y: this.y }, { x: this.x2, y: this.y2 });
    return dist <= threshold;
  }

  private distanceToSegment(p: Point2D, v: Point2D, w: Point2D): number {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);

    // Project point onto segment: clamp t to [0, 1]
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);

    return Math.hypot(p.x - projX, p.y - projY);
  }

  public clone(newId?: string): Line {
    return new Line({
      ...this.serialize(),
      id: newId ?? this.id,
    });
  }

  public serialize(): LineProps {
    return {
      id: this.id,
      type: 'line',
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
      x2: this.x2,
      y2: this.y2,
    };
  }
}
