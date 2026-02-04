# Magek E2E Tests (Docker)

This directory contains the Docker entry point for the TypeScript/Mocha E2E suite in `packages/e2e-tests`.

## Running

```bash
docker build -f e2e/Dockerfile .
```

The image runs `rush test:e2e`, which:

1. Starts a local Verdaccio registry
2. Publishes Magek packages to it via Rush
3. Scaffolds a new app from the local registry
4. Builds and runs the server, then executes the GraphQL flow
