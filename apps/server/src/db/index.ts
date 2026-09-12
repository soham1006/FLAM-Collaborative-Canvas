import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { IRoomRepository } from './types.js';
import { InMemoryRoomRepository } from './InMemoryRoomRepository.js';
import { PrismaRoomRepository } from './PrismaRoomRepository.js';

let repository: IRoomRepository;

if (env.DATABASE_URL && env.DATABASE_URL.startsWith('postgresql://')) {
  try {
    const prisma = new PrismaClient();
    repository = new PrismaRoomRepository(prisma);
    console.log('[Database] Connected to PostgreSQL via Prisma');
  } catch (err) {
    console.warn('[Database] Failed to connect to PostgreSQL, falling back to InMemory repository', err);
    repository = new InMemoryRoomRepository();
  }
} else {
  console.log('[Database] Using In-Memory Room Repository (Zero-config local development)');
  repository = new InMemoryRoomRepository();
}

export { repository };
export * from './types.js';
