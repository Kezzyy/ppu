export class RateLimitError extends Error {
    constructor(public retryAfter: number) {
        super(`Rate limit exceeded. Retry after ${retryAfter}s`);
        this.name = 'RateLimitError';
    }
}
