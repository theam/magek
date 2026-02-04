#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')
// monorepoRoot is two levels up from packages/mcp-server
const monorepoRoot = join(packageRoot, '..', '..')
const sourceDocsDir = join(monorepoRoot, 'docs', 'content')
const targetDocsDir = join(packageRoot, 'docs')

function getAllMarkdownFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      getAllMarkdownFiles(fullPath, files)
    } else if (entry.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function extractTitle(content) {
  // Try to extract title from first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) {
    return h1Match[1].trim()
  }

  // Try to extract from frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*['"]?([^'"\n]+)['"]?[\s\S]*?---/m)
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim()
  }

  return null
}

function extractDescription(content) {
  // Remove frontmatter
  const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/m, '')

  // Find first paragraph after H1
  const lines = contentWithoutFrontmatter.split('\n')
  let foundH1 = false
  let description = ''

  for (const line of lines) {
    if (line.startsWith('# ')) {
      foundH1 = true
      continue
    }
    if (foundH1 && line.trim() && !line.startsWith('#')) {
      description = line.trim()
      break
    }
  }

  // Truncate to reasonable length
  if (description.length > 200) {
    description = description.substring(0, 197) + '...'
  }

  return description || null
}

function buildDocsIndex(sourceDir) {
  const files = getAllMarkdownFiles(sourceDir)
  const index = []

  for (const file of files) {
    const relativePath = relative(sourceDir, file)
    // Convert path to URI format (e.g., getting-started/installation.md -> getting-started/installation)
    const uri = relativePath.replace(/\.md$/, '').replace(/\\/g, '/')

    // Read file to extract metadata
    const content = readFileSync(file, 'utf-8')
    const title = extractTitle(content) || uri.split('/').pop()
    const description = extractDescription(content)

    index.push({
      uri: `magek://docs/${uri}`,
      path: relativePath.replace(/\\/g, '/'),
      title,
      description
    })
  }

  return index
}

console.log('Copying documentation files...')

// Clear target directory to remove stale files
if (existsSync(targetDocsDir)) {
  rmSync(targetDocsDir, { recursive: true })
}
mkdirSync(targetDocsDir, { recursive: true })

// Check if source docs exist
if (!existsSync(sourceDocsDir)) {
  console.log(`Warning: Source docs directory not found at ${sourceDocsDir}`)
  console.log('Creating empty docs directory for development')
  writeFileSync(join(targetDocsDir, 'docs-index.json'), JSON.stringify([], null, 2))
  process.exit(0)
}

// Copy all docs
cpSync(sourceDocsDir, targetDocsDir, { recursive: true })

// Build and write index
const docsIndex = buildDocsIndex(sourceDocsDir)
writeFileSync(join(targetDocsDir, 'docs-index.json'), JSON.stringify(docsIndex, null, 2))

console.log(`Copied ${docsIndex.length} documentation files`)
console.log('Generated docs-index.json')
