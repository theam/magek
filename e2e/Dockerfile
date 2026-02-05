FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache bash git curl jq python3 make g++

# Create a mock git user for any git operations
RUN git config --global user.email "test@example.com" && \
    git config --global user.name "Test User" && \
    git config --global init.defaultBranch main

# Install Verdaccio, pnpm, and Rush globally
RUN npm install -g verdaccio@5 pnpm@10.14.0 @microsoft/rush@5.153.2

# Set working directory for the repo
WORKDIR /workspace

# Copy the entire workspace
COPY . /workspace

# Create necessary directories and set ownership for non-root user
RUN mkdir -p /tmp/verdaccio-storage /work && \
    chown -R node:node /tmp/verdaccio-storage && \
    chown -R node:node /workspace && \
    chown -R node:node /work

# Switch to non-root user
USER node

ENV E2E_APP_ROOT=/work
ENV E2E_REGISTRY_URL=http://localhost:4873
ENV E2E_VERDACCIO_CONFIG=/workspace/e2e/verdaccio-config.yaml
ENV E2E_FIXTURES_DIR=/workspace/packages/e2e-tests/fixtures

# Install workspace dependencies so the E2E runner has its toolchain
RUN rush install

# Default command runs the E2E suite inside the package
WORKDIR /workspace/packages/e2e-tests
CMD ["rushx", "test:e2e"]
