#!/usr/bin/env node

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMagekServer } from './server.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Resolve docs path - first check env var, then use bundled docs
function resolveDocsPath(): string {
  if (process.env.MAGEK_DOCS_PATH) {
    return process.env.MAGEK_DOCS_PATH
  }

  // When installed as a package, docs are in dist/../docs
  const bundledDocsPath = join(__dirname, '..', 'docs')

  return bundledDocsPath
}

async function main() {
  const docsPath = resolveDocsPath()

  const server = createMagekServer({ docsPath })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Failed to start Magek MCP server:', error)
  process.exit(1)
})
