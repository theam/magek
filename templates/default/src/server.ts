import { Magek } from '@magek/core'
import { createServer } from '@magek/server'
import * as app from './index'

const port = parseInt(process.env.PORT || '3000', 10)
const host = process.env.HOST || '0.0.0.0'

await Magek.start(__dirname)
const server = await createServer(app)
await server.listen({ port, host })
console.log(`Server running on port ${port}`)
