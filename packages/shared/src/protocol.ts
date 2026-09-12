import { ShapeDTO, ShapeUpdateDTO } from './shapes.js';

export type WSMessageType =
  // Connection & Room Lifecycle
  | 'ROOM_JOIN'
  | 'ROOM_STATE'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'ERROR'
  
  // Real-time Presence
  | 'CURSOR_MOVE'
  | 'CURSOR_BROADCAST'
  | 'SELECTION_CHANGE'
  | 'SELECTION_BROADCAST'
  
  // Canvas Object Mutations
  | 'SHAPE_CREATE'
  | 'SHAPE_CREATED'
  | 'SHAPE_UPDATE'
  | 'SHAPE_UPDATED'
  | 'SHAPE_DELETE'
  | 'SHAPE_DELETED'
  | 'SHAPES_BATCH'
  
  // Real-time Stroke Streaming
  | 'STROKE_START'
  | 'STROKE_START_BROADCAST'
  | 'STROKE_CHUNK'
  | 'STROKE_CHUNK_BROADCAST'
  | 'STROKE_END'
  
  // Heartbeats
  | 'PING'
  | 'PONG';

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selectedShapeIds: string[];
  lastActive: number;
}

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  roomId: string;
  senderId: string;
  seq?: number;
  timestamp: number;
  payload: T;
}

// Specific Payloads
export interface RoomJoinPayload {
  userName: string;
  userColor?: string;
}

export interface RoomStatePayload {
  roomId: string;
  roomName: string;
  seq: number;
  users: UserPresence[];
  shapes: ShapeDTO[];
}

export interface UserJoinedPayload {
  user: UserPresence;
}

export interface UserLeftPayload {
  userId: string;
}

export interface CursorMovePayload {
  x: number;
  y: number;
}

export interface CursorBroadcastPayload {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface SelectionChangePayload {
  shapeIds: string[];
}

export interface SelectionBroadcastPayload {
  userId: string;
  shapeIds: string[];
}

export interface ShapeCreatePayload {
  shape: ShapeDTO;
}

export interface ShapeCreatedPayload {
  shape: ShapeDTO;
  seq: number;
}

export interface ShapeUpdatePayload {
  shapeId: string;
  changes: ShapeUpdateDTO;
}

export interface ShapeUpdatedPayload {
  shapeId: string;
  changes: ShapeUpdateDTO;
  seq: number;
}

export interface ShapeDeletePayload {
  shapeIds: string[];
}

export interface ShapeDeletedPayload {
  shapeIds: string[];
  seq: number;
}

export interface ShapesBatchPayload {
  created?: ShapeDTO[];
  updated?: ShapeUpdateDTO[];
  deletedIds?: string[];
  seq: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

// Live Stroke Streaming Payloads
export interface StrokeStartPayload {
  strokeId: string;
  tool: string;
  strokeColor: string;
  strokeWidth: number;
  opacity?: number;
  startPoint: { x: number; y: number };
}

export interface StrokeStartBroadcastPayload {
  userId: string;
  strokeId: string;
  tool: string;
  strokeColor: string;
  strokeWidth: number;
  opacity?: number;
  startPoint: { x: number; y: number };
}

export interface StrokeChunkPayload {
  strokeId: string;
  points: { x: number; y: number }[];
}

export interface StrokeChunkBroadcastPayload {
  userId: string;
  strokeId: string;
  points: { x: number; y: number }[];
}

export interface StrokeEndPayload {
  strokeId: string;
}

