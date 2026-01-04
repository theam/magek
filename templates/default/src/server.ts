import { Magek } from '@magek/core'
import { createServer } from '@magek/server'
import * as app from './index'

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10)
  const host = process.env.HOST || '0.0.0.0'

  await Magek.start(__dirname)
  const server = await createServer(app)
  await server.listen({ port, host })
  console.log(`Server running on port ${port}`)
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
