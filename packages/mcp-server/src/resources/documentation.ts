import type { DocsLoader, DocumentInfo } from '../utils/docs-loader.js'

export interface DocumentationResource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export class DocumentationResources {
  constructor(private readonly docsLoader: DocsLoader) {}

  async listResources(): Promise<DocumentationResource[]> {
    const documents = await this.docsLoader.loadIndex()

    const resources: DocumentationResource[] = documents.map((doc) => ({
      uri: doc.uri,
      name: doc.title,
      description: doc.description || `Magek documentation: ${doc.path}`,
      mimeType: 'text/markdown',
    }))

    // Add the index resource
    resources.unshift({
      uri: 'magek://docs/index',
      name: 'Documentation Index',
      description: 'Index of all Magek documentation topics',
      mimeType: 'application/json',
    })

    return resources
  }

  async readResource(uri: string): Promise<{ content: string; mimeType: string }> {
    if (uri === 'magek://docs/index') {
      return this.getIndex()
    }

    const path = this.docsLoader.resolveUriToPath(uri)
    if (!path) {
      throw new Error(`Invalid resource URI: ${uri}`)
    }

    const content = await this.docsLoader.loadDocument(path)
    return { content, mimeType: 'text/markdown' }
  }

  private async getIndex(): Promise<{ content: string; mimeType: string }> {
    const documents = await this.docsLoader.loadIndex()

    const index = {
      description: 'Magek Documentation Index',
      topics: this.organizeByCategory(documents),
    }

    return {
      content: JSON.stringify(index, null, 2),
      mimeType: 'application/json',
    }
  }

  private organizeByCategory(
    documents: DocumentInfo[]
  ): Record<string, { title: string; uri: string; description: string | null }[]> {
    const categories: Record<
      string,
      { title: string; uri: string; description: string | null }[]
    > = {}

    for (const doc of documents) {
      // Extract category from path (e.g., "getting-started/installation.md" -> "getting-started")
      const pathParts = doc.path.split('/')
      const category = pathParts.length > 1 ? pathParts[0] : 'general'

      if (!categories[category]) {
        categories[category] = []
      }

      categories[category].push({
        title: doc.title,
        uri: doc.uri,
        description: doc.description,
      })
    }

    return categories
  }
}
