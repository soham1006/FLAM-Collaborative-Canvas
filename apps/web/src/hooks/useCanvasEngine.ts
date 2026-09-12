import { useEffect, useRef } from 'react';
import { CanvasEngine, ShapeDTO, Point2D } from '@flam/drawing-engine';
import { useCanvasStore } from '../store/useCanvasStore';

interface UseCanvasEngineProps {
  canvases: { base: HTMLCanvasElement; overlay: HTMLCanvasElement } | null;
  onShapeCreated?: (shape: ShapeDTO) => void;
  onShapeUpdated?: (shape: ShapeDTO) => void;
  onShapeDeleted?: (shapeIds: string[]) => void;
  onPointerMove?: (world: { x: number; y: number }) => void;
  onStrokeStart?: (payload: { strokeId: string; tool: string; strokeColor: string; strokeWidth: number; opacity?: number; startPoint: Point2D }) => void;
  onStrokeChunk?: (payload: { strokeId: string; points: Point2D[] }) => void;
  onStrokeEnd?: (payload: { strokeId: string }) => void;
}

export function useCanvasEngine({
  canvases,
  onShapeCreated,
  onShapeUpdated,
  onShapeDeleted,
  onPointerMove,
  onStrokeStart,
  onStrokeChunk,
  onStrokeEnd,
}: UseCanvasEngineProps) {
  const engineRef = useRef<CanvasEngine | null>(null);

  // Store callbacks in mutable ref to decouple engine lifecycle from React renders
  const callbacksRef = useRef({
    onShapeCreated,
    onShapeUpdated,
    onShapeDeleted,
    onPointerMove,
    onStrokeStart,
    onStrokeChunk,
    onStrokeEnd,
  });

  useEffect(() => {
    callbacksRef.current = {
      onShapeCreated,
      onShapeUpdated,
      onShapeDeleted,
      onPointerMove,
      onStrokeStart,
      onStrokeChunk,
      onStrokeEnd,
    };
  });

  // Granular store selectors to prevent unnecessary hook re-renders
  const setPan = useCanvasStore((s) => s.setPan);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setSelectedShapeIds = useCanvasStore((s) => s.setSelectedShapeIds);
  const setCanUndo = useCanvasStore((s) => s.setCanUndo);
  const setCanRedo = useCanvasStore((s) => s.setCanRedo);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const fillColor = useCanvasStore((s) => s.fillColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const opacity = useCanvasStore((s) => s.opacity);
  const collaborators = useCanvasStore((s) => s.collaborators);

  // Initialize CanvasEngine exactly once per canvas mount
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
        callbacksRef.current.onShapeCreated?.(shape);
      },
      onShapeUpdated: (shape) => {
        callbacksRef.current.onShapeUpdated?.(shape);
      },
      onShapeDeleted: (shapeIds) => {
        callbacksRef.current.onShapeDeleted?.(shapeIds);
      },
      onStrokeStart: (payload) => {
        callbacksRef.current.onStrokeStart?.(payload);
      },
      onStrokeChunk: (payload) => {
        callbacksRef.current.onStrokeChunk?.(payload);
      },
      onStrokeEnd: (payload) => {
        callbacksRef.current.onStrokeEnd?.(payload);
      },
    });

    const unbindMove = engine.events.on('pointer:move', (data: any) => {
      callbacksRef.current.onPointerMove?.(data.world);
    });

    engineRef.current = engine;

    return () => {
      unbindMove();
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvases, setPan, setZoom, setSelectedShapeIds, setCanUndo, setCanRedo]);

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
