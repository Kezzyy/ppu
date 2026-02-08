import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null // Required for Bull
});

redis.on('connect', () => {
    console.log('[Redis] Connected to Redis');
});

redis.on('error', (err) => {
    console.error('[Redis] Error:', err);
});

export default redis;
