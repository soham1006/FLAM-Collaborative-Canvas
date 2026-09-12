import { Point2D, CircleProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';

export class Circle extends BaseShape {
  public readonly type = 'circle';

  constructor(props: CircleProps) {
    super(props);
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    const rx = Math.abs(this.width) / 2;
    const ry = Math.abs(this.height) / 2;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);

    if (this.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
  }

  public hitTest(worldPoint: Point2D): boolean {
    const rx = Math.abs(this.width) / 2 + Math.max(this.strokeWidth / 2, 4);
    const ry = Math.abs(this.height) / 2 + Math.max(this.strokeWidth / 2, 4);
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Inverse rotation
    const dx = worldPoint.x - cx;
    const dy = worldPoint.y - cy;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const localX = cos * dx - sin * dy;
    const localY = sin * dx + cos * dy;

    // Standard ellipse formula
    const normalizedDist = (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry);
    return normalizedDist <= 1;
  }

  public clone(newId?: string): Circle {
    return new Circle({
      ...this.serialize(),
      id: newId ?? this.id,
    });
  }

  public serialize(): CircleProps {
    return {
      id: this.id,
      type: 'circle',
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
    };
  }
}
