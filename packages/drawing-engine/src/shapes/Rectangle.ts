import { Point2D, RectangleProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';

export class Rectangle extends BaseShape {
  public readonly type = 'rectangle';
  public cornerRadius: number;

  constructor(props: RectangleProps) {
    super(props);
    this.cornerRadius = props.cornerRadius || 0;
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, cornerRadius, fillColor } = this;

    ctx.beginPath();
    if (cornerRadius > 0 && typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, cornerRadius);
    } else {
      ctx.rect(x, y, width, height);
    }

    if (fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
  }

  public hitTest(worldPoint: Point2D): boolean {
    // Transform test point into shape local coordinates (inverse rotation around center)
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const dx = worldPoint.x - cx;
    const dy = worldPoint.y - cy;

    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);

    const localX = cos * dx - sin * dy + cx;
    const localY = sin * dx + cos * dy + cy;

    const minX = Math.min(this.x, this.x + this.width);
    const maxX = Math.max(this.x, this.x + this.width);
    const minY = Math.min(this.y, this.y + this.height);
    const maxY = Math.max(this.y, this.y + this.height);

    const padding = Math.max(this.strokeWidth / 2, 4);

    return (
      localX >= minX - padding &&
      localX <= maxX + padding &&
      localY >= minY - padding &&
      localY <= maxY + padding
    );
  }

  public clone(newId?: string): Rectangle {
    return new Rectangle({
      ...this.serialize(),
      id: newId ?? this.id,
    });
  }

  public serialize(): RectangleProps {
    return {
      id: this.id,
      type: 'rectangle',
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
      cornerRadius: this.cornerRadius,
    };
  }
}
