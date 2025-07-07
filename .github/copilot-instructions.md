# Copilot Instructions

## Purpose

This file provides high-level guidance for **AI agents (e.g. OpenAI Codex)** that interact with the Booster Framework repository.  Follow these instructions to reliably set up the development environment, run the full test & lint suite, and keep your contributions consistent with the project's conventions.

## 1. Repository Overview

* **Monorepo layout** – The project is organised as a Rush/PNPM monorepo:
  * `packages/*`   → Production TypeScript packages (framework, providers, CLI, etc.).
  * `tools/*`       → Internal tooling packages (e.g. shared ESLint config).
  * `scripts/*`     → Bash & PowerShell helpers.  The most important is `scripts/check-all-the-things.sh` which runs the entire CI pipeline locally.
  * `website/`      → Documentation source (Docusaurus).
  * `common/`       → Rush-generated files (lock-file, temp folders, etc.).
* **Main configuration** – See `rush.json` (build graph), the root `tsconfig.json`, ESLint/prettier configs, and `.nvmrc`.
* **Node / PNPM versions** – The repo targets **Node 22.x** and **PNPM 9.x** (managed automatically by Rush).

## 2. Quick-start Commands for Agents

| Task | Command | Notes |
|------|---------|-------|
| Install global Rush | `npm i -g @microsoft/rush` | (One-time) |
| Install | `rush install` | (One-time) |
| Install deps only | `rush update` | |
| Build all packages | `rush rebuild` | TypeScript compilation & type-check |
| Fix linter issues | `rush lint:fix` | Uses project ESLint rules |
| Run unit tests | `rush test` | Mocha across all packages |
| Package-scoped test | `cd packages/<name> && rushx test` | |

> Tip: Use `rush clean` & `rush purge` before a fresh install to remove caches.
> **Codex Warning**: Avoid running `rush clean` or `scripts/check-all-the-things.*` scripts here. The sandbox has no internet access after setup, so removed dependencies cannot be reinstalled.


## 3. Code Navigation Tips

1. **Start in `packages/framework-core/src`** – Contains the core domain logic (commands, events, GraphQL generation, etc.).
2. **Provider implementations** live in `packages/framework-provider-*/src`.
3. **CLI entry point** is `packages/cli/src/commands/boost.ts`.
4. Shared types are in `packages/common`.

All production code is TypeScript; tests use Mocha.  Standard utilities such as lodash are intentionally avoided—prefer simple, functional helpers.

## 4. Coding Conventions to Follow

* **Language**: TypeScript (ES2022).  No default exports, prefer named exports.
* **Style**: The project ships its own ESLint & Prettier config (`@booster-ai/eslint-config`).  Always run `rush lint:fix` before committing.
* **Functional-first**: Favour pure functions over classes unless state is required.  Prefer `const`/immutability.
* **Type safety**: Avoid using `any` type at all costs. Always use explicit types as `any` is a potential source of unnoticed errors. Use `unknown` if the type is truly unknown and add proper type guards.
* **Commit messages** must follow the *Conventional Commits* spec.  Examples:
  * `feat(core): add optimistic concurrency control`
  * `fix(cli): validate project name before scaffolding`
* **Branch naming**: `feature/<topic>`, `fix/<topic>`, `doc/<topic>` (see CONTRIBUTING.md for details).

## 5. Testing Strategy

1. **Unit tests** (Mocha) run quickly and should cover most changes.
2. The CI pipeline mirrors the steps in `scripts/check-all-the-things.sh`; ensure it passes locally before creating a pull request.

## 6. Pull Requests & Releases
1. **Fork → Branch → PR against `main`**.
2. Make sure `./scripts/check-all-the-things.sh` exits without errors.
3. After review, core maintainers will trigger full CI and (if applicable) publish to npm following semver derived from Conventional Commits.
## 7. Useful References


* Discord: <https://discord.gg/bDY8MKx>
* CONTRIBUTING guidelines: `CONTRIBUTING.md`
* Code of Conduct: `CODE_OF_CONDUCT.md`

Happy hacking, and remember: *If it compiles and the test suite passes, you're halfway there!*