import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { IRoomRepository } from './types.js';
import { PrismaRoomRepository } from './PrismaRoomRepository.js';
import { SqliteRoomRepository } from './SqliteRoomRepository.js';

let repository: IRoomRepository;

if (env.DATABASE_URL && env.DATABASE_URL.startsWith('postgresql://')) {
  try {
    const prisma = new PrismaClient();
    repository = new PrismaRoomRepository(prisma);
    console.log('[Database] Connected to PostgreSQL via Prisma');
  } catch (err) {
    console.warn('[Database] Failed to connect to PostgreSQL, falling back to SQLite repository', err);
    repository = new SqliteRoomRepository('./dev.db');
  }
} else {
  console.log('[Database] Using SQLite Room Repository (./dev.db)');
  repository = new SqliteRoomRepository('./dev.db');
}

export { repository };
export * from './types.js';
