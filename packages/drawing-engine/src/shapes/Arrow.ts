import { Point2D, ArrowProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';
import { BoundingBox } from '../math/BoundingBox.js';

export class Arrow extends BaseShape {
  public readonly type = 'arrow';
  public x2: number;
  public y2: number;
  public headSize: number;

  constructor(props: ArrowProps) {
    super(props);
    this.x2 = props.x2;
    this.y2 = props.y2;
    this.headSize = props.headSize || Math.max(12, props.strokeWidth * 3);
    this.width = this.x2 - this.x;
    this.height = this.y2 - this.y;
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    const { x, y, x2, y2, headSize } = this;
    const angle = Math.atan2(y2 - y, x2 - x);

    // Draw main line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headSize * Math.cos(angle - Math.PI / 6),
      y2 - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headSize * Math.cos(angle + Math.PI / 6),
      y2 - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = this.strokeColor;
    ctx.fill();
  }

  public override getBounds(): BoundingBox {
    return BoundingBox.fromPoints([
      { x: this.x, y: this.y },
      { x: this.x2, y: this.y2 },
    ]).expand(Math.max(this.strokeWidth, this.headSize));
  }

  public hitTest(worldPoint: Point2D): boolean {
    const threshold = Math.max(this.strokeWidth / 2, 8);
    const dist = this.distanceToSegment(worldPoint, { x: this.x, y: this.y }, { x: this.x2, y: this.y2 });
    return dist <= threshold;
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

  public clone(newId?: string): Arrow {
    return new Arrow({
      ...this.serialize(),
      id: newId ?? this.id,
    });
  }

  public serialize(): ArrowProps {
    return {
      id: this.id,
      type: 'arrow',
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
      headSize: this.headSize,
    };
  }
}
