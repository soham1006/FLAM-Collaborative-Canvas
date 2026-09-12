import {
  ShapeType,
  BaseShapeProps,
  ShapeDTO,
  Point2D,
} from '@flam/shared';
import { BoundingBox } from '../math/BoundingBox.js';
import { ViewportManager } from '../core/ViewportManager.js';

export abstract class BaseShape {
  public id: string;
  public abstract type: ShapeType;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public rotation: number;
  public strokeColor: string;
  public fillColor: string;
  public strokeWidth: number;
  public opacity: number;
  public zIndex: number;
  public version: number;

  constructor(props: BaseShapeProps) {
    this.id = props.id;
    this.x = props.x;
    this.y = props.y;
    this.width = props.width;
    this.height = props.height;
    this.rotation = props.rotation || 0;
    this.strokeColor = props.strokeColor || '#0f172a';
    this.fillColor = props.fillColor || 'transparent';
    this.strokeWidth = props.strokeWidth ?? 2;
    this.opacity = props.opacity ?? 1;
    this.zIndex = props.zIndex ?? 0;
    this.version = props.version ?? 1;
  }

  /**
   * Template Method Pattern:
   * Handles common transformation (translation to origin, rotation, alpha, line styles)
   * before invoking protected drawGeometry(ctx) implemented by specific shapes.
   */
  public render(ctx: CanvasRenderingContext2D, _viewport: ViewportManager): void {
    ctx.save();

    // Set global opacity
    ctx.globalAlpha = this.opacity;

    // Apply rotation around center if present
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    if (this.rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(this.rotation);
      ctx.translate(-cx, -cy);
    }

    // Set line and fill styles
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.fillColor !== 'transparent') {
      ctx.fillStyle = this.fillColor;
    }

    // Polymorphic geometry drawing
    this.drawGeometry(ctx);

    ctx.restore();
  }

  /**
   * Protected hook for polymorphic shape geometry rasterization.
   */
  protected abstract drawGeometry(ctx: CanvasRenderingContext2D): void;

  /**
   * Calculates Axis-Aligned Bounding Box (AABB) in world coordinates.
   */
  public getBounds(): BoundingBox {
    return BoundingBox.fromRect(this.x, this.y, this.width, this.height);
  }

  /**
   * Polymorphic hit-testing algorithm.
   */
  public abstract hitTest(worldPoint: Point2D): boolean;

  /**
   * Deep copy of the shape. Preserves ID by default unless newId is provided.
   */
  public abstract clone(newId?: string): BaseShape;

  /**
   * Serializes the OOP instance into a plain data transfer object (DTO).
   */
  public abstract serialize(): ShapeDTO;
}
