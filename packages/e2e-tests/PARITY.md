# E2E Parity Checklist

Use this checklist to ensure the TypeScript/Mocha E2E suite covers all legacy bash phases.

## Phase 1: Verdaccio + Publish

- [x] Start Verdaccio with the local config
- [x] Configure Rush `.npmrc` and `.npmrc-publish` for the local registry
- [x] `rush update`
- [x] `rush install` (purge omitted to avoid cross-device recycler issues in Docker layers)
- [x] `rush rebuild`
- [x] `rush publish --apply --publish --include-all --registry <local>`

## Phase 2: App Scaffold

- [x] Verify `create-magek` is available from the local registry
- [x] `npm create magek@latest <app>` using the local template
- [x] App directory created successfully

## Phase 3: Scaffold Validation

- [x] `.git` initialized
- [x] `node_modules` exists and is not empty
- [x] `@magek/cli` is installed
- [x] `npm run --silent` works
- [x] `package.json`, `tsconfig.json`, `src/index.ts` exist
- [x] `package.json` name matches the scaffolded app name

## Phase 4: Server Health

- [x] `npm install` from local registry
- [x] `npm run build`
- [x] Start server with NeDB adapters
- [x] Health endpoint responds with non-empty payload

## Phase 5: Bank Deposit Flow

- [x] Copy bank-deposit fixtures into the app
- [x] Export domain types from `src/index.ts`
- [x] Rebuild and start server
- [x] Execute `DepositMoney` mutation (no errors)
- [x] Query `AccountBalance` read model and verify balance
- [x] Verify NeDB event/read-model storage (if DB files exist)
- [x] Exercise subscription endpoint (non-fatal if it ends early)
- [x] Execute second deposit and verify updated balance

## Additional Coverage

- [x] GraphQL mutation returns data for command
- [x] Event/read-model data contains account id when available
