# NPM Publishing Setup Checklist

This checklist guides maintainers through the complete setup process for OIDC-based npm publishing.

## ✅ Repository Configuration (Completed)

- [x] Add `nextBump` field to `version-policies.json`
- [x] Create `common/changes/` directory
- [x] Add `rush change --verify` to CI pipeline
- [x] Create `publish.yml` workflow
- [x] Create `release.yml` workflow
- [x] Document `rush change` workflow in CONTRIBUTING.md
- [x] Create NPM_PUBLISHING.md guide

## 📦 NPM Configuration (To be done by maintainers)

### For Each of the 8 Packages:

- [ ] **@magek/cli**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access
  
- [ ] **create-magek**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

- [ ] **@magek/common**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

- [ ] **@magek/core**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public (mainProject for CHANGELOG)
  - [ ] Test publish access

- [ ] **@magek/server**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

- [ ] **@magek/adapter-event-store-nedb**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

- [ ] **@magek/adapter-read-model-store-nedb**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

- [ ] **@magek/adapter-session-store-nedb**
  - [ ] Configure trusted publisher on npmjs.com
  - [ ] Verify package is public
  - [ ] Test publish access

### Trusted Publisher Configuration

For each package above, on npmjs.com:

1. Go to Package Settings → Publishing Access → Trusted Publishers
2. Click "Add trusted publisher"
3. Enter:
   - **Organization or user**: `theam`
   - **Repository**: `magek`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: `npm-publish` (optional)
4. Save

## 🔐 GitHub Repository Settings (To be done by maintainers)

- [ ] Create `npm-publish` environment
  - [ ] Go to Settings → Environments
  - [ ] Create new environment named `npm-publish`
  - [ ] (Optional) Add protection rules:
    - [ ] Required reviewers
    - [ ] Deployment branches (only `main`)
    - [ ] Wait timer before deployment

## 🧪 Testing (To be done by maintainers)

- [ ] Test `rush change` workflow:
  ```bash
  # Make a small change to a package
  # Run rush change
  rush change
  # Verify change file is created in common/changes/
  ```

- [ ] Test version bump (dry-run):
  ```bash
  git checkout -b test-version-bump
  rush version --bump
  # Review the version changes
  git checkout main
  git branch -D test-version-bump
  ```

- [ ] Test publish workflow (dry-run):
  ```bash
  # Without --apply, it does a dry run
  rush publish --publish --include-all --set-access-level public
  ```

- [ ] Test actual workflow:
  - [ ] Create a test PR with a minor change
  - [ ] Run `rush change` and commit change files
  - [ ] Merge PR to main
  - [ ] Monitor the publish workflow in Actions tab
  - [ ] Verify packages are published on npmjs.com
  - [ ] Check provenance attestations are present

## 🔒 Security Hardening (To be done after successful test)

- [ ] Enable "Require trusted publishers" for each package on npmjs.com
- [ ] Revoke any existing automation tokens
- [ ] Ensure 2FA is enabled for all maintainers
- [ ] Review and audit package access permissions
- [ ] Set up npm organization 2FA requirement (if not already)

## 📚 Documentation

- [ ] Update main README.md with publishing information (if needed)
- [ ] Notify contributors about the new `rush change` requirement
- [ ] Add link to NPM_PUBLISHING.md in relevant documentation

## 🎯 Post-Setup Verification

- [ ] Verify GitHub Actions workflows are enabled
- [ ] Verify `npm-publish` environment is accessible
- [ ] Test manual release workflow (`release.yml`)
- [ ] Verify CHANGELOG.md generation works correctly
- [ ] Verify version tags are pushed correctly
- [ ] Monitor first few automated publishes

## 📞 Support Contacts

- **Repository**: https://github.com/theam/magek
- **npm Organization**: https://www.npmjs.com/org/magek
- **Discord**: https://discord.gg/bDY8MKx
- **Issues**: https://github.com/theam/magek/issues

## 📖 Additional Resources

- [NPM_PUBLISHING.md](./NPM_PUBLISHING.md) - Complete setup guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contributor guidelines
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
- [Rush Publishing Docs](https://rushjs.io/pages/maintainer/publishing/)

---

**Note**: This checklist should be completed by a repository maintainer with:
- Admin access to the GitHub repository
- Owner/admin access to all npm packages
- Familiarity with GitHub Actions and npm publishing workflows
