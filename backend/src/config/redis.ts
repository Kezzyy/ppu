import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT || '6379';
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisUrl = process.env.REDIS_URL || `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}`;

const redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null
});

redis.on('connect', () => {
    console.log('[Redis] Connected to Redis');
});

redis.on('error', (err) => {
    console.error('[Redis] Error:', err);
});

export default redis;
