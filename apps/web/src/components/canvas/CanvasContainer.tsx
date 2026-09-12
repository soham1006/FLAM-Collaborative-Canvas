import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';

interface CanvasContainerProps {
  onMount?: (canvases: { base: HTMLCanvasElement; overlay: HTMLCanvasElement }) => void;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ onMount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const { activeTool, zoom, pan } = useCanvasStore();
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });

  // Handle Resize and Retina DPI scaling
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !baseCanvasRef.current || !overlayCanvasRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const dpr = window.devicePixelRatio || 1;

      // Base Canvas
      baseCanvasRef.current.width = clientWidth * dpr;
      baseCanvasRef.current.height = clientHeight * dpr;
      baseCanvasRef.current.style.width = `${clientWidth}px`;
      baseCanvasRef.current.style.height = `${clientHeight}px`;

      // Overlay Canvas
      overlayCanvasRef.current.width = clientWidth * dpr;
      overlayCanvasRef.current.height = clientHeight * dpr;
      overlayCanvasRef.current.style.width = `${clientWidth}px`;
      overlayCanvasRef.current.style.height = `${clientHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    if (baseCanvasRef.current && overlayCanvasRef.current) {
      onMount?.({ base: baseCanvasRef.current, overlay: overlayCanvasRef.current });
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [onMount]);

  // Track cursor position for coordinates display
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert Screen to World Space
    const worldX = Math.round((screenX - pan.x) / zoom);
    const worldY = Math.round((screenY - pan.y) / zoom);
    setMouseCoord({ x: worldX, y: worldY });
  };

  // Cursor style determination
  const getCursorClass = () => {
    switch (activeTool) {
      case 'hand':
        return 'cursor-grab active:cursor-grabbing';
      case 'select':
        return 'cursor-default';
      case 'text':
        return 'cursor-text';
      default:
        return 'cursor-crosshair';
    }
  };

  // Grid style calculation (responsive to pan and zoom)
  const gridSize = 24 * zoom;
  const gridOffsetX = pan.x % gridSize;
  const gridOffsetY = pan.y % gridSize;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full overflow-hidden select-none bg-[var(--canvas-bg)] ${getCursorClass()}`}
      style={{
        backgroundImage: `radial-gradient(var(--canvas-dot) 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
      }}
    >
      {/* Base Canvas: Renders Persistent Shapes */}
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 block pointer-events-none"
      />

      {/* Overlay Canvas: Renders Handles, Selection Box, and Remote Cursors */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 block"
      />

      {/* Coordinate & Viewport Status Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 px-2.5 py-1 rounded-md bg-[var(--surface-panel)] border border-[var(--surface-panel-border)] shadow-sm text-[10px] font-mono text-[var(--text-secondary)] flex items-center gap-3">
        <span>
          X: <strong className="text-[var(--text-primary)]">{mouseCoord.x}</strong>
        </span>
        <span>
          Y: <strong className="text-[var(--text-primary)]">{mouseCoord.y}</strong>
        </span>
        <span className="border-l border-[var(--surface-panel-border)] pl-2 text-[var(--accent-primary)] font-semibold">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
