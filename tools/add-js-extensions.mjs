import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function walk(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      await walk(res)
    } else if (dirent.isFile() && res.endsWith('.ts')) {
      await processFile(res)
    }
  }
}

async function processFile(file) {
  const text = await fs.readFile(file, 'utf8')
  const updated = text
    // from '...' and import ... from '...'
    .replace(/(import\s[^'"`]+?from\s+|export\s+\*\s+from\s+)'(\.{1,2}\/[^'"`.]+?)'/g, (_, prefix, spec) => {
      if (spec.endsWith('.js') || spec.endsWith('.json')) return `${prefix}'${spec}'`
      return `${prefix}'${spec}.js'`
    })
  if (updated !== text) {
    await fs.writeFile(file, updated)
    console.log(`fixed ${file}`)
  }
}

await walk(path.resolve(__dirname, '..'))