# Docker Production Deployment - IMPORTANT

## Critical Configuration for Docker

When deploying with Docker Compose, you **MUST** update your `.env` file to use **Docker container names** instead of `localhost`.

### Required Changes

1. **Copy the production template:**
   ```bash
   cp backend/.env.production backend/.env
   ```

2. **Edit `backend/.env` and update these values:**

   ```env
   # Database - Use container name 'db', NOT 'localhost'
   DATABASE_URL="postgresql://user:password@db:5432/shimatsu_updater?schema=public"
   
   # Redis - Use container name 'redis', NOT 'localhost'
   REDIS_HOST=redis
   REDIS_PORT=6379
   
   # Your production URL
   APP_URL=https://your-domain.com
   CORS_ORIGIN=https://your-domain.com
   
   # Security - CHANGE THESE IN PRODUCTION!
   JWT_SECRET=your_random_secret_key_here
   ENCRYPTION_KEY=your_32_character_random_key_here
   
   # Pterodactyl API
   PTERODACTYL_URL=https://your-pterodactyl-url.com
   PTERODACTYL_API_KEY=your_pterodactyl_api_key_here
   ```

3. **Deploy:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

## Why This Matters

- **localhost** refers to the container itself, not other containers
- **Container names** (like `redis`, `db`) are resolved by Docker's internal DNS
- Without this, Redis and PostgreSQL connections will fail with "MaxRetriesPerRequestError"

## Verification

Check if services are running:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app
```

You should see:
- ✅ `shimatsu-updater` (app)
- ✅ `shimatsu-db` (PostgreSQL)
- ✅ `shimatsu-redis` (Redis)

No Redis connection errors in logs!
