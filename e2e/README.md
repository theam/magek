# Integration E2E Tests for booster-ai framework

This directory contains the end-to-end integration test infrastructure for the `booster-ai` framework.

## Overview

The integration test simulates a full development workflow with booster-ai in an isolated Docker container defined in the `e2e/Dockerfile` file. The Docker image will be initialized with the following steps:

### Phase 1: Building and packaging all workspace packages

The first thing we do is to install and launch a local Verdaccio registry. This is a private npm registry that will be used to publish the workspace packages.

Then, we build and package all workspace packages using the existing build infrastructure.

Finally, we publish the packed packages to the Verdaccio registry.

### Phase 2: Running `npm create booster-ai@latest` in the Docker container

We run `npm create booster-ai@latest bank-app --template ../templates/bank-app` in the Docker container. This will create a new project in the `test-app` directory using the template from the `../templates/bank-app` directory.

> TODO: Add an additional test using the default template live at the official repository.

### Phase 3: Validating the generated project structure and token replacements

We validate the generated project structure and token replacements.

### Phase 4: TODO: To be defined

## Components

### TODO: Run e2e tests in GitHub Actions Workflow

### Docker Infrastructure

#### Dockerfile

- Based on `node:22-alpine`
- Configures npm to use Verdaccio registry
- Includes git, curl, and bash for testing
