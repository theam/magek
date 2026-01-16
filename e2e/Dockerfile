FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache bash git curl jq python3 make g++

# Create a mock git user for any git operations
RUN git config --global user.email "test@example.com" && \
    git config --global user.name "Test User" && \
    git config --global init.defaultBranch main

# Install Verdaccio, pnpm, and Rush globally
RUN npm install -g verdaccio@5 pnpm@10.14.0 @microsoft/rush@5.153.2

# Set working directory
WORKDIR /work

# Copy the entire workspace (needed for building packages)
COPY . /workspace

# Copy Verdaccio configuration
COPY ./e2e/verdaccio-config.yaml /etc/verdaccio/config.yaml

# Copy all phase scripts
COPY ./e2e/phase1-setup-registry.sh /scripts/
COPY ./e2e/phase2-create-app.sh /scripts/
COPY ./e2e/phase3-validate-app.sh /scripts/
COPY ./e2e/phase4-run-server.sh /scripts/
COPY ./e2e/phase5-integration-test.sh /scripts/
COPY ./e2e/run-e2e-tests.sh /scripts/

# Make scripts executable
RUN chmod +x /scripts/*.sh

# Create necessary directories and set ownership for non-root user
RUN mkdir -p /tmp/verdaccio-storage && \
    chown -R node:node /tmp/verdaccio-storage && \
    chown -R node:node /workspace && \
    chown -R node:node /work

# Switch to non-root user
USER node

# Default command runs the orchestrator script
CMD ["/scripts/run-e2e-tests.sh"]
