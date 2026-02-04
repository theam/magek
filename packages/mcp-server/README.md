# @magek/mcp-server

MCP (Model Context Protocol) server for Magek documentation and CLI reference. This server enables AI assistants like Claude to access Magek documentation, CLI commands, and best practices.

## Installation

```bash
npm install -g @magek/mcp-server
```

Or use directly with npx:

```bash
npx @magek/mcp-server
```

## Configuration

### Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "magek": {
      "command": "npx",
      "args": ["-y", "@magek/mcp-server"]
    }
  }
}
```

### Custom Documentation Path

You can point to a custom documentation directory:

```json
{
  "mcpServers": {
    "magek": {
      "command": "npx",
      "args": ["-y", "@magek/mcp-server"],
      "env": {
        "MAGEK_DOCS_PATH": "./docs/content"
      }
    }
  }
}
```

## Resources

The MCP server provides the following resources:

### Documentation Resources

All Magek documentation is available via `magek://docs/*` URIs:

| URI | Description |
|-----|-------------|
| `magek://docs/index` | JSON index of all documentation topics |
| `magek://docs/introduction` | Introduction to Magek |
| `magek://docs/getting-started/installation` | Installation guide |
| `magek://docs/getting-started/coding` | Coding guide |
| `magek://docs/architecture/command` | Commands documentation |
| `magek://docs/architecture/event` | Events documentation |
| `magek://docs/architecture/entity` | Entities documentation |
| `magek://docs/architecture/read-model` | Read Models documentation |
| `magek://docs/architecture/event-handler` | Event Handlers documentation |
| `magek://docs/security/authorization` | Authorization guide |
| `magek://docs/security/authentication` | Authentication guide |

### CLI Reference

| URI | Description |
|-----|-------------|
| `magek://cli/reference` | Complete CLI command reference |

## Prompts

The MCP server provides helpful prompts for common tasks:

### `magek_cqrs_flow`

Complete guide for implementing a feature end-to-end using Magek's CQRS pattern.

**Arguments:**
- `feature` (required): Feature description (e.g., "Create Product", "User Registration")

**Usage:**
```
Use prompt: magek_cqrs_flow with feature="Create Product"
```

### `magek_troubleshoot`

Common issues and solutions for Magek development.

**Arguments:**
- `issue` (optional): Specific issue description

**Usage:**
```
Use prompt: magek_troubleshoot
Use prompt: magek_troubleshoot with issue="GraphQL schema not updating"
```

## Development

### Building

```bash
cd packages/mcp-server
rushx build
```

### Bundling Documentation

Documentation is bundled from `docs/content/` during the CI publish workflow. For local testing with bundled docs:

```bash
cd packages/mcp-server
npm run bundle-docs
```

### Testing Locally

Run the server directly:

```bash
node dist/index.js
```

Test with MCP inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

For local development without bundled docs, point to the monorepo docs:

```bash
MAGEK_DOCS_PATH=../../docs/content node dist/index.js
```

## License

Apache-2.0
