# Integration E2E Tests for create-booster-ai

This directory contains the end-to-end integration test infrastructure for the `create-booster-ai` CLI tool.

## Overview

The integration test validates the complete workflow of:

1. Building and packaging all workspace packages
2. Publishing packages to a temporary private npm registry (Verdaccio)
3. Running `npm create booster-ai@latest` in a Docker container
4. Validating the generated project structure and token replacements

## Components

### GitHub Actions Workflow (`../.github/workflows/integration-e2e.yml`)

The workflow consists of two jobs:

#### Job 1: Build & Pack

- Builds all workspace packages using the existing build infrastructure
- Packs each package into `.tgz` files using `npm pack`
- Uploads packed packages as build artifacts

#### Job 2: Docker E2E Test

- Spins up Verdaccio service container on port 4873
- Downloads packed packages and publishes them to Verdaccio
- Builds and runs the Docker test container
- Validates the complete create-booster-ai workflow

### Docker Infrastructure

#### Dockerfile

- Based on `node:20-alpine`
- Configures npm to use Verdaccio registry
- Includes git, curl, and bash for testing
- Contains a fallback template in case GitHub access fails

#### e2e-run.sh

- Main test script that runs inside the Docker container
- Waits for npm registry availability
- Runs `npm create booster-ai@latest` with appropriate flags
- Executes validation tests

### Test Validation

#### scaffold.spec.js

- Validates project structure (required files and directories)
- Checks token replacement in generated files
- Verifies dependencies are properly configured
- Handles warnings for unreplaced template placeholders

#### local-test.js

- Local validation script for testing the validation logic
- Creates a minimal test project structure
- Useful for development and debugging

#### fallback-template/

- Minimal template structure used as fallback
- Contains basic package.json, tsconfig.json, and TypeScript files
- Ensures tests can run even without GitHub access

## Usage

### Running via GitHub Actions

The integration test runs automatically on:

- Push to main branch (when relevant files change)
- Pull requests to main branch (when relevant files change)
- Manual workflow dispatch

### Running Locally

You can test individual components locally:

```bash
# Test the validation logic
cd e2e/tests
node local-test.js

# Test the scaffold validation
node scaffold.spec.js ./path/to/test-project project-name
```

### Running the Complete E2E Test

To run the complete E2E test locally, you would need to:

1. Start Verdaccio locally on port 4873
2. Build and publish the packages to Verdaccio
3. Build and run the Docker container

## Future Enhancements

This integration test infrastructure provides the foundation for more comprehensive testing:

- **Runtime Testing**: Boot the generated app locally and test API endpoints
- **Database Integration**: Test with PostgreSQL, MySQL, or DynamoDB
- **Command Generation**: Test `boost generate` commands
- **Multi-template Testing**: Test different project templates
- **Provider Testing**: Test different Booster providers (AWS, Azure, local)

## Troubleshooting

#### Common Issues

1. **Registry Unavailable**: The test waits up to 60 seconds for Verdaccio to be available
2. **Package Publishing Fails**: Check that all packages built successfully
3. **Template Access Issues**: The fallback template ensures tests can run without GitHub access
4. **Docker Networking**: The container uses `host.docker.internal` to access Verdaccio

#### Debug Information

The test script provides detailed logging and debug information when failures occur, including:

- Available packages in the registry
- npm configuration
- File system state after operations
