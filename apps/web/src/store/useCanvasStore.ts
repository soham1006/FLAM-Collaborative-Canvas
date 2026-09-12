import { create } from 'zustand';
import { UserPresence } from '@flam/shared';

export type ToolType =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text';

export interface CanvasState {
  // Active Tool & Properties
  activeTool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;

  // Viewport State
  zoom: number;
  pan: { x: number; y: number };

  // Selection & History State
  selectedShapeIds: string[];
  canUndo: boolean;
  canRedo: boolean;

  // Real-Time Presence & Room State
  roomId: string;
  roomName: string;
  currentUserId: string;
  currentUserName: string;
  currentUserColor: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  collaborators: UserPresence[];

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  setCanUndo: (canUndo: boolean) => void;
  setCanRedo: (canRedo: boolean) => void;
  setRoomInfo: (id: string, name: string) => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  setCollaborators: (users: UserPresence[]) => void;
  updateUserCursor: (userId: string, x: number, y: number) => void;
}

// Generate random friendly color and user name for guest sessions
const DEFAULT_COLORS = [
  '#0284c7', // Sky
  '#16a34a', // Emerald
  '#d97706', // Amber
  '#9333ea', // Purple
  '#e11d48', // Rose
  '#0d9488', // Teal
];

const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
const randomId = 'user-' + Math.random().toString(36).substring(2, 9);
const randomName = 'Designer ' + Math.floor(Math.random() * 900 + 100);

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool: 'select',
  strokeColor: '#0f172a',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,

  zoom: 1,
  pan: { x: 0, y: 0 },

  selectedShapeIds: [],
  canUndo: false,
  canRedo: false,

  roomId: 'flam-demo-room',
  roomName: 'Architecture Canvas',
  currentUserId: randomId,
  currentUserName: randomName,
  currentUserColor: randomColor,
  connectionStatus: 'connected',
  collaborators: [],

  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity }),
  setZoom: (updater) =>
    set((state) => ({
      zoom: typeof updater === 'function' ? updater(state.zoom) : updater,
    })),
  setPan: (updater) =>
    set((state) => ({
      pan: typeof updater === 'function' ? updater(state.pan) : updater,
    })),
  setSelectedShapeIds: (ids) => set({ selectedShapeIds: ids }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
  setRoomInfo: (id, name) =>
    set((state) =>
      state.roomId === id && state.roomName === name
        ? state
        : { roomId: id, roomName: name }
    ),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCollaborators: (collaborators) => set({ collaborators }),
  updateUserCursor: (userId, x, y) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === userId ? { ...c, cursor: { x, y } } : c
      ),
    })),
}));
