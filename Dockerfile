# GLIT Platform - Backend Dockerfile
# Multi-stage build for optimized production image

###############################################################################
# Stage 1: Base - Common dependencies
###############################################################################
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Force cache invalidation - Change this value to rebuild
ARG CACHEBUST=3

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

###############################################################################
# Stage 2: Dependencies - Install all dependencies
###############################################################################
FROM base AS dependencies

# Install all dependencies (including dev dependencies)
RUN npm ci

###############################################################################
# Stage 3: Build - Compile TypeScript
###############################################################################
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

###############################################################################
# Stage 4: Development - For development with hot reload
###############################################################################
FROM base AS development

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start development server
CMD ["dumb-init", "npm", "run", "dev"]

###############################################################################
# Stage 5: Production - Minimal production image
###############################################################################
FROM base AS production

# Copy production node_modules from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy compiled code
COPY --from=build /app/dist ./dist

# Copy package.json for metadata
COPY --from=build /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start production server
CMD ["dumb-init", "node", "dist/index.js"]
