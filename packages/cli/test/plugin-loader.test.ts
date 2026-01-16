import { Config } from '@oclif/core'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerMagekCliPlugins } from '../src/plugin-loader.js'
import { expect } from './expect.js'

describe('plugin loader', () => {
  it('registers commands from adapter packages', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'magek-cli-'))
    try {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'temp-project', version: '0.0.0' }))
      const adapterDir = join(tempDir, 'node_modules', '@magek', 'adapter-test')
      await mkdir(adapterDir, { recursive: true })
      await writeFile(
        join(adapterDir, 'package.json'),
        JSON.stringify({ name: '@magek/adapter-test', version: '0.0.0', main: 'index.js' })
      )
      await writeFile(
        join(adapterDir, 'index.js'),
        `
        class AdapterCommand {
          static id = 'adapter:test'
          static flags = {}
          static args = {}
          static aliases = []
          static hidden = false
          static hiddenAliases = []
          static async run() {}
        }
        module.exports = { magekCli: { commands: { 'adapter:test': AdapterCommand } } }
        `
      )
      const config = await Config.load({ root: process.cwd() })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:test')
      expect(command?.id).to.equal('adapter:test')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
