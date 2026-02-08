import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

// Support both REDIS_URL (e.g., redis://redis:6379) and individual REDIS_HOST/PORT/PASSWORD
let redisConfig: any;

if (process.env.REDIS_URL) {
    // Parse REDIS_URL (format: redis://host:port or redis://:password@host:port)
    redisConfig = process.env.REDIS_URL;
} else {
    // Fallback to individual env vars
    redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    };
}


export const createQueue = (name: string) => {
    return new Queue(name, {
        redis: redisConfig,
        defaultJobOptions: {
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 200,     // Keep last 200 failed jobs
            attempts: 3,           // Retry 3 times
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        }
    });
};
