import React from 'react';
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Pencil,
  Type,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCanvasStore, ToolType } from '../../store/useCanvasStore';

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
}

interface ToolConfig {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolConfig[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer },
  { id: 'hand', label: 'Hand (Pan)', shortcut: 'H', icon: Hand },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Circle', shortcut: 'O', icon: Circle },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: MoveUpRight },
  { id: 'freehand', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
];

export const Toolbar: React.FC<ToolbarProps> = ({ onUndo, onRedo }) => {
  const {
    activeTool,
    setActiveTool,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    setPan,
  } = useCanvasStore();

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-floating)] backdrop-blur-md select-none">
      {/* Drawing & Selection Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 group ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span
                className={`absolute -top-1 -right-1 text-[9px] font-semibold px-1 rounded-sm ${
                  isActive
                    ? 'bg-indigo-900 text-indigo-100'
                    : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--surface-panel-border)]'
                }`}
              >
                {tool.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-[1px] h-6 bg-[var(--surface-panel-border)] mx-1" />

      {/* Undo / Redo Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
            canUndo
              ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95'
              : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
            canRedo
              ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95'
              : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-6 bg-[var(--surface-panel-border)] mx-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="flex items-center justify-center w-8 h-8 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetZoom}
          title="Reset Zoom to 100%"
          className="px-2 py-1 text-xs font-mono font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="flex items-center justify-center w-8 h-8 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
