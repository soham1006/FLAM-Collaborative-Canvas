import { Point2D, ShapeDTO, UserPresence } from '@flam/shared';
import { ViewportManager, ViewportChangeEvent } from './ViewportManager.js';
import { RenderLoop } from './RenderLoop.js';
import { EventBus } from './EventBus.js';
import { BaseShape } from '../shapes/BaseShape.js';
import { Rectangle } from '../shapes/Rectangle.js';
import { Circle } from '../shapes/Circle.js';
import { Line } from '../shapes/Line.js';
import { Arrow } from '../shapes/Arrow.js';
import { TextShape } from '../shapes/TextShape.js';
import { FreehandPath } from '../shapes/FreehandPath.js';
import { ShapeFactory } from '../shapes/ShapeFactory.js';
import { SelectionManager, HandleType } from '../selection/SelectionManager.js';
import { HistoryManager, HistoryState } from '../history/HistoryManager.js';
import { SpatialGrid } from '../spatial/SpatialGrid.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';
import { DeleteShapeCommand } from '../commands/DeleteShapeCommand.js';
import { MoveShapeCommand } from '../commands/MoveShapeCommand.js';

export type CanvasTool =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text';

export interface CanvasStyleProps {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface CanvasEngineOptions {
  baseCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  onViewportChange?: (event: ViewportChangeEvent) => void;
  onShapeCreated?: (shape: ShapeDTO) => void;
  onShapeUpdated?: (shape: ShapeDTO) => void;
  onShapeDeleted?: (shapeIds: string[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onHistoryChange?: (state: HistoryState) => void;
}

export class CanvasEngine {
  public readonly viewport: ViewportManager;
  public readonly events: EventBus = new EventBus();
  public readonly selection: SelectionManager = new SelectionManager();
  public readonly history: HistoryManager;
  private readonly renderLoop: RenderLoop;

  private baseCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;

  // Shapes Collection (Key: Shape ID)
  private shapes: Map<string, BaseShape> = new Map();
  private spatialGrid: SpatialGrid = new SpatialGrid(250);
  private remoteUsers: Map<string, UserPresence> = new Map();

  // Active Tool & Style State
  private activeTool: CanvasTool = 'select';
  private styleProps: CanvasStyleProps = {
    strokeColor: '#0f172a',
    fillColor: 'transparent',
    strokeWidth: 2,
    opacity: 1,
  };

  // Interaction State
  private isInteracting: boolean = false;
  private isDraggingHand: boolean = false;
  private isSpacePressed: boolean = false;
  private startPoint: Point2D = { x: 0, y: 0 };
  private activeShape: BaseShape | null = null;
  private activeHandle: HandleType | null = null;
  private totalDragDelta: { dx: number; dy: number } = { dx: 0, dy: 0 };
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

  // Callbacks
  private callbacks: CanvasEngineOptions;

  constructor(options: CanvasEngineOptions) {
    this.callbacks = options;
    this.baseCanvas = options.baseCanvas;
    this.overlayCanvas = options.overlayCanvas;

    const baseCtx = this.baseCanvas.getContext('2d');
    const overlayCtx = this.overlayCanvas.getContext('2d');

    if (!baseCtx || !overlayCtx) {
      throw new Error('Failed to acquire 2D canvas context');
    }

    this.baseCtx = baseCtx;
    this.overlayCtx = overlayCtx;

    this.viewport = new ViewportManager((event) => {
      this.renderLoop.requestAll();
      this.callbacks.onViewportChange?.(event);
      this.events.emit('viewport:changed', event);
    });

    this.history = new HistoryManager((state) => {
      this.callbacks.onHistoryChange?.(state);
      this.events.emit('history:changed', state);
    });

    this.renderLoop = new RenderLoop(
      () => this.renderBase(),
      () => this.renderOverlay()
    );

    this.setupEventListeners();
    this.renderLoop.start();
  }

  // ==========================================
  // Public API
  // ==========================================

  public setTool(tool: CanvasTool): void {
    this.activeTool = tool;
  }

  public setPanningMode(enabled: boolean): void {
    this.isDraggingHand = enabled;
  }

  public setStyleProps(props: Partial<CanvasStyleProps>): void {
    this.styleProps = { ...this.styleProps, ...props };
  }

  public getShapes(): BaseShape[] {
    return Array.from(this.shapes.values());
  }

  public addShape(shape: BaseShape | ShapeDTO, emit: boolean = true): void {
    const instance = shape instanceof BaseShape ? shape : ShapeFactory.fromDTO(shape);
    this.shapes.set(instance.id, instance);
    this.spatialGrid.insert(instance);
    this.renderLoop.requestBaseRender();

    if (emit) {
      this.callbacks.onShapeCreated?.(instance.serialize());
    }
  }

  public removeShapes(ids: string[], emit: boolean = true): void {
    let removed = false;
    for (const id of ids) {
      if (this.shapes.delete(id)) {
        this.spatialGrid.remove(id);
        this.selection.deselect(id);
        removed = true;
      }
    }
    if (removed) {
      this.renderLoop.requestAll();
      if (emit) {
        this.callbacks.onShapeDeleted?.(ids);
      }
    }
  }

  public clearShapes(): void {
    this.shapes.clear();
    this.spatialGrid.clear();
    this.selection.clear();
    this.renderLoop.requestAll();
  }

  public setShapesFromDTO(dtos: ShapeDTO[]): void {
    this.shapes.clear();
    this.spatialGrid.clear();
    for (const dto of dtos) {
      const instance = ShapeFactory.fromDTO(dto);
      this.shapes.set(dto.id, instance);
      this.spatialGrid.insert(instance);
    }
    this.renderLoop.requestBaseRender();
  }

  public setRemoteUsers(users: UserPresence[]): void {
    this.remoteUsers.clear();
    for (const u of users) {
      this.remoteUsers.set(u.id, u);
    }
    this.renderLoop.requestOverlayRender();
  }

  public updateRemoteCursor(userId: string, x: number, y: number): void {
    const user = this.remoteUsers.get(userId);
    if (user) {
      user.cursor = { x, y };
      this.renderLoop.requestOverlayRender();
    }
  }

  public undo(): void {
    this.history.undo();
    this.renderLoop.requestAll();
  }

  public redo(): void {
    this.history.redo();
    this.renderLoop.requestAll();
  }

  public deleteSelected(): void {
    const selected = this.selection.getSelectedIds();
    if (selected.length === 0) return;

    const shapesToDelete = selected
      .map((id) => this.shapes.get(id))
      .filter((s): s is BaseShape => Boolean(s));

    const command = new DeleteShapeCommand(this, shapesToDelete);
    this.history.execute(command);
  }

  public requestRender(): void {
    this.renderLoop.requestAll();
  }

  // ==========================================
  // Event Listeners & Interaction Dispatch
  // ==========================================

  private setupEventListeners(): void {
    const el = this.overlayCanvas;
    el.addEventListener('wheel', this.handleWheel, { passive: false });
    el.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.overlayCanvas.getBoundingClientRect();
    const anchor = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = Math.pow(0.995, e.deltaY);
      this.viewport.zoomBy(zoomFactor, anchor);
    } else {
      this.viewport.panBy(-e.deltaX, -e.deltaY);
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.lastMousePos = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || this.isSpacePressed || this.activeTool === 'hand') {
      this.isDraggingHand = true;
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = this.viewport.screenToWorld(screenPoint);

    this.startPoint = worldPoint;
    this.totalDragDelta = { dx: 0, dy: 0 };
    this.isInteracting = true;

    if (this.activeTool === 'select') {
      this.handleSelectionPointerDown(worldPoint, e.shiftKey);
    } else {
      this.handleDrawingPointerDown(worldPoint);
    }
  };

  private handleSelectionPointerDown(worldPoint: Point2D, isShift: boolean): void {
    // 1. Check if clicking on an active selection handle or body
    const bounds = this.selection.getCombinedBounds(this.shapes);
    if (bounds) {
      const handle = this.selection.hitTestHandle(worldPoint, bounds, this.viewport.getZoom());
      if (handle) {
        this.activeHandle = handle;
        return;
      }
    }

    // 2. Hit-test shapes in reverse order (top-most first)
    const shapeList = Array.from(this.shapes.values()).reverse();
    let hitShape: BaseShape | null = null;

    for (const shape of shapeList) {
      if (shape.hitTest(worldPoint)) {
        hitShape = shape;
        break;
      }
    }

    if (hitShape) {
      this.activeHandle = 'body';
      this.selection.select(hitShape.id, isShift);
    } else {
      // Clicked on empty space: start marquee multi-selection
      this.selection.clear();
      this.selection.isMarquee = true;
      this.selection.marqueeStart = { ...worldPoint };
      this.selection.marqueeEnd = { ...worldPoint };
      this.activeHandle = null;
    }

    this.callbacks.onSelectionChange?.(this.selection.getSelectedIds());
    this.renderLoop.requestOverlayRender();
  }

  private handleDrawingPointerDown(worldPoint: Point2D): void {
    const id = 'shape-' + Math.random().toString(36).substring(2, 9);
    const baseProps = {
      id,
      x: worldPoint.x,
      y: worldPoint.y,
      width: 0,
      height: 0,
      rotation: 0,
      strokeColor: this.styleProps.strokeColor,
      fillColor: this.styleProps.fillColor,
      strokeWidth: this.styleProps.strokeWidth,
      opacity: this.styleProps.opacity,
      zIndex: this.shapes.size,
      version: 1,
    };

    switch (this.activeTool) {
      case 'rectangle':
        this.activeShape = new Rectangle({ ...baseProps, type: 'rectangle' });
        break;
      case 'circle':
        this.activeShape = new Circle({ ...baseProps, type: 'circle' });
        break;
      case 'line':
        this.activeShape = new Line({ ...baseProps, type: 'line', x2: worldPoint.x, y2: worldPoint.y });
        break;
      case 'arrow':
        this.activeShape = new Arrow({ ...baseProps, type: 'arrow', x2: worldPoint.x, y2: worldPoint.y });
        break;
      case 'freehand':
        this.activeShape = new FreehandPath({ ...baseProps, type: 'freehand', points: [{ ...worldPoint }] });
        break;
      case 'text': {
        const text = prompt('Enter text for canvas:', 'Double-click to edit');
        if (text && text.trim()) {
          const textShape = new TextShape({
            ...baseProps,
            type: 'text',
            text: text.trim(),
            fontSize: 20,
            fontFamily: 'Inter, sans-serif',
            width: text.length * 12,
            height: 28,
          });
          const cmd = new AddShapeCommand(this, textShape);
          this.history.execute(cmd);
        }
        this.isInteracting = false;
        break;
      }
    }

    this.renderLoop.requestOverlayRender();
  }

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isDraggingHand) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.viewport.panBy(dx, dy);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = this.viewport.screenToWorld(screenPoint);

    this.events.emit('pointer:move', { screen: screenPoint, world: worldPoint });

    if (!this.isInteracting) return;

    // 1. Marquee selection drag
    if (this.selection.isMarquee) {
      this.selection.marqueeEnd = { ...worldPoint };
      this.renderLoop.requestOverlayRender();
      return;
    }

    // 2. Moving selected shapes
    if (this.activeHandle === 'body') {
      const dx = worldPoint.x - this.startPoint.x - this.totalDragDelta.dx;
      const dy = worldPoint.y - this.startPoint.y - this.totalDragDelta.dy;

      for (const id of this.selection.getSelectedIds()) {
        const shape = this.shapes.get(id);
        if (shape) {
          shape.x += dx;
          shape.y += dy;
          if (shape instanceof Line || shape instanceof Arrow) {
            shape.x2 += dx;
            shape.y2 += dy;
          } else if (shape instanceof FreehandPath) {
            for (const pt of shape.points) {
              pt.x += dx;
              pt.y += dy;
            }
          }
        }
      }

      this.totalDragDelta.dx += dx;
      this.totalDragDelta.dy += dy;
      this.renderLoop.requestAll();
      return;
    }

    // 3. Active shape geometry drawing
    if (this.activeShape) {
      if (this.activeShape instanceof Rectangle || this.activeShape instanceof Circle) {
        this.activeShape.width = worldPoint.x - this.startPoint.x;
        this.activeShape.height = worldPoint.y - this.startPoint.y;
      } else if (this.activeShape instanceof Line || this.activeShape instanceof Arrow) {
        this.activeShape.x2 = worldPoint.x;
        this.activeShape.y2 = worldPoint.y;
        this.activeShape.width = this.activeShape.x2 - this.activeShape.x;
        this.activeShape.height = this.activeShape.y2 - this.activeShape.y;
      } else if (this.activeShape instanceof FreehandPath) {
        this.activeShape.addPoint(worldPoint);
      }

      this.renderLoop.requestOverlayRender();
    }
  };

