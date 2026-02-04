---
title: "AI Coding Assistants"
group: "Getting Started"
---

# AI Coding Assistants

Magek provides an MCP (Model Context Protocol) server that enables AI coding assistants like **Claude Code** and **Codex CLI** to understand and work with Magek projects. This gives your AI assistant access to Magek documentation, CLI commands, and best practices — so it can help you build event-sourced applications faster.

## Quick Start

### Claude Code

Add Magek to Claude Code with a single command:

```bash
claude mcp add magek -- npx -y @magek/mcp-server
```

That's it! Claude Code now has access to Magek documentation and can help you scaffold commands, events, entities, and read models.

### Codex CLI

Add to your project's `.codex/config.json`:

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

### Manual Configuration

For other MCP-compatible tools, add to your configuration:

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

## What Your AI Assistant Can Do

Once configured, your AI coding assistant can:

### Access Documentation

The MCP server provides all Magek documentation as resources. Your assistant can read about:

- Commands, Events, Entities, and Read Models
- Authentication and Authorization
- Event Handlers and Scheduled Commands
- Advanced topics like Data Migrations and Testing

### Use CLI Commands

Your assistant knows all Magek CLI scaffolding commands and can execute them for you:

```bash
# Create a command
npx magek new:command CreateProduct --fields sku:string price:number

# Create an event
npx magek new:event ProductCreated --fields productId:UUID sku:string price:number

# Create an entity
npx magek new:entity Product --fields sku:string price:number --reduces ProductCreated

# Create a read model
npx magek new:read-model ProductReadModel --fields sku:string price:number --projects Product:id
```

### Follow CQRS Patterns

The MCP server includes a CQRS flow prompt that guides your assistant through implementing complete features:

1. **Command** → User intent (e.g., `CreateProduct`)
2. **Event** → Immutable fact (e.g., `ProductCreated`)
3. **Entity** → State reducer (e.g., `Product`)
4. **Read Model** → Query access (e.g., `ProductReadModel`)

### Troubleshoot Issues

The troubleshooting prompt helps your assistant diagnose common issues:

- GraphQL schema not updating
- Events not being reduced
- Authorization errors
- Entity not found errors

## Available Resources

| Resource | Description |
|----------|-------------|
| `magek://docs/index` | Index of all documentation topics |
| `magek://docs/introduction` | Introduction to Magek |
| `magek://docs/getting-started/*` | Installation and coding guides |
| `magek://docs/architecture/*` | Commands, Events, Entities, Read Models |
| `magek://docs/security/*` | Authentication and Authorization |
| `magek://docs/features/*` | Error handling, Logging, Scheduling |
| `magek://docs/advanced/*` | Testing, Migrations, Configuration |
| `magek://cli/reference` | Complete CLI command reference |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `magek_cqrs_flow` | Step-by-step guide for implementing a feature |
| `magek_troubleshoot` | Common issues and solutions |

## Example Conversation

Here's how you might interact with your AI assistant:

> **You:** Create a user registration feature for my Magek app
>
> **Assistant:** I'll help you implement user registration using Magek's CQRS pattern. Let me create the command, event, entity, and read model...
>
> ```bash
> npx magek new:command RegisterUser --fields email:string password:string name:string
> npx magek new:event UserRegistered --fields userId:UUID email:string name:string
> npx magek new:entity User --fields email:string name:string --reduces UserRegistered
> npx magek new:read-model UserReadModel --fields email:string name:string --projects User:id
> ```

## Custom Documentation Path

If you're developing Magek itself or want to use local documentation:

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

## Troubleshooting

### MCP Server Not Found

Make sure you have Node.js 22+ installed:

```bash
node -v
# Should output v22.x.x or higher
```

### Documentation Not Loading

The MCP server bundles documentation from the published package. If you need the latest docs, update the package:

```bash
npx -y @magek/mcp-server@latest
```

### Claude Code Can't Find Magek

Verify the MCP server is configured:

```bash
claude mcp list
```

You should see `magek` in the list of configured servers.
