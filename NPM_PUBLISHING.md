# NPM Publishing Setup Guide

This guide explains how Magek uses OIDC-based trusted publishers for secure, automated npm publishing.

## Overview

Magek uses **OIDC (OpenID Connect) authentication** for publishing packages to npm, following the [npm trusted publishers documentation](https://docs.npmjs.com/trusted-publishers) and Open Source Security Foundation recommendations.

### Benefits

- **No long-lived secrets**: Each publish uses short-lived, cryptographically-signed credentials
- **Non-extractable tokens**: Tokens cannot be extracted or reused outside the workflow
- **Automatic provenance**: Provenance attestations generate automatically for public packages
- **Industry standard**: Follows OSSF best practices

## Publishable Packages

The following 8 packages are configured for publishing:

1. `@magek/cli` - Command-line tool
2. `create-magek` - Project scaffolding tool
3. `@magek/common` - Shared types and utilities
4. `@magek/core` - Core framework logic
5. `@magek/server` - Server runtime
6. `@magek/adapter-event-store-nedb` - NeDB event store adapter
7. `@magek/adapter-read-model-store-nedb` - NeDB read model store adapter
8. `@magek/adapter-session-store-nedb` - NeDB session store adapter

## Prerequisites for Publishing

### 1. npm CLI Version

Ensure **npm CLI 11.5.1+** is installed for OIDC support:

```bash
npm install -g npm@latest
npm --version  # Should be 11.5.1 or higher
```

### 2. Configure Trusted Publishers on npmjs.com

**IMPORTANT**: This must be done by a package maintainer with admin access.

For each of the 8 packages above:

1. Log in to [npmjs.com](https://npmjs.com)
2. Navigate to the package (e.g., `@magek/cli`)
3. Go to **Package Settings → Publishing Access → Trusted Publishers**
4. Click **"Add trusted publisher"**
5. Fill in the following details:

   | Field | Value |
   |-------|-------|
   | Organization or user | `theam` |
   | Repository | `magek` |
   | Workflow filename | `publish.yml` |
   | Environment name | `npm-publish` (optional but recommended) |

6. Save the configuration

Repeat this for all 8 packages.

### 3. Enable Protection (Optional but Recommended)

Once trusted publishers are configured:

1. Go to each package's settings on npmjs.com
2. Under **Publishing Access**, select **"Require trusted publishers"**
3. This prevents publishing via traditional tokens
4. Revoke any existing automation tokens
5. Ensure 2FA is enabled for your npm account

## Version Management Strategy

### Using Conventional Commits

Version bumps are determined by commit messages following [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Prefix | Version Bump | Example |
|---------------|--------------|---------|
| `feat!:` or `BREAKING CHANGE:` | **major** (x.0.0) | `feat!: remove deprecated API` |
| `feat:` | **minor** (0.x.0) | `feat: add new GraphQL resolver` |
| `fix:`, `perf:`, `refactor:` | **patch** (0.0.x) | `fix: correct event handler registration` |

### Rush Change Workflow

Before submitting a PR that modifies package code:

1. Run `rush change` after committing your changes
2. Rush will prompt you for each changed package
3. Select the appropriate change type (major, minor, patch, or none)
4. Provide a description (appears in CHANGELOG)
5. Commit the generated change files:

   ```bash
   git add common/changes/
   git commit -m "chore: add change files"
   ```

The CI pipeline verifies change files exist via `rush change --verify`.

## Publishing Workflows

### Automated Publishing (`publish.yml`)

Triggers on:
- Push to `main` branch (after PR merge)
- GitHub release creation
- Manual dispatch

The workflow:
1. Checks out code with full history
2. Sets up Node.js 22 with npm registry
3. Configures OIDC authentication
4. Installs dependencies and builds
5. Runs tests
6. Bumps versions using `rush version --bump`
7. Publishes all packages with provenance
8. Pushes version commits and tags back to main

### Manual Hotfix Releases (`release.yml`)

For releasing specific versions (e.g., hotfixes on older versions):

1. Go to **Actions → Create Release**
2. Click **"Run workflow"**
3. Enter the version (e.g., `1.2.3`)
4. Select bump type (patch or minor)
5. The workflow publishes and creates a GitHub Release

**Note**: This workflow uses `--override-version` which bypasses the normal change file workflow. This is intentional for emergency hotfix scenarios but means the changelog must be managed manually for these releases. For standard releases, use the automated `publish.yml` workflow.

## Testing Before Publishing

### Dry-run Mode

To test publishing without actually publishing:

```bash
rush publish --publish --include-all --set-access-level public
# Note: Without --apply, this does a dry run
```

### Local Version Bump Test

```bash
git checkout -b test-version-bump
rush version --bump
# Review the changes
git checkout main
git branch -D test-version-bump
```

## Troubleshooting

### OIDC Token Not Available

**Error**: `Unable to get OIDC token`

**Solution**: Ensure the workflow has `id-token: write` permission and uses the `npm-publish` environment.

### Provenance Generation Failed

**Error**: `Provenance generation failed`

**Solution**: 
- Ensure `NPM_CONFIG_PROVENANCE: true` is set
- Verify npm CLI version is 11.5.1+
- Check that packages are public (provenance requires public packages)

### Version Bump Issues

**Error**: `No change files found`

**Solution**: 
- Run `rush change` before merging PRs
- Ensure change files are committed in `common/changes/`
- Verify packages are in the `magek` version policy

### Publishing Fails with "Forbidden"

**Solution**:
- Verify trusted publishers are configured on npmjs.com
- Check that workflow uses correct repository name (`theam/magek`)
- Ensure package names match exactly on npm

## Security Considerations

1. **Never commit npm tokens** to the repository
2. **Enable 2FA** on npm accounts with publish access
3. **Require trusted publishers** once OIDC is configured
4. **Review the npm-publish environment** protection rules in GitHub
5. **Audit package access** regularly on npmjs.com

## CI/CD Pipeline Integration

### Change File Verification

The lint workflow (`wf_check-lint.yml`) includes:

```yaml
- name: Verify change files
  uses: ./.github/actions/call-rush
  with:
    command: 'change --verify'
```

This ensures PRs have appropriate change files before merging.

## Version Policy Configuration

Located in `common/config/rush/version-policies.json`:

```json
{
  "definitionName": "lockStepVersion",
  "policyName": "magek",
  "mainProject": "@magek/core",
  "version": "0.0.1",
  "nextBump": "patch"
}
```

- **lockStepVersion**: All packages share the same version
- **mainProject**: Changelog is stored with `@magek/core`
- **nextBump**: Default bump type for the next release

## Additional Resources

- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers)
- [Rush Publishing Documentation](https://rushjs.io/pages/maintainer/publishing/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## Support

For questions or issues with publishing:
- Check [GitHub Discussions](https://github.com/theam/magek/discussions)
- Review [open issues](https://github.com/theam/magek/issues)
- Contact maintainers via Discord: https://discord.gg/bDY8MKx
