# Plan: Remove Effect.js from Magek Repository

## Overview

Remove all Effect.js dependencies (`effect`, `@effect/*`, `@effect-ts/*`) from the repository and replace with vanilla TypeScript and Promises.

## Summary of Affected Packages

| Package | Effect Packages | Files to Refactor |
|---------|-----------------|-------------------|
| @magek/cli | `effect@3.17.6` | 12 source + 8 test files |
| @magek/core | `effect@3.17.6` + 11 @effect/* packages | 2 source files |
| @magek/common | `effect@3.17.6` | 0 files (unused dependency) |
| @magek/server | `@effect-ts/core@0.60.5` | 0 files (unused dependency) |
| @magek/server-infrastructure | `@effect-ts/core@0.60.5` | 0 files (unused dependency) |

---

## Phase 1: Remove Unused Dependencies (Quick Wins)

These packages have Effect listed as a dependency but don't actually import it in any source files:

### Step 1.1: @magek/common
- **File:** `packages/common/package.json`
- **Action:** Remove `"effect": "3.17.6"` from dependencies
- **Risk:** None - no imports found

### Step 1.2: @magek/server
- **File:** `packages/server/package.json`
- **Action:** Remove `"@effect-ts/core": "0.60.5"` from dependencies
- **Risk:** None - no imports found

### Step 1.3: @magek/server-infrastructure
- **File:** `packages/server-infrastructure/package.json`
- **Action:** Remove `"@effect-ts/core": "0.60.5"` from dependencies
- **Risk:** None - no imports found

---

## Phase 2: Refactor @magek/cli Services (Bottom-Up)

The CLI package uses Effect for dependency injection and error handling. We'll refactor bottom-up, starting with leaf services.

### Step 2.1: Refactor ProcessService

**Files to modify:**
1. `packages/cli/src/services/process/index.ts`
2. `packages/cli/src/services/process/live.impl.ts`
3. `packages/cli/test/services/process/live.test.ts`

**Changes:**
- Convert `ProcessService` interface methods from `Effect.Effect<T, E>` to `Promise<T>` (throwing on error)
- Remove `Context.GenericTag` - export interface and implementation directly
- Replace `Effect.tryPromise` with async/await + try-catch
- Replace `Effect.try` with simple try-catch
- Keep `ProcessError` class for error typing (optional)

**Current:**
```typescript
export interface ProcessService {
  readonly exec: (command: string, cwd?: string) => Effect.Effect<string, ProcessError>
  readonly cwd: () => Effect.Effect<string, ProcessError>
}
export const ProcessService = Context.GenericTag<ProcessService>('ProcessService')
```

**Target:**
```typescript
export interface ProcessService {
  exec(command: string, cwd?: string): Promise<string>
  cwd(): string // sync, no need for Promise
}
export function createProcessService(): ProcessService { ... }
```

### Step 2.2: Refactor FileSystemService

**Files to modify:**
1. `packages/cli/src/services/file-system/index.ts`
2. `packages/cli/src/services/file-system/live.impl.ts`
3. `packages/cli/test/services/file-system/live.test.ts`

**Changes:**
- Convert methods from `Effect.Effect<T, E>` to `Promise<T>`
- Remove `Context.GenericTag`
- Replace `Effect.tryPromise` with async/await + try-catch
- Replace `Layer.succeed` with simple factory function

### Step 2.3: Refactor PackageManagerService (Common)

**Files to modify:**
1. `packages/cli/src/services/package-manager/index.ts`
2. `packages/cli/src/services/package-manager/common.ts`

**Changes:**
- Remove `Context.GenericTag` from index.ts
- Convert interface methods from `Effect.Effect<T, E>` to `Promise<T>`
- Replace `Effect.gen` + `yield*` with async/await
- Replace `Ref.make` and `Ref.updateAndGet` with class fields or closure variables
- Replace `pipe` + `Effect.mapError` with try-catch + error transformation

### Step 2.4: Refactor Package Manager Implementations

**Files to modify:**
1. `packages/cli/src/services/package-manager/npm.impl.ts`
2. `packages/cli/src/services/package-manager/pnpm.impl.ts`
3. `packages/cli/src/services/package-manager/yarn.impl.ts`
4. `packages/cli/src/services/package-manager/rush.impl.ts`

**Changes:**
- Replace `Layer.effect` with async factory function
- Replace `Effect.orDie` with direct implementation (throw on error)
- Convert Effect generators to async/await

### Step 2.5: Refactor PackageManager Live Implementation

**File to modify:**
- `packages/cli/src/services/package-manager/live.impl.ts`

**Changes:**
- Replace `Layer.provide` and `Layer.merge` with explicit dependency injection
- Create a factory function that constructs the service with its dependencies
- Replace `Effect.gen` with async function

**Current:**
```typescript
const livePackageManagerLayer = Layer.provide(
  inferredPackageManagerLayer,
  Layer.merge(LiveFileSystem, LiveProcess)
)
```

**Target:**
```typescript
export async function createPackageManager(): Promise<PackageManagerService> {
  const processService = createProcessService()
  const fileSystemService = createFileSystemService()
  return inferPackageManager(processService, fileSystemService)
}
```

### Step 2.6: Refactor Config Service

**File to modify:**
- `packages/cli/src/services/config-service.ts`

**Changes:**
- Replace `Effect.runPromise` with direct async calls
- Replace `pipe` chains with sequential await statements
- Pass dependencies explicitly instead of using Effect.provide

---

## Phase 3: Refactor CLI Test Infrastructure

### Step 3.1: Refactor Test Helper

**File to modify:**
- `packages/cli/test/helpers/effect.ts`

**Changes:**
- Remove Effect-based `fakeService` helper
- Create simple mock factory functions using Sinon spies directly
- Remove Layer types

### Step 3.2: Update All Test Files

**Files to modify:**
1. `packages/cli/test/services/process/live.test.ts`
2. `packages/cli/test/services/file-system/live.test.ts`
3. `packages/cli/test/services/package-manager/live.test.ts`
4. `packages/cli/test/services/package-manager/npm.test.ts`
5. `packages/cli/test/services/package-manager/pnpm.test.ts`
6. `packages/cli/test/services/package-manager/yarn.test.ts`
7. `packages/cli/test/services/package-manager/rush.test.ts`

**Changes:**
- Replace `Effect.runPromise` with direct async test patterns
- Replace `Effect.provide` with direct dependency injection
- Update mock creation to use simple factory functions

---

## Phase 4: Refactor @magek/core Injectable System

### Step 4.1: Refactor Injectable Module

**File to modify:**
- `packages/core/src/injectable/index.ts`

**Changes:**
- Replace `@effect/cli` Command type with oclif command pattern
- Remove Effect types from the interface
- Create a simpler interface for injectable CLI commands

**Current:**
```typescript
export interface Injectable {
  commands: readonly [Command, ...Array<Command>]
  runMain?: RunMain
  contextProvider?: Layer.Layer<CliApp.CliApp.Environment, never, never>
}
```

**Target (using oclif pattern):**
```typescript
export interface Injectable {
  commands: Record<string, typeof import('@oclif/core').Command>
}
```

### Step 4.2: Refactor Magek.start() CLI Integration

**File to modify:**
- `packages/core/src/magek.ts`

**Changes:**
- Remove Effect imports (`Effect`, `pipe` from 'effect')
- Remove @effect/cli imports (`Command`)
- Remove @effect/platform-node imports (`NodeContext`, `NodeRuntime`)
- Reimplement CLI command execution using oclif pattern
- Lines 72-95: Replace Effect-based CLI runner with oclif execution

---

## Phase 5: Remove Effect Dependencies from package.json Files

### Step 5.1: @magek/cli
**File:** `packages/cli/package.json`
**Remove:**
```json
"effect": "3.17.6"
```

### Step 5.2: @magek/core
**File:** `packages/core/package.json`
**Remove all Effect packages:**
```json
"effect": "3.17.6",
"@effect/platform-node": "0.88.3",
"@effect/platform": "^0.87.13",
"@effect/cluster": "0.41.18",
"@effect/workflow": "0.4.14",
"@effect/rpc": "0.64.14",
"@effect/sql": "0.40.14",
"@effect/experimental": "0.51.14",
"@effect/cli": "~0.66.13",
"@effect/printer": "~0.44.13",
"@effect/printer-ansi": "~0.44.13",
"@effect/typeclass": "~0.35.13"
```

---

## Phase 6: Final Verification

### Step 6.1: Run Full Build
```bash
rush rebuild
```

### Step 6.2: Run All Tests
```bash
rush test
```

### Step 6.3: Run Linting
```bash
rush lint:check
```

### Step 6.4: Verify No Effect Imports Remain
```bash
grep -r "@effect" packages/ adapters/ --include="*.ts" --exclude-dir=node_modules
grep -r "from 'effect'" packages/ adapters/ --include="*.ts" --exclude-dir=node_modules
grep -r 'from "effect"' packages/ adapters/ --include="*.ts" --exclude-dir=node_modules
```

---

## Complete File List (Execution Order)

| # | File | Phase | Action |
|---|------|-------|--------|
| 1 | `packages/common/package.json` | 1.1 | Remove effect dependency |
| 2 | `packages/server/package.json` | 1.2 | Remove @effect-ts/core dependency |
| 3 | `packages/server-infrastructure/package.json` | 1.3 | Remove @effect-ts/core dependency |
| 4 | `packages/cli/src/services/process/index.ts` | 2.1 | Convert to Promise-based |
| 5 | `packages/cli/src/services/process/live.impl.ts` | 2.1 | Convert to async/await |
| 6 | `packages/cli/src/services/file-system/index.ts` | 2.2 | Convert to Promise-based |
| 7 | `packages/cli/src/services/file-system/live.impl.ts` | 2.2 | Convert to async/await |
| 8 | `packages/cli/src/services/package-manager/index.ts` | 2.3 | Convert to Promise-based |
| 9 | `packages/cli/src/services/package-manager/common.ts` | 2.3 | Convert to async/await |
| 10 | `packages/cli/src/services/package-manager/npm.impl.ts` | 2.4 | Convert to factory function |
| 11 | `packages/cli/src/services/package-manager/pnpm.impl.ts` | 2.4 | Convert to factory function |
| 12 | `packages/cli/src/services/package-manager/yarn.impl.ts` | 2.4 | Convert to factory function |
| 13 | `packages/cli/src/services/package-manager/rush.impl.ts` | 2.4 | Convert to factory function |
| 14 | `packages/cli/src/services/package-manager/live.impl.ts` | 2.5 | Replace Layer composition |
| 15 | `packages/cli/src/services/config-service.ts` | 2.6 | Remove Effect.runPromise |
| 16 | `packages/cli/test/helpers/effect.ts` | 3.1 | Replace or remove |
| 17 | `packages/cli/test/services/process/live.test.ts` | 3.2 | Update tests |
| 18 | `packages/cli/test/services/file-system/live.test.ts` | 3.2 | Update tests |
| 19 | `packages/cli/test/services/package-manager/live.test.ts` | 3.2 | Update tests |
| 20 | `packages/cli/test/services/package-manager/npm.test.ts` | 3.2 | Update tests |
| 21 | `packages/cli/test/services/package-manager/pnpm.test.ts` | 3.2 | Update tests |
| 22 | `packages/cli/test/services/package-manager/yarn.test.ts` | 3.2 | Update tests |
| 23 | `packages/cli/test/services/package-manager/rush.test.ts` | 3.2 | Update tests |
| 24 | `packages/core/src/injectable/index.ts` | 4.1 | Replace with oclif pattern |
| 25 | `packages/core/src/magek.ts` | 4.2 | Remove Effect CLI runner |
| 26 | `packages/cli/package.json` | 5.1 | Remove effect dependency |
| 27 | `packages/core/package.json` | 5.2 | Remove all Effect packages |

---

## Notes

- **Testing after each phase:** Run `rush build && rush test` after completing each phase to catch issues early
- **Dependency injection pattern:** Replace Effect's Layer/Context with explicit constructor/factory injection
- **Error handling:** Keep custom error classes (ProcessError, FileSystemError, etc.) but throw them directly instead of wrapping in Effect.fail()
- **oclif integration:** The @magek/cli package already uses oclif, so the Injectable pattern in @magek/core should align with oclif's command structure
