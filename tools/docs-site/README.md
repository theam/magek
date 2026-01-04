# Magek Documentation Site

This package generates the static documentation site for the Magek Framework using TypeDoc.

## Overview

The documentation site combines:
- **API Reference**: Auto-generated from TypeScript source code using TypeDoc
- **Markdown Documentation**: Includes the README and all files from the `/docs` folder
- **Package Documentation**: Coverage for core framework packages

## Building the Documentation

### Local Build

From the repository root:

```bash
rush docs:build
```

The generated site will be output to `common/temp/docs-site/`.

### Viewing Locally

After building, you can serve the documentation locally:

```bash
# Using Python
python3 -m http.server 8000 --directory common/temp/docs-site

# Using Node.js http-server (install globally first)
npx http-server common/temp/docs-site -p 8000
```

Then open http://localhost:8000 in your browser.

## Configuration

The documentation is configured in `typedoc.json`. Key settings include:

- **Entry Points**: Which packages to document (core, common, server, cli)
- **Output Directory**: `common/temp/docs-site` (excluded from git)
- **Plugins**: TypeDoc plugins for enhanced functionality
- **Navigation**: Links to GitHub and the main site

## Included Packages

The following packages are documented:
- `@magek/core` - Core framework functionality
- `@magek/common` - Common utilities and helpers
- `@magek/server` - Fastify-based server runtime
- `@magek/cli` - Command-line interface

## Adding Documentation

### TSDoc Comments

Add documentation to your code using TSDoc:

```typescript
/**
 * Creates a new command handler
 * @param config - Configuration options
 * @returns A configured command handler
 * @example
 * ```typescript
 * const handler = createCommandHandler({ ... });
 * ```
 */
export function createCommandHandler(config: Config): Handler {
  // ...
}
```

### Markdown Files

Additional documentation files in `/docs` are automatically included in the site.

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch via the GitHub Actions workflow `.github/workflows/docs-deploy.yml`.

### Initial Setup (Repository Administrator)

After the first merge, a repository administrator must configure GitHub Pages:

1. Navigate to: https://github.com/theam/magek/settings/pages
2. Under "Build and deployment":
   - Source: Select **"GitHub Actions"**
   - Save the settings

Once configured, the documentation will be automatically deployed on every push to `main`.

**Documentation URL**: https://theam.github.io/magek/

## Troubleshooting

### Missing Types

If TypeDoc reports missing types, ensure all packages are built first:

```bash
rush rebuild
```

### Plugin Issues

If you encounter plugin errors, try cleaning and rebuilding:

```bash
rushx clean
rush update
rush docs:build
```
