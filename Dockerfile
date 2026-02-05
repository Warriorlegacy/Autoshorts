# Multi-stage Dockerfile for AutoShorts
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Invalidate cache
RUN echo "cache-bust-2"

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ .
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Invalidate cache
RUN echo "cache-bust-2"

# Copy backend package files
COPY backend/package*.json ./
RUN npm install

# Copy backend source and build
COPY backend/ .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache ffmpeg

# Copy backend production files
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Copy frontend build to backend public
COPY --from=frontend-builder /app/frontend/dist ./backend/public/frontend

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["/app/start.sh"]
