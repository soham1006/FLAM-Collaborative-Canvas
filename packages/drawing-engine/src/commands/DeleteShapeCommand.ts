import { ICommand } from './ICommand.js';
import { BaseShape } from '../shapes/BaseShape.js';
import { CommandReceiver } from './AddShapeCommand.js';

export class DeleteShapeCommand implements ICommand {
  private deletedShapes: BaseShape[];

  constructor(
    private receiver: CommandReceiver,
    shapes: BaseShape[]
  ) {
    // Clone shapes to preserve their state for undo
    this.deletedShapes = shapes.map((s) => s.clone());
  }

  execute(): void {
    const ids = this.deletedShapes.map((s) => s.id);
    this.receiver.removeShapes(ids);
  }

  undo(): void {
    for (const shape of this.deletedShapes) {
      this.receiver.addShape(shape.clone());
    }
  }

  redo(): void {
    this.execute();
  }
}
