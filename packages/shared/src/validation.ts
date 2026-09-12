import { z } from 'zod';

export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const BaseShapePropsSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['rectangle', 'circle', 'line', 'arrow', 'text', 'freehand']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  strokeColor: z.string().default('#0f172a'),
  fillColor: z.string().default('transparent'),
  strokeWidth: z.number().min(0.5).max(50).default(2),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().int().default(0),
  version: z.number().int().default(1),
});

export const RectanglePropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('rectangle'),
  cornerRadius: z.number().min(0).optional(),
});

export const CirclePropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('circle'),
});

export const LinePropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('line'),
  x2: z.number(),
  y2: z.number(),
});

export const ArrowPropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('arrow'),
  x2: z.number(),
  y2: z.number(),
  headSize: z.number().optional(),
});

export const TextPropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontSize: z.number().min(8).max(144).default(16),
  fontFamily: z.string().default('sans-serif'),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
});

export const FreehandPropsSchema = BaseShapePropsSchema.extend({
  type: z.literal('freehand'),
  points: z.array(Point2DSchema),
});

export const ShapeDTOSchema = z.discriminatedUnion('type', [
  RectanglePropsSchema,
  CirclePropsSchema,
  LinePropsSchema,
  ArrowPropsSchema,
  TextPropsSchema,
  FreehandPropsSchema,
]);

export const ShapeUpdateDTOSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['rectangle', 'circle', 'line', 'arrow', 'text', 'freehand']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  strokeColor: z.string().optional(),
  fillColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  zIndex: z.number().optional(),
  version: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  points: z.array(Point2DSchema).optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  cornerRadius: z.number().optional(),
  headSize: z.number().optional(),
});

// WebSocket Envelopes & Payloads
export const WSMessageSchema = z.object({
  type: z.string(),
  roomId: z.string().min(1),
  senderId: z.string().min(1),
  seq: z.number().optional(),
  timestamp: z.number(),
  payload: z.unknown(),
});

export const RoomJoinSchema = z.object({
  userName: z.string().trim().min(1).max(50),
  userColor: z.string().optional(),
});

export const CursorMoveSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SelectionChangeSchema = z.object({
  shapeIds: z.array(z.string()),
});

export const ShapeCreateSchema = z.object({
  shape: ShapeDTOSchema,
});

export const ShapeUpdateSchema = z.object({
  shapeId: z.string().min(1),
  changes: ShapeUpdateDTOSchema,
});

export const ShapeDeleteSchema = z.object({
  shapeIds: z.array(z.string().min(1)),
});

// Stroke Streaming Schemas
export const StrokeStartSchema = z.object({
  strokeId: z.string().min(1),
  tool: z.string().default('freehand'),
  strokeColor: z.string().default('#0f172a'),
  strokeWidth: z.number().min(0.5).max(50).default(2),
  opacity: z.number().min(0).max(1).optional(),
  startPoint: Point2DSchema,
});

export const StrokeChunkSchema = z.object({
  strokeId: z.string().min(1),
  points: z.array(Point2DSchema).min(1),
});

export const StrokeEndSchema = z.object({
  strokeId: z.string().min(1),
});

// REST API Schemas
export const CreateRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  isPublic: z.boolean().default(true),
});

