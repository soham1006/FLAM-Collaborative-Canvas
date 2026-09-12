import { useEffect, useRef } from 'react';
import { CanvasEngine, ShapeDTO } from '@flam/drawing-engine';
import { useCanvasStore } from '../store/useCanvasStore';

interface UseCanvasEngineProps {
  canvases: { base: HTMLCanvasElement; overlay: HTMLCanvasElement } | null;
  onShapeCreated?: (shape: ShapeDTO) => void;
  onShapeDeleted?: (shapeIds: string[]) => void;
  onPointerMove?: (world: { x: number; y: number }) => void;
}

export function useCanvasEngine({
  canvases,
  onShapeCreated,
  onShapeDeleted,
  onPointerMove,
}: UseCanvasEngineProps) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const {
    setPan,
    setZoom,
    setSelectedShapeIds,
    setCanUndo,
    setCanRedo,
    activeTool,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    collaborators,
  } = useCanvasStore();

  useEffect(() => {
    if (!canvases) return;

    const engine = new CanvasEngine({
      baseCanvas: canvases.base,
      overlayCanvas: canvases.overlay,
      onViewportChange: (evt) => {
        setPan(evt.pan);
        setZoom(evt.zoom);
      },
      onSelectionChange: (selectedIds) => {
        setSelectedShapeIds(selectedIds);
      },
      onHistoryChange: (state) => {
        setCanUndo(state.canUndo);
        setCanRedo(state.canRedo);
      },
      onShapeCreated: (shape) => {
        onShapeCreated?.(shape);
      },
      onShapeDeleted: (shapeIds) => {
        onShapeDeleted?.(shapeIds);
      },
    });

    const unbindMove = engine.events.on('pointer:move', (data: any) => {
      onPointerMove?.(data.world);
    });

    engineRef.current = engine;

    return () => {
      unbindMove();
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    canvases,
    setPan,
    setZoom,
    setSelectedShapeIds,
    setCanUndo,
    setCanRedo,
    onShapeCreated,
    onShapeDeleted,
    onPointerMove,
  ]);

  // Sync active tool
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(activeTool);
      engineRef.current.setPanningMode(activeTool === 'hand');
    }
  }, [activeTool]);

  // Sync style properties
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setStyleProps({
        strokeColor,
        fillColor,
        strokeWidth,
        opacity,
      });
    }
  }, [strokeColor, fillColor, strokeWidth, opacity]);

  // Sync remote peer cursors to engine overlay
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRemoteUsers(collaborators);
    }
  }, [collaborators]);

  return engineRef;
}
