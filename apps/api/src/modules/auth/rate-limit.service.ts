import Redis from 'ioredis';

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379, maxRetriesPerRequest: 1, enableOfflineQueue: false });
const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}