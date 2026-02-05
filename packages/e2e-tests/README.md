# Magek E2E Tests

These tests exercise the full Magek workflow (Verdaccio publish -> app scaffold -> build -> server -> GraphQL) and are intended to run inside the Docker environment for repeatability.

## Running in Docker

```bash
rush test:e2e
```

This builds the image and runs the suite inside the container.

## Environment variables

- `E2E_APP_ROOT` (default: `/work`) - Directory where the scaffolded app is created.
- `E2E_REGISTRY_URL` (default: `http://localhost:4873`) - Local registry URL.
- `E2E_VERDACCIO_CONFIG` (default: `/workspace/e2e/verdaccio-config.yaml`) - Verdaccio config path.
- `E2E_FIXTURES_DIR` (default: `/workspace/packages/e2e-tests/fixtures`) - Fixture root.
- `E2E_LOG_DIR` (default: `/tmp/magek-e2e-logs-<timestamp>`) - Where logs are written.
