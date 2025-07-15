# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is the **Booster Framework** monorepo, organized using Rush.js and PNPM workspaces. The framework is designed for creating event-driven backend microservices with CQRS and Event Sourcing patterns.

### Key Packages

- **`packages/cli`** - The `boost` command-line tool (`@booster-ai/cli`)
- **`packages/core`** - Core framework runtime logic (`@booster-ai/core`)
- **`packages/common`** - Shared types and utilities (`@booster-ai/common`)
- **`packages/server`** - Local development server (`@booster-ai/server`)
- **`packages/server-infrastructure`** - Server infrastructure components (`@booster-ai/server-infrastructure`)
- **`packages/create`** - Project scaffolding tool (`create-booster-ai`)
- **`packages/metadata`** - Metadata handling (`@booster-ai/metadata`)
- **`tools/eslint-config`** - Shared ESLint configuration (`@booster-ai/eslint-config`)

## Development Commands

### Core Commands
- **Install dependencies**: `rush update`
- **Build all packages**: `rush rebuild`
- **Run tests**: `rush test`
- **Lint check**: `rush lint:check`
- **Lint fix**: `rush lint:fix`
- **Clean build artifacts**: `rush clean`
- **Prepare (ts-patch)**: `rush prepare`

### Package-Specific Commands
- **Run tests for specific package**: `cd packages/<name> && rushx test`
- **Build specific package**: `cd packages/<name> && rushx build`

### Essential Scripts
- **Full CI pipeline**: `./scripts/check-all-the-things.sh` (runs complete test suite)
- **PowerShell version**: `./scripts/check-all-the-things.ps1`

## Technology Stack

- **Node.js**: 22.x (enforced via rush.json)
- **TypeScript**: 5.8.3
- **Package Manager**: PNPM 10.12.4 (managed by Rush)
- **Test Framework**: Mocha (ESM modules)
- **Build Tool**: TypeScript compiler
- **Monorepo**: Rush.js with PNPM workspaces

## Testing Configuration

Each package has its own `.mocharc.cjs` file for Mocha configuration. Tests are written in TypeScript with ESM modules and use `NODE_OPTIONS="--no-warnings=ExperimentalWarning"` to suppress warnings.

## Code Style & Conventions

### TypeScript
- Use ES modules (`import`/`export`)
- Prefer explicit types, avoid `any` - use `unknown` with type guards
- Use `const` and `let`, avoid `var`
- Prefer functional programming style
- No default exports, use named exports

### Architecture Patterns
- **Event-driven**: Commands, Events, Event Handlers
- **CQRS**: Command Query Responsibility Segregation
- **Event Sourcing**: Events as source of truth
- **Domain-driven Design**: Business logic in domain terms

### Key Concepts
- **Commands**: Handle user intentions
- **Events**: Record what happened
- **Entities**: Aggregate state from events
- **Read Models**: Optimized query projections
- **Event Handlers**: Process events and update state

## Important Files

- **`rush.json`** - Main Rush configuration with package registry
- **`common/config/rush/command-line.json`** - Custom Rush commands
- **`common/config/rush/common-versions.json`** - Dependency version management
- **`tsconfig.json`** - Root TypeScript configuration
- **`eslint.config.mjs`** - ESLint configuration using custom config
- **`.github/copilot-instructions.md`** - AI assistant guidance
- **`CONTRIBUTING.md`** - Detailed contribution guidelines

## Build Process

1. TypeScript compilation (`tsc -b`)
2. Some packages copy template files (`copyfiles`)
3. ESLint for code quality
4. Mocha for testing
5. All packages build in dependency order via Rush

## Common Tasks

### Adding a New Package
1. Create package directory under `packages/`
2. Add to `rush.json` projects array
3. Follow existing package.json structure
4. Include proper tsconfig.json and .mocharc.cjs

### Running Tests
- Always run `rush test` before submitting changes
- Individual package tests: `cd packages/<name> && rushx test`
- Tests use Mocha with ESM modules

### Code Quality
- Run `rush lint:fix` to auto-fix linting issues
- Follow existing patterns in similar packages
- Use workspace dependencies with `workspace:^` prefix

## Development Workflow

1. Install Rush globally: `npm install -g @microsoft/rush`
2. Install dependencies: `rush update`
3. Build everything: `rush rebuild`
4. Make changes
5. Run tests: `rush test`
6. Run linter: `rush lint:fix`
7. Verify with full pipeline: `./scripts/check-all-the-things.sh`

## Framework Architecture

The framework follows a provider pattern where:
- Core logic is provider-agnostic
- Providers implement cloud-specific adapters
- Local provider enables development/testing
- CLI orchestrates everything

Key entry points:
- `packages/core/src/index.ts` - Main framework exports
- `packages/server/src/index.ts` - Local provider implementation
- `packages/cli/src/index.ts` - CLI entry point

## Troubleshooting

- If builds fail, try `rush clean` then `rush rebuild`
- For dependency issues, run `rush update --full`
- Check Node version matches requirements (22.x)
- Ensure all packages follow ESM module structure