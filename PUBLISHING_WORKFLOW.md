# Publishing Workflow Overview

This document provides a high-level overview of the npm publishing workflow for Magek.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Make Changes    │
                    │  to Packages     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Run              │
                    │  rush change      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Commit Changes  │
                    │  & Change Files  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Create PR       │
                    └────────┬─────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                            │  CI Checks                  │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Lint Workflow   │                  │
│                   │  - Build         │                  │
│                   │  - Verify Changes│                  │
│                   │  - Lint Check    │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Test Workflow   │                  │
│                   │  - Unit Tests    │                  │
│                   │  - E2E Tests     │                  │
│                   └────────┬─────────┘                  │
└────────────────────────────┼────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  PR Approved &   │
                    │  Merged to main  │
                    └────────┬─────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                            │  Publish Workflow           │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Checkout Code   │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Setup Node.js   │                  │
│                   │  & OIDC Auth     │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Install & Build │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Run Tests       │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  rush version    │                  │
│                   │  --bump          │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  rush publish    │                  │
│                   │  (with OIDC)     │                  │
│                   └────────┬─────────┘                  │
│                            │                             │
│                            ▼                             │
│                   ┌──────────────────┐                  │
│                   │  Push Tags &     │                  │
│                   │  Version Commits │                  │
│                   └────────┬─────────┘                  │
└────────────────────────────┼────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Packages        │
                    │  Published       │
                    │  on npmjs.com    │
                    └──────────────────┘
```

## Key Components

### 1. Change Files (`common/changes/`)
- Generated by `rush change` command
- Track changes per package
- Determine version bump type
- Generate CHANGELOG entries

### 2. Version Policy (`version-policies.json`)
- Lock-step versioning for all packages
- Current version: 0.0.1
- Next bump: patch
- Main project: @magek/core

### 3. CI Workflows

#### Lint Workflow (`wf_check-lint.yml`)
- Runs on: Pull requests
- Verifies: Change files exist
- Checks: Linting rules

#### Publish Workflow (`publish.yml`)
- Runs on: Push to main, releases, manual trigger
- Uses: OIDC authentication
- Publishes: All 8 packages
- Creates: Provenance attestations

#### Release Workflow (`release.yml`)
- Runs on: Manual trigger
- Purpose: Hotfix releases
- Allows: Specific version override

### 4. OIDC Authentication
- No long-lived tokens stored
- Short-lived credentials per workflow run
- Non-extractable tokens
- Automatic provenance generation

## Version Bump Strategy

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat!:` or `BREAKING CHANGE:` | major (x.0.0) | Remove deprecated API |
| `feat:` | minor (0.x.0) | Add new feature |
| `fix:`, `perf:`, `refactor:` | patch (0.0.x) | Bug fixes |

## Security Features

1. **OIDC Authentication**: No tokens in repository
2. **Provenance**: Automatic attestations for packages
3. **Environment Protection**: Optional review gates
4. **Trusted Publishers**: Prevents unauthorized publishing
5. **2FA Requirement**: For maintainer accounts

## Package List

All packages use lock-step versioning:

1. @magek/cli
2. create-magek
3. @magek/common
4. @magek/core (main project)
5. @magek/server
6. @magek/adapter-event-store-nedb
7. @magek/adapter-read-model-store-nedb
8. @magek/adapter-session-store-nedb

## Quick Reference

### For Contributors
```bash
# After making changes
rush change

# Commit everything
git add .
git commit -m "feat: add new feature"

# Create PR
```

### For Maintainers
```bash
# Test version bump (dry-run)
git checkout -b test
rush version --bump
git checkout main && git branch -D test

# Test publish (dry-run)
rush publish --publish --include-all --set-access-level public
```

## Related Documentation

- [NPM_PUBLISHING.md](./NPM_PUBLISHING.md) - Complete setup guide
- [NPM_PUBLISHING_CHECKLIST.md](./NPM_PUBLISHING_CHECKLIST.md) - Setup checklist
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contributor guidelines

## Support

- **Issues**: https://github.com/theam/magek/issues
- **Discussions**: https://github.com/theam/magek/discussions
- **Discord**: https://discord.gg/bDY8MKx
