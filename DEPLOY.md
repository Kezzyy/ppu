# Shimatsu Plugin Updater - Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Pterodactyl Panel URL & API Key (Application API Key)

## Deployment Steps

1. **Configure Environment Variables**
   Open `docker-compose.yml` and set your Pterodactyl credentials:
   ```yaml
   environment:
     - PTERODACTYL_URL=https://panel.yourdomain.com
     - PTERODACTYL_API_KEY=ptla_your_api_key_here
     - JWT_SECRET=change_this_to_a_secure_random_string
   ```

2. **Build and Run**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the Dashboard**
   The application will be available at `http://localhost:3000` (or your server's IP).

## Default Login
On first run, no users exist. You need to create an initial admin user via the database or API, or the application might have an initial setup (check code).
*Note: Ensure you run migrations if not automatically handled.*

The `Dockerfile` runs `npx prisma generate`, but it might need `npx prisma migrate deploy` to create tables on a fresh DB.
You can run this manually:
```bash
docker-compose exec app npx prisma migrate deploy
```

## Troubleshooting
- **Database Connection**: Ensure Postgres is ready before the app starts. The app might restart a few times waiting for DB.
- **Redis**: Required for job queues and caching.
