import { useState, useEffect, useRef } from 'react';
import { Header } from './components/header/Header';
import { Toolbar } from './components/toolbar/Toolbar';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { CanvasContainer } from './components/canvas/CanvasContainer';
import { Minimap } from './components/minimap/Minimap';
import { useCanvasStore } from './store/useCanvasStore';
import { useCanvasEngine } from './hooks/useCanvasEngine';
import { useCollaboration } from './hooks/useCollaboration';
import { CanvasEngine } from '@flam/drawing-engine';
import { ShortcutsModal } from './components/modals/ShortcutsModal';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [canvases, setCanvases] = useState<{ base: HTMLCanvasElement; overlay: HTMLCanvasElement } | null>(null);
  const { setActiveTool, setRoomInfo, roomId } = useCanvasStore();

  const sharedEngineRef = useRef<CanvasEngine | null>(null);
  const collab = useCollaboration({ engineRef: sharedEngineRef });

  const activeEngineRef = useCanvasEngine({
    canvases,
    onShapeCreated: (shape) => collab.sendShapeCreated(shape),
    onShapeDeleted: (shapeIds) => collab.sendShapeDeleted(shapeIds),
    onPointerMove: (world) => collab.sendCursorMove(world.x, world.y),
  });

  // Keep shared ref updated
  useEffect(() => {
    sharedEngineRef.current = activeEngineRef.current;
  }, [activeEngineRef]);

  // Support Room ID in URL search params (e.g. ?room=flam-room-1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam !== roomId) {
      setRoomInfo(
        roomParam,
        roomParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      );
    }
  }, [roomId, setRoomInfo]);

  // Keyboard shortcut listener for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'o':
          setActiveTool('circle');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'a':
          setActiveTool('arrow');
          break;
        case 'p':
          setActiveTool('freehand');
          break;
        case 't':
          setActiveTool('text');
          break;
        case '?':
          setIsShortcutsOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

  // Export Handlers
  const handleExport = (format: 'png' | 'svg' | 'json') => {
    if (!activeEngineRef.current) return;

    if (format === 'json') {
      const shapes = activeEngineRef.current.getShapes().map((s) => s.serialize());
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(shapes, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${roomId}-canvas.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'png') {
      if (!canvases?.base) return;
      const dataUrl = canvases.base.toDataURL('image/png');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataUrl);
      downloadAnchor.setAttribute('download', `${roomId}-canvas.png`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'svg') {
      const shapes = activeEngineRef.current.getShapes();
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">\n`;

      for (const shape of shapes) {
        if (shape.type === 'rectangle') {
          svgContent += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" fill="${shape.fillColor}" />\n`;
        } else if (shape.type === 'circle') {
          const rx = Math.abs(shape.width) / 2;
          const ry = Math.abs(shape.height) / 2;
          svgContent += `  <ellipse cx="${shape.x + rx}" cy="${shape.y + ry}" rx="${rx}" ry="${ry}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" fill="${shape.fillColor}" />\n`;
        } else if (shape.type === 'line' || shape.type === 'arrow') {
          const anyShape = shape as any;
          svgContent += `  <line x1="${shape.x}" y1="${shape.y}" x2="${anyShape.x2}" y2="${anyShape.y2}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" />\n`;
        }
      }
      svgContent += `</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `${roomId}-canvas.svg`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`w-screen h-screen overflow-hidden flex flex-col ${isDark ? 'dark' : ''}`}>
      <div className="w-full h-full flex flex-col relative bg-[var(--canvas-bg)] text-[var(--text-primary)] transition-colors duration-200">
        {/* Top Header */}
        <Header
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onExport={handleExport}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* Main Canvas Workspace */}
        <main className="flex-1 relative overflow-hidden">
          <CanvasContainer onMount={setCanvases} />
          <PropertiesPanel />
          <Toolbar
            onUndo={() => activeEngineRef.current?.undo()}
            onRedo={() => activeEngineRef.current?.redo()}
          />
          <Minimap />
          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />
        </main>
      </div>
    </div>
  );
}
