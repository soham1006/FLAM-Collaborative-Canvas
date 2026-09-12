import { useEffect, useRef } from 'react';
import {
  WSMessage,
  RoomStatePayload,
  UserJoinedPayload,
  UserLeftPayload,
  CursorBroadcastPayload,
  ShapeCreatedPayload,
  ShapeUpdatedPayload,
  ShapeDeletedPayload,
  ShapeDTO,
} from '@flam/shared';
import { useCanvasStore } from '../store/useCanvasStore';
import { CanvasEngine } from '@flam/drawing-engine';

interface UseCollaborationProps {
  engineRef: React.RefObject<CanvasEngine | null>;
}

export function useCollaboration({ engineRef }: UseCollaborationProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorSendRef = useRef<number>(0);

  // Granular store subscriptions (avoids re-rendering on every store change)
  const roomId = useCanvasStore((s) => s.roomId);
  const setConnectionStatus = useCanvasStore((s) => s.setConnectionStatus);
  const setCollaborators = useCanvasStore((s) => s.setCollaborators);
  const updateUserCursor = useCanvasStore((s) => s.updateUserCursor);
  const setRoomInfo = useCanvasStore((s) => s.setRoomInfo);

  useEffect(() => {
    let isMounted = true;
    let reconnectAttempts = 0;

    const connect = () => {
      if (!isMounted) return;

      // Clean up previous socket instance if any
      if (socketRef.current) {
        const prev = socketRef.current;
        socketRef.current = null;
        prev.onopen = null;
        prev.onmessage = null;
        prev.onerror = null;
        prev.onclose = null;
        prev.close();
      }

      setConnectionStatus('connecting');

      // Determine WebSocket URL (browser connects via Vite dev proxy on /ws)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl =
        import.meta.env.VITE_SERVER_WS_URL ||
        `${protocol}//${window.location.host}/ws`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMounted || socketRef.current !== socket) return;
        reconnectAttempts = 0;
        setConnectionStatus('connected');

        const { currentUserId, currentUserName, currentUserColor, roomId: activeRoomId } =
          useCanvasStore.getState();

        // Send ROOM_JOIN handshake
        const joinMsg: WSMessage = {
          type: 'ROOM_JOIN',
          roomId: activeRoomId,
          senderId: currentUserId,
          timestamp: Date.now(),
          payload: {
            userName: currentUserName,
            userColor: currentUserColor,
          },
        };
        socket.send(JSON.stringify(joinMsg));

        // Start Heartbeat Ping (every 20s)
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        if (!isMounted || socketRef.current !== socket) return;
        try {
          const msg: WSMessage = JSON.parse(event.data);
          const { currentUserId, roomId: activeRoomId, roomName: activeRoomName } =
            useCanvasStore.getState();

          switch (msg.type) {
            case 'ROOM_STATE': {
              const data = msg.payload as RoomStatePayload;
              if (data.roomId !== activeRoomId || data.roomName !== activeRoomName) {
                setRoomInfo(data.roomId, data.roomName);
              }
              // Filter out current user from remote collaborator list
              setCollaborators(data.users.filter((u) => u.id !== currentUserId));

              // Populate existing shapes on canvas
              if (engineRef.current && data.shapes.length > 0) {
                engineRef.current.setShapesFromDTO(data.shapes);
              }
              break;
            }

            case 'USER_JOINED': {
              const data = msg.payload as UserJoinedPayload;
              if (data.user.id !== currentUserId) {
                useCanvasStore.setState((state) => ({
                  collaborators: [
                    ...state.collaborators.filter((u) => u.id !== data.user.id),
                    data.user,
                  ],
                }));
              }
              break;
            }

            case 'USER_LEFT': {
              const data = msg.payload as UserLeftPayload;
              useCanvasStore.setState((state) => ({
                collaborators: state.collaborators.filter((u) => u.id !== data.userId),
              }));
              break;
            }

            case 'CURSOR_BROADCAST': {
              const data = msg.payload as CursorBroadcastPayload;
              if (data.userId !== currentUserId) {
                updateUserCursor(data.userId, data.x, data.y);
                engineRef.current?.requestRender();
              }
              break;
            }

            case 'SHAPE_CREATED': {
              const data = msg.payload as ShapeCreatedPayload;
              if (msg.senderId !== currentUserId && engineRef.current) {
                engineRef.current.addShape(data.shape, false);
              }
              break;
            }

            case 'SHAPE_UPDATED': {
              const data = msg.payload as ShapeUpdatedPayload;
              if (msg.senderId !== currentUserId && engineRef.current) {
                const shape = engineRef.current.getShapes().find((s) => s.id === data.shapeId);
                if (shape) {
                  Object.assign(shape, data.changes);
                  engineRef.current.requestRender();
                }
              }
              break;
            }

            case 'SHAPE_DELETED': {
              const data = msg.payload as ShapeDeletedPayload;
              if (msg.senderId !== currentUserId && engineRef.current) {
                engineRef.current.removeShapes(data.shapeIds, false);
              }
              break;
            }
          }
        } catch (err) {
          console.error('[useCollaboration] Failed to parse message:', err);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setConnectionStatus('disconnected');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
        reconnectAttempts++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      socket.onerror = (err) => {
        console.warn('[useCollaboration] WebSocket error event:', err);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (socketRef.current) {
        const s = socketRef.current;
        socketRef.current = null;
        s.onopen = null;
        s.onmessage = null;
        s.onerror = null;
        s.onclose = null;
        s.close();
      }
    };
  }, [
    roomId,
    engineRef,
    setConnectionStatus,
    setCollaborators,
    updateUserCursor,
    setRoomInfo,
  ]);

  // Outbound Cursor Move Dispatcher (Throttled to 30ms)
  const sendCursorMove = (worldX: number, worldY: number) => {
    const now = Date.now();
    if (now - lastCursorSendRef.current < 30) return; // 33 Hz cap
    lastCursorSendRef.current = now;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const { roomId: activeRoomId, currentUserId } = useCanvasStore.getState();
      socketRef.current.send(
        JSON.stringify({
          type: 'CURSOR_MOVE',
          roomId: activeRoomId,
          senderId: currentUserId,
          timestamp: now,
          payload: { x: Math.round(worldX), y: Math.round(worldY) },
        })
      );
    }
  };

  // Outbound Shape Create Dispatcher
  const sendShapeCreated = (shape: ShapeDTO) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const { roomId: activeRoomId, currentUserId } = useCanvasStore.getState();
      socketRef.current.send(
        JSON.stringify({
          type: 'SHAPE_CREATE',
          roomId: activeRoomId,
          senderId: currentUserId,
          timestamp: Date.now(),
          payload: { shape },
        })
      );
    }
  };

  // Outbound Shape Delete Dispatcher
  const sendShapeDeleted = (shapeIds: string[]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const { roomId: activeRoomId, currentUserId } = useCanvasStore.getState();
      socketRef.current.send(
        JSON.stringify({
          type: 'SHAPE_DELETE',
          roomId: activeRoomId,
          senderId: currentUserId,
          timestamp: Date.now(),
          payload: { shapeIds },
        })
      );
    }
  };

  return {
    sendCursorMove,
    sendShapeCreated,
    sendShapeDeleted,
  };
}

