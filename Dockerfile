# Build-only Dockerfile for generating React static files
# This container is NOT for runtime - it builds and exits
# Used by ./build-client-docker or ./build --docker
# Output: /app/dist (extracted after build)

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build tools)
RUN npm ci --only=production=false

# Copy source files
COPY . .

# Build static files (vite build only, no tests/coverage)
RUN npm run build:app

# Output is in /app/dist
# Extract with: docker cp <container_id>:/app/dist/. <destination>/
# This container exits after build completes
