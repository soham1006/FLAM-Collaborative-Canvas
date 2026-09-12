import { ICommand } from './ICommand.js';
import { BaseShape } from '../shapes/BaseShape.js';

export class MoveShapeCommand implements ICommand {
  constructor(
    private shapes: BaseShape[],
    private dx: number,
    private dy: number,
    private onMutated?: () => void
  ) {}

  execute(): void {
    for (const shape of this.shapes) {
      shape.x += this.dx;
      shape.y += this.dy;
    }
    this.onMutated?.();
  }

  undo(): void {
    for (const shape of this.shapes) {
      shape.x -= this.dx;
      shape.y -= this.dy;
    }
    this.onMutated?.();
  }

  redo(): void {
    this.execute();
  }
}
