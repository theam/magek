# Magek Documentation Site

This package generates the static documentation site for the Magek Framework using TypeDoc.

## Overview

The documentation site combines:
- **API Reference**: Auto-generated from TypeScript source code using TypeDoc
- **Markdown Documentation**: Guides and tutorials from the `content/` folder
- **Package Documentation**: Coverage for core framework packages

## Directory Structure

```
docs/
├── content/                 # Markdown documentation
│   ├── index.md            # Main documentation index
│   ├── introduction.md     # Framework introduction
│   ├── architecture/       # Architecture concepts
│   ├── getting-started/    # Installation and tutorials
│   ├── features/           # Feature documentation
│   ├── security/           # Security guides
│   ├── advanced/           # Advanced topics
│   ├── magek-logo.svg      # Logo image
│   └── magek-arch.png      # Architecture diagram
├── custom-theme.mjs        # Custom TypeDoc theme
├── custom.css              # Custom styles
├── typedoc.json           # TypeDoc configuration
├── tsconfig.typedoc.json  # TypeScript configuration
└── package.json           # Package dependencies
```

## Building the Documentation

### Quick Start

From any directory in the repository:

```bash
# Build documentation
rush docs:build

# Build and serve locally
rush docs:serve
```

### From this directory

```bash
# Build only
rushx build

# Build and serve
rushx serve
```

The generated site will be output to `common/temp/docs-site/`.

## Adding Documentation

### Adding New Guides

1. Create a markdown file in the appropriate `content/` subdirectory
2. Add the file to the `children` list in `content/index.md`:

```yaml
---
title: "Documentation"
children:
  - ./introduction.md
  - ./getting-started/installation.md
  # ... add your new file here
---
```

3. Optionally add YAML frontmatter to your file:

```yaml
---
title: "Your Page Title"
---

# Your Content Here
```

### Adding Images

1. Place images in the `content/` directory (or subdirectories)
2. Reference them in markdown using relative paths:

```markdown
![Description](./image-name.png)
```

TypeDoc will automatically copy images to the output directory.

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

## Configuration

### typedoc.json

Key settings:
- **entryPoints**: Which packages to document (core, common, server, cli)
- **projectDocuments**: Points to `./content/index.md` as the documentation root
- **out**: Output directory `../common/temp/docs-site`
- **customCss**: Custom styling in `custom.css`
- **theme**: Uses the custom "magek" theme defined in `custom-theme.mjs`

### Custom Theme

The custom theme (`custom-theme.mjs`) reorganizes the navigation:
- Documents appear at the root level (not nested under "Documents")
- Documents are grouped by topic (Getting Started, Architecture, etc.)
- API documentation is wrapped under "Code Documentation"

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch via the GitHub Actions workflow `.github/workflows/docs-deploy.yml`.

**Documentation URL**: https://theam.github.io/magek/
