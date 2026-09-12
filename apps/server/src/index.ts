import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env } from './config/env.js';
import { repository } from './db/index.js';
import { RoomService } from './services/RoomService.js';
import { PersistenceQueue } from './services/PersistenceQueue.js';
import { roomController } from './controllers/RoomController.js';
import { ConnectionManager } from './websocket/ConnectionManager.js';

const server = Fastify({
  logger: {
    level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  },
});

// Setup Services
const persistenceQueue = new PersistenceQueue(repository);
const roomService = new RoomService(repository);
const connectionManager = new ConnectionManager(roomService, persistenceQueue);

// Register CORS
await server.register(cors, {
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Register WebSockets
await server.register(websocket, {
  options: {
    maxPayload: env.WS_MAX_PAYLOAD_BYTES,
  },
});

// Register REST Controllers
await server.register(roomController);

// Health Check
server.get('/health', async () => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'FLAM Real-Time Canvas Server',
  };
});

// WebSocket Gateway Route
server.get('/ws', { websocket: true }, (socket, req) => {
  connectionManager.handleConnection(socket, req);
});

// Graceful Shutdown
const closeGracefully = async (signal: string) => {
  server.log.info(`Received ${signal}, flushing persistence and shutting down...`);
  await persistenceQueue.flush();
  persistenceQueue.stop();
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

const start = async () => {
  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    server.log.info(`Server ready at http://${env.HOST}:${env.PORT}`);
    server.log.info(`WebSocket Gateway available at ws://${env.HOST}:${env.PORT}/ws`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
