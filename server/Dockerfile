# ==============================================================================
# Crave Backend API - Production Dockerfile (Security Hardened Multi-Stage)
# ==============================================================================

# Stage 1: Dependency Builder
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl/wget for healthchecks
RUN apk add --no-cache wget

# Copy installed production node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Run as non-privileged system user 'node' (UID: 1000) for container security
USER node

EXPOSE 5000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]

