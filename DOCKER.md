# Docker Build for Client

This directory contains a Dockerfile for building static client files in an isolated container.

## Purpose

The Dockerfile creates a build-time container that:
1. Installs Node.js dependencies
2. Runs `npm run build:app` (Vite build)
3. Outputs to `/app/dist` inside the container
4. Exits after build completes

This is **not** a runtime container - it's solely for generating static files that are then served by the reverse proxy.

## Usage

### Via root scripts

```bash
# From workspace root - builds only static files with Docker
./homelab-vm-provisioner-client/build

# Or as part of full build
./build --docker
```

### Manual Docker build

```bash
# Build the image
docker build -t homelab-vm-provisioner-client-builder .

# Extract built files
CONTAINER_ID=$(docker create homelab-vm-provisioner-client-builder)
mkdir -p ../homelab-vm-provisioner-proxy/public
docker cp "$CONTAINER_ID:/app/dist/." ../homelab-vm-provisioner-proxy/public/
docker rm "$CONTAINER_ID"
```

## When to use Docker builds

- CI/CD pipelines
- Reproducible builds across environments
- Isolated build environments
- When you want to avoid installing Node.js dependencies locally

## When to use local builds

- Development (faster, no Docker overhead)
- When you need to run tests/coverage locally
- When iterating rapidly

## Notes

- The Docker build only creates static files (Vite build)
- Tests, coverage, and docs still run locally in `./build --docker`
- The image is tagged as `homelab-vm-provisioner-client-builder` for caching
- Container is removed after file extraction; image is kept for reuse
