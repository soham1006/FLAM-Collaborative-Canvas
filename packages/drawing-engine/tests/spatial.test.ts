import { describe, it, expect } from 'vitest';
import {
  SpatialGrid,
  BoundingBox,
  Rectangle,
  simplifyPathRDP,
  Point2D,
} from '../src/index.js';

describe('Ramer-Douglas-Peucker (RDP) Algorithm', () => {
  it('simplifies collinear points to just start and end', () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ];

    const simplified = simplifyPathRDP(points, 1.0);
    expect(simplified.length).toBe(2);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
    expect(simplified[1]).toEqual({ x: 40, y: 0 });
  });

  it('preserves significant curve features', () => {
    const points: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 20 }, // sharp peak
      { x: 20, y: 0 },
    ];

    const simplified = simplifyPathRDP(points, 2.0);
    expect(simplified.length).toBe(3);
    expect(simplified[1]).toEqual({ x: 10, y: 20 });
  });
});

describe('SpatialGrid Partitioning', () => {
  it('correctly indexes and queries shapes within viewport bounds', () => {
    const grid = new SpatialGrid(100);

    const rect1 = new Rectangle({
      id: 'r1',
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
      zIndex: 1,
      version: 1,
    });

    const rect2 = new Rectangle({
      id: 'r2',
      type: 'rectangle',
      x: 1000,
      y: 1000,
      width: 50,
      height: 50,
      rotation: 0,
      strokeColor: '#000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 2,
      version: 1,
    });

    grid.insert(rect1);
    grid.insert(rect2);

    // Query viewport [0, 0] to [200, 200]
    const queryFrustum = new BoundingBox(0, 0, 200, 200);
    const results = grid.query(queryFrustum);

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('r1');
  });

  it('removes shapes cleanly from cells', () => {
    const grid = new SpatialGrid(100);
    const rect = new Rectangle({
      id: 'r1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      strokeColor: '#000',
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      zIndex: 0,
      version: 1,
    });

    grid.insert(rect);
    expect(grid.query(new BoundingBox(-50, -50, 100, 100)).length).toBe(1);

    grid.remove('r1');
    expect(grid.query(new BoundingBox(-50, -50, 100, 100)).length).toBe(0);
  });
});
