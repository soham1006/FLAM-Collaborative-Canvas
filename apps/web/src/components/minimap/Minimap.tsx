import React, { useState } from 'react';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export const Minimap: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { zoom, pan } = useCanvasStore();

  return (
    <div className="fixed bottom-4 right-4 z-20 select-none">
      <div className="rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-md)] overflow-hidden transition-all duration-200">
        {/* Minimap Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-2.5 py-1.5 flex items-center justify-between gap-2 border-b border-[var(--surface-panel-border)] bg-[var(--surface-hover)] cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)] text-[11px] font-medium"
        >
          <div className="flex items-center gap-1.5">
            <Map className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Overview</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </div>

        {/* Minimap Viewport Canvas Display */}
        {isExpanded && (
          <div className="w-40 h-28 bg-[var(--canvas-bg)] relative flex items-center justify-center overflow-hidden">
            {/* Grid Preview */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(var(--canvas-dot) 1px, transparent 1px)',
                backgroundSize: '8px 8px',
              }}
            />

            {/* Viewport Frustum Box Indicator */}
            <div
              className="absolute border border-[var(--accent-primary)] bg-[var(--selection-fill)] rounded-sm pointer-events-none transition-all duration-100"
              style={{
                width: `${Math.min(100, Math.max(20, 50 / zoom))}%`,
                height: `${Math.min(100, Math.max(20, 50 / zoom))}%`,
                transform: `translate(${-pan.x / 50}px, ${-pan.y / 50}px)`,
              }}
            />

            <span className="text-[10px] text-[var(--text-muted)] font-mono z-10">
              Minimap Frustum
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
