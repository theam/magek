import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface DocumentInfo {
  uri: string
  path: string
  title: string
  description: string | null
}

export interface DocsIndex {
  documents: DocumentInfo[]
}

export class DocsLoader {
  constructor(private readonly docsPath: string) {}

  async loadDocument(relativePath: string): Promise<string> {
    const fullPath = join(this.docsPath, relativePath)
    if (!existsSync(fullPath)) {
      throw new Error(`Document not found: ${relativePath}`)
    }
    return readFile(fullPath, 'utf-8')
  }

  async loadIndex(): Promise<DocumentInfo[]> {
    const indexPath = join(this.docsPath, 'docs-index.json')
    if (existsSync(indexPath)) {
      const content = await readFile(indexPath, 'utf-8')
      return JSON.parse(content) as DocumentInfo[]
    }

    // Fallback: scan directory
    return this.scanDocuments()
  }

  private async scanDocuments(
    dir: string = this.docsPath,
    documents: DocumentInfo[] = []
  ): Promise<DocumentInfo[]> {
    if (!existsSync(dir)) {
      return documents
    }

    const entries = await readdir(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stats = await stat(fullPath)

      if (stats.isDirectory()) {
        await this.scanDocuments(fullPath, documents)
      } else if (entry.endsWith('.md')) {
        const relativePath = relative(this.docsPath, fullPath)
        const uri = relativePath.replace(/\.md$/, '').replace(/\\/g, '/')
        const content = await readFile(fullPath, 'utf-8')

        documents.push({
          uri: `magek://docs/${uri}`,
          path: relativePath.replace(/\\/g, '/'),
          title: this.extractTitle(content) || uri.split('/').pop() || uri,
          description: this.extractDescription(content),
        })
      }
    }

    return documents
  }

  private extractTitle(content: string): string | null {
    // Try to extract title from first H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) {
      return h1Match[1].trim()
    }

    // Try to extract from frontmatter title
    const frontmatterMatch = content.match(
      /^---[\s\S]*?title:\s*['"]?([^'"\n]+)['"]?[\s\S]*?---/m
    )
    if (frontmatterMatch) {
      return frontmatterMatch[1].trim()
    }

    return null
  }

  private extractDescription(content: string): string | null {
    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(
      /^---[\s\S]*?---\n*/m,
      ''
    )

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

  resolveUriToPath(uri: string): string | null {
    // Convert magek://docs/getting-started/installation -> getting-started/installation.md
    const match = uri.match(/^magek:\/\/docs\/(.+)$/)
    if (!match) {
      return null
    }
    return `${match[1]}.md`
  }
}
