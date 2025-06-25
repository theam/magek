FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache bash git curl jq

# Create a mock git user for any git operations
RUN git config --global user.email "test@example.com"
RUN git config --global user.name "Test User"

# Install Verdaccio globally
RUN npm install -g verdaccio@5

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

# Make scripts executable
RUN chmod +x /scripts/*.sh

# Run each phase in sequence
# Phase 1: Setup registry and build/publish packages
RUN /scripts/phase1-setup-registry.sh

# Phase 2: Create test app
RUN /scripts/phase2-create-app.sh

# Phase 3: Validate the generated project
RUN /scripts/phase3-validate-app.sh

# Default command (can be overridden)
CMD ["echo", "✅ E2E tests completed successfully!"]