  private handlePointerUp = (_e: PointerEvent): void => {
    if (this.isDraggingHand) {
      this.isDraggingHand = false;
      return;
    }

    if (!this.isInteracting) return;
    this.isInteracting = false;

    // 1. Commit Marquee Multi-Selection
    if (this.selection.isMarquee) {
      const minX = Math.min(this.selection.marqueeStart.x, this.selection.marqueeEnd.x);
      const maxX = Math.max(this.selection.marqueeStart.x, this.selection.marqueeEnd.x);
      const minY = Math.min(this.selection.marqueeStart.y, this.selection.marqueeEnd.y);
      const maxY = Math.max(this.selection.marqueeStart.y, this.selection.marqueeEnd.y);

      for (const shape of this.shapes.values()) {
        const b = shape.getBounds();
        if (b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY) {
          this.selection.select(shape.id, true);
        }
      }

      this.selection.isMarquee = false;
      this.callbacks.onSelectionChange?.(this.selection.getSelectedIds());
      this.renderLoop.requestOverlayRender();
      return;
    }

    // 2. Commit Move Command to History
    if (this.activeHandle === 'body') {
      if (Math.hypot(this.totalDragDelta.dx, this.totalDragDelta.dy) > 1) {
        const selectedShapes = this.selection
          .getSelectedIds()
          .map((id) => this.shapes.get(id))
          .filter((s): s is BaseShape => Boolean(s));

        const cmd = new MoveShapeCommand(
          selectedShapes,
          this.totalDragDelta.dx,
          this.totalDragDelta.dy,
          () => this.renderLoop.requestAll()
        );
        // Command is already executed in real-time, just push onto history stack
        this.history.execute({
          execute: () => cmd.execute(),
          undo: () => cmd.undo(),
          redo: () => cmd.redo(),
        });
      }
      this.activeHandle = null;
      return;
    }

    // 3. Commit Add Shape Command to History
    if (this.activeShape) {
      if (this.activeShape instanceof Rectangle || this.activeShape instanceof Circle) {
        if (this.activeShape.width < 0) {
          this.activeShape.x += this.activeShape.width;
          this.activeShape.width = Math.abs(this.activeShape.width);
        }
        if (this.activeShape.height < 0) {
          this.activeShape.y += this.activeShape.height;
          this.activeShape.height = Math.abs(this.activeShape.height);
        }
      }

      if (this.activeShape instanceof FreehandPath) {
        this.activeShape.simplify(1.2);
      }

      const isSignificant =
        (this.activeShape instanceof FreehandPath && this.activeShape.points.length > 1) ||
        Math.hypot(this.activeShape.width, this.activeShape.height) > 4;

      if (isSignificant) {
        const cmd = new AddShapeCommand(this, this.activeShape);
        this.history.execute(cmd);
      }

      this.activeShape = null;
      this.renderLoop.requestAll();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !this.isSpacePressed) {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        this.isSpacePressed = true;
      }
    }

