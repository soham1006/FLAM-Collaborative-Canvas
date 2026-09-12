import { Point2D } from '@flam/shared';
import { BaseShape } from '../shapes/BaseShape.js';
import { BoundingBox } from '../math/BoundingBox.js';
import { ViewportManager } from '../core/ViewportManager.js';

export type HandleType =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'
  | 'body';

export interface HandleInfo {
  type: HandleType;
  x: number;
  y: number;
}

export class SelectionManager {
  private selectedIds: Set<string> = new Set();
  public isMarquee: boolean = false;
  public marqueeStart: Point2D = { x: 0, y: 0 };
  public marqueeEnd: Point2D = { x: 0, y: 0 };

  public getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public select(id: string, additive: boolean = false): void {
    if (!additive) {
      this.selectedIds.clear();
    }
    this.selectedIds.add(id);
  }

  public deselect(id: string): void {
    this.selectedIds.delete(id);
  }

  public clear(): void {
    this.selectedIds.clear();
    this.isMarquee = false;
  }

  public setSelection(ids: string[]): void {
    this.selectedIds = new Set(ids);
  }

  /**
   * Calculates collective Axis-Aligned Bounding Box for all selected shapes.
   */
  public getCombinedBounds(shapesMap: Map<string, BaseShape>): BoundingBox | null {
    const selected = Array.from(this.selectedIds)
      .map((id) => shapesMap.get(id))
      .filter((s): s is BaseShape => Boolean(s));

    if (selected.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of selected) {
      const b = shape.getBounds();
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }

    return new BoundingBox(minX, minY, maxX, maxY);
  }

  /**
   * Generates handles for collective bounding box.
   */
  public getHandles(bounds: BoundingBox, zoom: number): HandleInfo[] {
    const padding = 6 / zoom;
    const b = bounds.expand(padding);

    return [
      { type: 'nw', x: b.minX, y: b.minY },
      { type: 'n', x: b.centerX, y: b.minY },
      { type: 'ne', x: b.maxX, y: b.minY },
      { type: 'e', x: b.maxX, y: b.centerY },
      { type: 'se', x: b.maxX, y: b.maxY },
      { type: 's', x: b.centerX, y: b.maxY },
      { type: 'sw', x: b.minX, y: b.maxY },
      { type: 'w', x: b.minX, y: b.centerY },
      { type: 'rotate', x: b.centerX, y: b.minY - 20 / zoom },
    ];
  }

  /**
   * Hit test against handles.
   */
  public hitTestHandle(
    point: Point2D,
    bounds: BoundingBox,
    zoom: number
  ): HandleType | null {
    const handleSize = 8 / zoom;
    const hitRadius = handleSize * 1.2;

    const handles = this.getHandles(bounds, zoom);
    for (const h of handles) {
      if (Math.hypot(point.x - h.x, point.y - h.y) <= hitRadius) {
        return h.type;
      }
    }

    // Inside body of selection box
    if (bounds.contains(point)) {
      return 'body';
    }

    return null;
  }

  /**
   * Renders the selection box, corner resize handles, and rotation handle.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    shapesMap: Map<string, BaseShape>,
    viewport: ViewportManager
  ): void {
    const zoom = viewport.getZoom();

    // 1. Render Multi-Selection Marquee if dragging
    if (this.isMarquee) {
      const minX = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
      const minY = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
      const width = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
      const height = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);

      ctx.save();
      ctx.strokeStyle = '#4f46e5';
      ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);

      ctx.beginPath();
      ctx.rect(minX, minY, width, height);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 2. Render Selection Bounding Box & Handles
    const bounds = this.getCombinedBounds(shapesMap);
    if (!bounds) return;

    ctx.save();
    const padding = 6 / zoom;
    const b = bounds.expand(padding);

    // Bounding Rect
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.5 / zoom;
    ctx.fillStyle = 'rgba(79, 70, 229, 0.04)';

    ctx.beginPath();
    ctx.rect(b.minX, b.minY, b.width, b.height);
    ctx.fill();
    ctx.stroke();

    // Rotation Handle Connector
    const rotateY = b.minY - 20 / zoom;
    ctx.beginPath();
    ctx.moveTo(b.centerX, b.minY);
    ctx.lineTo(b.centerX, rotateY);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();

    // Rotation Knob
    const handleSize = 7 / zoom;
    ctx.beginPath();
    ctx.arc(b.centerX, rotateY, handleSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Corner & Edge Handles
    const handles = this.getHandles(bounds, zoom).filter((h) => h.type !== 'rotate');
    for (const h of handles) {
      ctx.beginPath();
      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
