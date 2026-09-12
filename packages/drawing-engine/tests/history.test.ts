import { describe, it, expect } from 'vitest';
import {
  Rectangle,
  HistoryManager,
  AddShapeCommand,
  DeleteShapeCommand,
  MoveShapeCommand,
  BaseShape,
} from '../src/index.js';

describe('HistoryManager & Command Pattern', () => {
  it('executes AddShapeCommand and undos/redos successfully', () => {
    const shapes: Map<string, BaseShape> = new Map();
    const receiver = {
      addShape: (shape: BaseShape) => shapes.set(shape.id, shape),
      removeShapes: (ids: string[]) => ids.forEach((id) => shapes.delete(id)),
    };

    const history = new HistoryManager();
    const rect = new Rectangle({
      id: 'rect-1',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      rotation: 0,
      strokeColor: '#000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    const addCmd = new AddShapeCommand(receiver, rect);
    history.execute(addCmd);

    expect(shapes.has('rect-1')).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Undo
    history.undo();
    expect(shapes.has('rect-1')).toBe(false);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo
    history.redo();
    expect(shapes.has('rect-1')).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('executes MoveShapeCommand and undos position delta', () => {
    const rect = new Rectangle({
      id: 'rect-1',
      type: 'rectangle',
      x: 20,
      y: 30,
      width: 50,
      height: 50,
      rotation: 0,
      strokeColor: '#000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    const history = new HistoryManager();
    const moveCmd = new MoveShapeCommand([rect], 15, -10);

    history.execute(moveCmd);
    expect(rect.x).toBe(35);
    expect(rect.y).toBe(20);

    history.undo();
    expect(rect.x).toBe(20);
    expect(rect.y).toBe(30);

    history.redo();
    expect(rect.x).toBe(35);
    expect(rect.y).toBe(20);
  });

  it('executes DeleteShapeCommand and restores deleted shape on undo', () => {
    const shapes: Map<string, BaseShape> = new Map();
    const receiver = {
      addShape: (shape: BaseShape) => shapes.set(shape.id, shape),
      removeShapes: (ids: string[]) => ids.forEach((id) => shapes.delete(id)),
    };

    const rect = new Rectangle({
      id: 'rect-del',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      strokeColor: '#000',
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    shapes.set(rect.id, rect);

    const history = new HistoryManager();
    const delCmd = new DeleteShapeCommand(receiver, [rect]);

    history.execute(delCmd);
    expect(shapes.has('rect-del')).toBe(false);

    history.undo();
    expect(shapes.has('rect-del')).toBe(true);

    history.redo();
    expect(shapes.has('rect-del')).toBe(false);
  });
});
