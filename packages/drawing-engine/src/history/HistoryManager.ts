import { ICommand } from '../commands/ICommand.js';

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export class HistoryManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxDepth: number = 50;

  constructor(private onChange?: (state: HistoryState) => void) {}

  public execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);

    // Truncate stack if exceeding maxDepth
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    // New action invalidates the redo branch
    this.redoStack = [];
    this.notify();
  }

  public undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;

    command.undo();
    this.redoStack.push(command);
    this.notify();
  }

  public redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;

    command.redo();
    this.undoStack.push(command);
    this.notify();
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    this.onChange?.({
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
}