    // Delete / Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        this.deleteSelected();
      }
    }

    // Undo / Redo Hotkeys
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      this.isDraggingHand = false;
    }
  };

  // ==========================================
  // Render Pipeline
  // ==========================================

  private renderBase(): void {
    const { width, height } = this.baseCanvas;
    const ctx = this.baseCtx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    this.viewport.applyTransform(ctx);

    // Viewport Frustum for Spatial Culling
    const frustum = this.viewport.getVisibleFrustum(
      width / this.viewport.getDpr(),
      height / this.viewport.getDpr()
    );

    // Render all visible shapes retrieved in O(k) time from SpatialGrid
    const visibleShapes = this.spatialGrid.query(frustum);
    for (const shape of visibleShapes) {
      shape.render(ctx, this.viewport);
    }

    this.events.emit('render:base', { ctx, viewport: this.viewport });
  }

  private renderOverlay(): void {
    const { width, height } = this.overlayCanvas;
    const ctx = this.overlayCtx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    this.viewport.applyTransform(ctx);

    // 1. Active shape preview
    if (this.activeShape) {
      this.activeShape.render(ctx, this.viewport);
    }

    // 2. Selection handles, bounding box, or marquee
    this.selection.render(ctx, this.shapes, this.viewport);

    // 3. Peer live cursors
    this.renderRemoteCursors(ctx);

    this.events.emit('render:overlay', { ctx, viewport: this.viewport });
  }

  private renderRemoteCursors(ctx: CanvasRenderingContext2D): void {
    const zoom = this.viewport.getZoom();
    const cursorScale = 1 / zoom;

    for (const user of this.remoteUsers.values()) {
      if (!user.cursor) continue;
      const { x, y } = user.cursor;
      const color = user.color || '#4f46e5';

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(cursorScale, cursorScale);

      // Draw Cursor Arrow Polygon
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(4, 12);
      ctx.lineTo(9, 20);
      ctx.lineTo(12, 19);
      ctx.lineTo(7, 11);
      ctx.lineTo(13, 11);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Draw User Name Tag Pill
      const label = user.name || 'Anonymous';
      ctx.font = '500 11px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const pillHeight = 18;
      const pillWidth = textWidth + 12;

      ctx.fillStyle = color;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(14, 14, pillWidth, pillHeight, 4);
      } else {
        ctx.rect(14, 14, pillWidth, pillHeight);
      }
      ctx.fill();

      // User name label
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(label, 20, 14 + pillHeight / 2);

      ctx.restore();
    }
  }

  public destroy(): void {
    this.renderLoop.stop();
    const el = this.overlayCanvas;
    el.removeEventListener('wheel', this.handleWheel);
    el.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.events.clear();
  }
}
