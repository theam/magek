---
title: "Framework Packages"
group: "Advanced"
---

# Framework Packages

Magek is organized as a monorepo with these packages:

## Core Packages

### @magek/core

The event sourcing engine with CQRS patterns, GraphQL generation, and decorators. This is the main package that powers Magek applications.

```bash
npm install @magek/core
```

### @magek/common

Shared types, utilities, and helper functions used across the framework. Includes essential helpers like:

- `evolve()` - Immutable state updates for entities and read models
- `UUID` - Unique identifier generation
- `createInstance()` - Instantiate classes from raw objects

```bash
npm install @magek/common
```

## Development Tools

### @magek/cli

Command-line tool for scaffolding projects, generating components, and running the development server.

```bash
# Generate new components
npx magek new:command CreateProduct
npx magek new:event ProductCreated
npx magek new:entity Product
npx magek new:read-model ProductReadModel

# Start development server
npx magek start
```

### @magek/server

Fastify-based runtime for local development. Provides:

- Hot reloading
- GraphQL playground
- Local event store and read model storage

### create-magek

Project scaffolding tool for creating new Magek applications with a single command.

```bash
npx create-magek my-app
cd my-app
npm install
npx magek start
```

## Storage Adapters

Adapters provide pluggable storage backends for Magek applications. The NeDB adapters are used for local development.

### @magek/adapter-event-store-nedb

NeDB-based event store adapter. Stores events in a local file-based database, ideal for development and testing.

```bash
npm install @magek/adapter-event-store-nedb
```

### @magek/adapter-read-model-store-nedb

NeDB-based read model store adapter. Stores read model projections locally.

```bash
npm install @magek/adapter-read-model-store-nedb
```

### @magek/adapter-session-store-nedb

NeDB-based session store adapter. Manages WebSocket connections and subscriptions for real-time features.

```bash
npm install @magek/adapter-session-store-nedb
```

## AI Integration

### @magek/mcp-server

Model Context Protocol (MCP) server that provides documentation, CLI reference, and guided prompts for AI coding assistants. Use this to integrate Magek knowledge into your AI-powered development workflow.

```bash
npx @magek/mcp-server
```

Features:
- Documentation resources accessible via MCP
- CQRS implementation guide prompt
- Troubleshooting assistance prompt
- CLI command reference
