# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference (Most Used)

| Task | Command |
|------|---------|
| Build | `rush build` |
| Test all | `rush test` |
| Test one package | `cd packages/<name> && rushx test` |
| Lint fix | `rush lint:fix` |
| Full CI | `./scripts/check-all-the-things.sh` |

## File Patterns

- Core framework: `packages/core/src/**/*.ts`
- Tests: `packages/*/test/**/*.test.ts`
- Adapters: `adapters/*/src/**/*.ts`
- CLI commands: `packages/cli/src/commands/**/*.ts`
- Shared types: `packages/common/src/**/*.ts`

## Development Commands

### Essential Commands
- `rush install` - Install dependencies for all packages
- `rush update` - Update dependencies only (faster than install)
- `rush rebuild` - Build all packages from scratch
- `rush build` - Incremental build of all packages
- `rush test` - Run unit tests across all packages
- `rush lint:fix` - Fix ESLint issues automatically
- `rush lint:check` - Check for linting issues without fixing
- `rush clean` - Clean TypeScript compilation output

### Development Workflow Commands
- `./scripts/check-all-the-things.sh` - Run full CI pipeline locally (clean, purge, update, rebuild, lint, test)
- `cd packages/<name> && rushx test` - Run tests for a specific package
- `cd packages/<name> && rushx build` - Build a specific package

### Package-specific Testing
To run tests for individual packages, navigate to the package directory and use `rushx`:
```bash
cd packages/core && rushx test
cd packages/cli && rushx test
```

## Architecture Overview

### Monorepo Structure
Magek is a Rush.js monorepo with PNPM workspaces:

- **packages/** - Core framework packages
  - `@magek/core` - Event sourcing engine, CQRS, GraphQL generation
  - `@magek/common` - Shared types, utilities, and concepts
  - `@magek/cli` - Command-line tool for project scaffolding
  - `@magek/server` - Fastify-based runtime for local development (includes infrastructure)
  - `@magek/metadata` - Metadata extraction and reflection system
  - `create-magek` - Project creation tool

- **adapters/** - Database and storage adapters
  - `nedb/` - NeDB adapters for event store, read models, and sessions

- **tools/** - Development tooling
  - `eslint-config` - Shared ESLint configuration

### Event-Driven Architecture
Magek implements event sourcing and CQRS patterns:

- **Commands** - User intent that triggers events
- **Events** - Immutable facts that happened in the system
- **Entities** - Aggregate roots that maintain state from events
- **Event Handlers** - React to events and perform side effects
- **Read Models** - Query-optimized projections of entity state
- **Agents** - Long-lived autonomous processes that observe and react to events

### Key Technologies
- **TypeScript** targeting ES2019
- **Rush.js** for monorepo management with PNPM
- **Mocha** for unit testing (some packages use Vitest)
- **ESLint** with custom shared configuration
- **Fastify** for HTTP server runtime
- **GraphQL** auto-generated from decorators

## Code Conventions

### Language & Style
- TypeScript with strict mode enabled
- Prefer named exports over default exports
- Use functional programming patterns where possible
- Follow ESLint rules defined in `@magek/eslint-config`
- Use Conventional Commits format for commit messages

### Testing Strategy
- Unit tests use Mocha with Chai assertions
- Tests located in `test/` directories within each package
- Run `rush test` to execute all tests
- Individual package tests: `cd packages/<name> && rushx test`

### Development Requirements
- Node.js 22.x (specified in rush.json)
- PNPM managed automatically by Rush
- Rush.js for build orchestration

## Common Pitfalls

- **Always run `rush change`** for published packages before creating a PR
- **Pre-commit hook validates change files** - bypass with `--no-verify` for docs-only changes
- **GraphQL types are auto-generated** - don't edit generated files directly
- **Workspace dependencies** use `workspace:^0.0.1` syntax for internal packages
- **Packages use Vitest - check package.json scripts

## Commit Guidelines

Use Conventional Commits format:

```
feat(core): add new event handler decorator
fix(cli): resolve path resolution on Windows
docs(readme): update installation instructions
chore(deps): bump typescript to 5.x
refactor(server): extract middleware configuration
test(common): add unit tests for utility functions
```

## Important Notes

- Always run linting before committing: `rush lint:fix`
- The full CI pipeline can be run locally with `./scripts/check-all-the-things.sh`
- Some packages may have different test frameworks (check package.json scripts)
- The project uses workspace dependencies (`workspace:^0.0.1`) for internal packages

### Documentation
- **Always keep documentation up to date** when making code changes
- Update relevant documentation files (README.md, CLAUDE.md, .github/copilot-instructions.md) when:
  - Adding new features or commands
  - Changing existing behavior or APIs
  - Modifying project structure or architecture
  - Updating development workflows or conventions

### Pull Request Workflow
- **Always run `rush change` before creating a PR** if you modified any published package
- Published packages: most packages under `packages/` and `adapters/` (those with `shouldPublish: true` in rush.json)
- Skip `rush change` for: documentation-only changes, CI/CD config changes, or non-published packages (tools/, docs/)
- After running `rush change`, commit the generated files in `common/changes/`
- A pre-commit hook will verify change files exist; use `git commit --no-verify` to bypass for non-package changes
