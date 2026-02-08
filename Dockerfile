
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# Bust cache to ensure fresh build
ARG CACHEBUST=1
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner
FROM node:18-alpine
WORKDIR /app

# Install dependencies required for Prisma (OpenSSL)
RUN apk add --no-cache openssl

# Install production dependencies for backend
# We need to install in backend directory to match structure
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY --from=backend-builder /app/backend/prisma ./prisma
RUN npx prisma generate

# Return to root
WORKDIR /app

# Copy backend build to backend/dist (so __dirname is /app/backend/dist)
COPY --from=backend-builder /app/backend/dist ./backend/dist
# Copy prisma to backend/prisma
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
# Copy frontend build to public directory (so ../../public from dist works)
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose port
EXPOSE 3008

# Start command from root
# Start command from root
# Run migrations before starting the server
# We cd into backend so that prisma can find the schema (backend/prisma/schema.prisma is ./prisma/schema.prisma relative to backend)
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/server.js"]
