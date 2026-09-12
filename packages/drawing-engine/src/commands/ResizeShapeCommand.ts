import { ICommand } from './ICommand.js';
import { BaseShape } from '../shapes/BaseShape.js';

export interface ShapeGeometrySnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ResizeShapeCommand implements ICommand {
  constructor(
    private shape: BaseShape,
    private before: ShapeGeometrySnapshot,
    private after: ShapeGeometrySnapshot,
    private onMutated?: () => void
  ) {}

  execute(): void {
    this.apply(this.after);
  }

  undo(): void {
    this.apply(this.before);
  }

  redo(): void {
    this.execute();
  }

  private apply(snap: ShapeGeometrySnapshot): void {
    this.shape.x = snap.x;
    this.shape.y = snap.y;
    this.shape.width = snap.width;
    this.shape.height = snap.height;
    this.onMutated?.();
  }
}

