import { FastifyPluginAsync } from 'fastify';
import { CreateRoomSchema } from '@flam/shared';
import { RoomService } from '../services/RoomService.js';
import { repository } from '../db/index.js';

const roomService = new RoomService(repository);

export const roomController: FastifyPluginAsync = async (fastify) => {
  // Create or Get Room
  fastify.post('/api/rooms', async (request, reply) => {
    try {
      const body = CreateRoomSchema.parse(request.body);
      const slug =
        body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
        '-' +
        Math.random().toString(36).substring(2, 6);

      const result = await roomService.getOrCreateRoom(slug, body.name);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: err.message,
      });
    }
  });

  // Get Room Details
  fastify.get('/api/rooms/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const room = await roomService.getRoomBySlug(slug);

    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    return reply.send(room);
  });

  // Export Room State as JSON
  fastify.get('/api/rooms/:slug/export', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = await roomService.exportRoomData(slug);

    if (!data) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    reply.header('Content-Disposition', `attachment; filename="${slug}-export.json"`);
    return reply.send(data);
  });
};
