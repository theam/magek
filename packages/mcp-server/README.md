# @magek/mcp-server

MCP server that enables AI coding assistants to build Magek applications. Provides documentation, CLI commands, and CQRS patterns to Claude Code, Codex CLI, and other MCP-compatible tools.

## Quick Start

**Claude Code:**
```bash
claude mcp add magek -- npx -y @magek/mcp-server
```

**Codex CLI** — add to `.codex/config.json`:
```json
{ "mcpServers": { "magek": { "command": "npx", "args": ["-y", "@magek/mcp-server"] } } }
```

**Other MCP tools** — add to your MCP configuration:
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

## What It Provides

- **Documentation** — All Magek docs available as MCP resources (`magek://docs/*`)
- **CLI Reference** — Complete scaffolding command reference (`magek://cli/reference`)
- **CQRS Flow Prompt** — Step-by-step guide for implementing features
- **Troubleshooting Prompt** — Common issues and solutions

## Documentation

Full documentation: [magek.ai/docs/getting-started/ai-coding-assistants](https://magek.ai/docs/getting-started/ai-coding-assistants)

## License

Apache-2.0
