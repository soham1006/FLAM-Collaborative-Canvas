import { ICommand } from './ICommand.js';
import { BaseShape } from '../shapes/BaseShape.js';

export interface CommandReceiver {
  addShape(shape: BaseShape, emit?: boolean): void;
  removeShapes(ids: string[], emit?: boolean): void;
}

export class AddShapeCommand implements ICommand {
  constructor(
    private receiver: CommandReceiver,
    private shape: BaseShape
  ) {}

  execute(): void {
    this.receiver.addShape(this.shape);
  }

  undo(): void {
    this.receiver.removeShapes([this.shape.id]);
  }

  redo(): void {
    this.execute();
  }
}
