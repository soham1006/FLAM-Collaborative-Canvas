import { Point2D } from '@flam/shared';
import { Vector2D } from '../math/Vector2D.js';
import { BoundingBox } from '../math/BoundingBox.js';

export interface ViewportChangeEvent {
  pan: { x: number; y: number };
  zoom: number;
}

export class ViewportManager {
  private pan: Vector2D = new Vector2D(0, 0);
  private zoom: number = 1;
  private minZoom: number = 0.05;
  private maxZoom: number = 10;
  private dpr: number = 1;

  constructor(
    private onChange?: (event: ViewportChangeEvent) => void
  ) {
    if (typeof window !== 'undefined') {
      this.dpr = window.devicePixelRatio || 1;
    }
  }

  getPan(): Vector2D {
    return this.pan.clone();
  }

  getZoom(): number {
    return this.zoom;
  }

  getDpr(): number {
    return this.dpr;
  }

  setDpr(dpr: number): void {
    this.dpr = dpr;
  }

  setPan(x: number, y: number): void {
    this.pan = new Vector2D(x, y);
    this.notify();
  }

  reset(): void {
    this.pan = new Vector2D(0, 0);
    this.zoom = 1;
    this.notify();
  }

  panBy(dx: number, dy: number): void {
    this.pan = new Vector2D(this.pan.x + dx, this.pan.y + dy);
    this.notify();
  }

  setZoom(zoom: number, anchor?: Point2D): void {
    const clampedZoom = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);
    if (clampedZoom === this.zoom) return;

    if (anchor) {
      // Zoom centered around anchor (e.g. mouse cursor)
      const worldBefore = this.screenToWorld(anchor);
      this.zoom = clampedZoom;
      const worldAfter = this.screenToWorld(anchor);

      const dx = (worldAfter.x - worldBefore.x) * this.zoom;
      const dy = (worldAfter.y - worldBefore.y) * this.zoom;
      this.pan = new Vector2D(this.pan.x + dx, this.pan.y + dy);
    } else {
      this.zoom = clampedZoom;
    }

    this.notify();
  }

  zoomBy(factor: number, anchor?: Point2D): void {
    this.setZoom(this.zoom * factor, anchor);
  }

  screenToWorld(screenPoint: Point2D): Point2D {
    return {
      x: (screenPoint.x - this.pan.x) / this.zoom,
      y: (screenPoint.y - this.pan.y) / this.zoom,
    };
  }

  worldToScreen(worldPoint: Point2D): Point2D {
    return {
      x: worldPoint.x * this.zoom + this.pan.x,
      y: worldPoint.y * this.zoom + this.pan.y,
    };
  }

  /**
   * Calculates the world-space bounding box currently visible on screen.
   * Crucial for O(log N) viewport culling.
   */
  getVisibleFrustum(screenWidth: number, screenHeight: number): BoundingBox {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: screenWidth, y: screenHeight });
    return new BoundingBox(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
  }

  /**
   * Applies the current camera pan, zoom, and DPR scale to a Canvas 2D Context.
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.zoom * this.dpr,
      0,
      0,
      this.zoom * this.dpr,
      this.pan.x * this.dpr,
      this.pan.y * this.dpr
    );
  }

  /**
   * Resets the context transform to identity (screen space).
   */
  resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private notify(): void {
    this.onChange?.({
      pan: { x: this.pan.x, y: this.pan.y },
      zoom: this.zoom,
    });
  }
}
