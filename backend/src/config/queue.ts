import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

let redisConfig: any;

if (process.env.REDIS_URL) {
    redisConfig = process.env.REDIS_URL;
} else {
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
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        }
    });
};
