// packages/drawing-engine/src/index.ts
export * from '@flam/shared';

// Math
export * from './math/Vector2D.js';
export { BoundingBox } from './math/BoundingBox.js';
export * from './math/RDP.js';

// Spatial Indexing & Optimization
export * from './spatial/SpatialGrid.js';

// Shapes
export * from './shapes/BaseShape.js';
export * from './shapes/Rectangle.js';
export * from './shapes/Circle.js';
export * from './shapes/Line.js';
export * from './shapes/Arrow.js';
export * from './shapes/TextShape.js';
export * from './shapes/FreehandPath.js';
export * from './shapes/ShapeFactory.js';

// Commands & History (GoF Command Pattern)
export * from './commands/ICommand.js';
export * from './commands/AddShapeCommand.js';
export * from './commands/DeleteShapeCommand.js';
export * from './commands/MoveShapeCommand.js';
export * from './commands/ResizeShapeCommand.js';
export * from './history/HistoryManager.js';

// Selection & Gizmos
export * from './selection/SelectionManager.js';

// Core
export * from './core/EventBus.js';
export * from './core/ViewportManager.js';
export * from './core/RenderLoop.js';
export * from './core/CanvasEngine.js';

export const ENGINE_VERSION = '1.0.0';
