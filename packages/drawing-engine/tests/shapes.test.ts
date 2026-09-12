import { describe, it, expect } from 'vitest';
import {
  Vector2D,
  BoundingBox,
  Rectangle,
  Circle,
  Line,
  Arrow,
  FreehandPath,
  ShapeFactory,
} from '../src/index.js';

describe('Vector2D Math', () => {
  it('adds and subtracts vectors correctly', () => {
    const v1 = new Vector2D(10, 20);
    const v2 = new Vector2D(5, 5);

    const sum = v1.add(v2);
    expect(sum.x).toBe(15);
    expect(sum.y).toBe(25);

    const diff = v1.subtract(v2);
    expect(diff.x).toBe(5);
    expect(diff.y).toBe(15);
  });

  it('calculates Euclidean distance and length', () => {
    const v = new Vector2D(3, 4);
    expect(v.length()).toBe(5);

    const p1 = new Vector2D(0, 0);
    const p2 = new Vector2D(6, 8);
    expect(p1.distanceTo(p2)).toBe(10);
  });
});

describe('BoundingBox (AABB)', () => {
  it('correctly determines bounds and contains points', () => {
    const box = new BoundingBox(10, 10, 100, 100);
    expect(box.width).toBe(90);
    expect(box.height).toBe(90);
    expect(box.centerX).toBe(55);
    expect(box.centerY).toBe(55);

    expect(box.contains({ x: 50, y: 50 })).toBe(true);
    expect(box.contains({ x: 5, y: 50 })).toBe(false);
  });

  it('correctly calculates AABB intersection for viewport culling', () => {
    const box1 = new BoundingBox(0, 0, 50, 50);
    const box2 = new BoundingBox(40, 40, 100, 100);
    const box3 = new BoundingBox(100, 100, 150, 150);

    expect(box1.intersects(box2)).toBe(true);
    expect(box1.intersects(box3)).toBe(false);
  });
});

describe('Polymorphic Shapes & Hit-Testing', () => {
  it('Rectangle hit testing and serialization', () => {
    const rect = new Rectangle({
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    expect(rect.hitTest({ x: 150, y: 150 })).toBe(true);
    expect(rect.hitTest({ x: 50, y: 50 })).toBe(false);

    const dto = rect.serialize();
    expect(dto.type).toBe('rectangle');
    expect(dto.width).toBe(200);

    const reconstituted = ShapeFactory.fromDTO(dto);
    expect(reconstituted).toBeInstanceOf(Rectangle);
  });

  it('Circle hit testing and serialization', () => {
    const circle = new Circle({
      id: 'circle-1',
      type: 'circle',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 0,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    // Center is (150, 150), radius is 50
    expect(circle.hitTest({ x: 150, y: 150 })).toBe(true);
    expect(circle.hitTest({ x: 190, y: 150 })).toBe(true);
    expect(circle.hitTest({ x: 220, y: 150 })).toBe(false);
  });

  it('Line segment hit testing within threshold', () => {
    const line = new Line({
      id: 'line-1',
      type: 'line',
      x: 0,
      y: 0,
      width: 100,
      height: 0,
      rotation: 0,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
      x2: 100,
      y2: 0,
    });

    expect(line.hitTest({ x: 50, y: 2 })).toBe(true);
    expect(line.hitTest({ x: 50, y: 20 })).toBe(false);
  });

  it('FreehandPath point addition and bounding box', () => {
    const path = new FreehandPath({
      id: 'fh-1',
      type: 'freehand',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 0,
      version: 1,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 10 },
      ],
    });

    expect(path.hitTest({ x: 20, y: 20 })).toBe(true);
    expect(path.hitTest({ x: 100, y: 100 })).toBe(false);

    path.addPoint({ x: 50, y: 50 });
    expect(path.width).toBe(40); // 50 - 10
    expect(path.height).toBe(40); // 50 - 10
  });
});
