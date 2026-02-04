import { createRequire } from 'node:module'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { DocsLoader } from './utils/docs-loader.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json') as { version: string }
import { DocumentationResources } from './resources/documentation.js'
import {
  CLI_REFERENCE_URI,
  getCliReferenceResource,
  readCliReference,
} from './resources/cli-reference.js'
import {
  CQRS_FLOW_PROMPT_NAME,
  getCqrsFlowPrompt,
  getCqrsFlowPromptDefinition,
} from './prompts/cqrs-flow.js'
import {
  TROUBLESHOOTING_PROMPT_NAME,
  getTroubleshootingPrompt,
  getTroubleshootingPromptDefinition,
} from './prompts/troubleshooting.js'

export interface MagekServerOptions {
  docsPath: string
}

export function createMagekServer(options: MagekServerOptions): Server {
  const { docsPath } = options

  const docsLoader = new DocsLoader(docsPath)
  const docResources = new DocumentationResources(docsLoader)

  const server = new Server(
    {
      name: 'magek',
      version: packageJson.version,
    },
    {
      capabilities: {
        resources: {},
        prompts: {},
        tools: {},
      },
    }
  )

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await docResources.listResources()

    // Add CLI reference resource
    resources.push(getCliReferenceResource())

    return {
      resources: resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    }
  })

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params

    // Handle CLI reference
    if (uri === CLI_REFERENCE_URI) {
      const { content, mimeType } = readCliReference()
      return {
        contents: [
          {
            uri,
            mimeType,
            text: content,
          },
        ],
      }
    }

    // Handle documentation resources
    if (uri.startsWith('magek://docs/')) {
      const { content, mimeType } = await docResources.readResource(uri)
      return {
        contents: [
          {
            uri,
            mimeType,
            text: content,
          },
        ],
      }
    }

    throw new Error(`Unknown resource: ${uri}`)
  })

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [getCqrsFlowPromptDefinition(), getTroubleshootingPromptDefinition()],
    }
  })

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    if (name === CQRS_FLOW_PROMPT_NAME) {
      const feature = args?.feature
      if (!feature || typeof feature !== 'string') {
        throw new Error('Required argument "feature" is missing')
      }

      return {
        description: `CQRS implementation guide for: ${feature}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getCqrsFlowPrompt({ feature }),
            },
          },
        ],
      }
    }

    if (name === TROUBLESHOOTING_PROMPT_NAME) {
      const issue = args?.issue
      return {
        description: issue
          ? `Troubleshooting guide for: ${issue}`
          : 'General Magek troubleshooting guide',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: getTroubleshootingPrompt({
                issue: typeof issue === 'string' ? issue : undefined,
              }),
            },
          },
        ],
      }
    }

    throw new Error(`Unknown prompt: ${name}`)
  })

  // List tools handler - no tools for now, just resources and prompts
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [] }
  })

  // Call tool handler - no tools for now
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    throw new Error(`Unknown tool: ${request.params.name}`)
  })

  return server
}
