import { Config } from '@oclif/core'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerMagekCliPlugins } from '../src/plugin-loader.js'
import { expect } from './expect.js'

const projectRequire = createRequire(__filename)
const oclifCorePath = projectRequire.resolve('@oclif/core')
const oclifCoreUrl = pathToFileURL(oclifCorePath).href

const createTempProject = async (): Promise<string> => {
  const tempDir = await mkdtemp(join(tmpdir(), 'magek-cli-'))
  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify({
      name: 'temp-project',
      version: '0.0.0',
      oclif: { bin: 'magek', commands: './commands' },
    })
  )
  await mkdir(join(tempDir, 'commands'), { recursive: true })
  return tempDir
}

const writeAdapterPackage = async (
  projectRoot: string,
  packageName: string,
  options: { main?: string; type?: string; source?: string; version?: string }
): Promise<void> => {
  const adapterDir = join(projectRoot, 'node_modules', '@magek', packageName)
  await mkdir(adapterDir, { recursive: true })
  await writeFile(
    join(adapterDir, 'package.json'),
    JSON.stringify({
      name: `@magek/${packageName}`,
      version: options.version ?? '0.0.0',
      main: options.main ?? 'index.js',
      ...(options.type ? { type: options.type } : {}),
    })
  )
  if (options.source) {
    await writeFile(join(adapterDir, options.main ?? 'index.js'), options.source)
  }
}

describe('plugin loader', () => {
  it('registers commands from adapter packages', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-test', {
        source: `
          const { Command } = require('${oclifCorePath}')

          class AdapterCommand extends Command {
            static id = 'adapter:test'
            static flags = {}
            static args = {}
            static aliases = []
            static hidden = false
            static hiddenAliases = []
            async run() {}
          }
          module.exports = { magekCli: { commands: { 'adapter:test': AdapterCommand } } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:test')
      expect(command?.id).to.equal('adapter:test')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores adapters with empty command exports', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-empty', {
        source: 'module.exports = { magekCli: { commands: {} } }',
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:empty')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores adapters with non-object magekCli exports', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-invalid', {
        source: 'module.exports = { magekCli: \'string\' }',
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:invalid')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores adapters with missing command maps', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-missing-commands', {
        source: 'module.exports = { magekCli: {} }',
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:missing')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores adapters with non-object command maps', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-command-array', {
        source: 'module.exports = { magekCli: { commands: [\'not-a-map\'] } }',
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:array')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores commands that are not oclif Command classes', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-bad-command', {
        source: `
          class NotACommand {}
          module.exports = { magekCli: { commands: { 'adapter:bad': NotACommand } } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:bad')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('skips adapters that fail to load', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-broken', { source: 'throw new Error("boom")' })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:broken')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('ignores non-adapter packages under the @magek scope', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'tooling-helper', {
        source: `
          const { Command } = require('${oclifCorePath}')

          class HelperCommand extends Command {
            static id = 'helper:run'
            static flags = {}
            static args = {}
            async run() {}
          }
          module.exports = { magekCli: { commands: { 'helper:run': HelperCommand } } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('helper:run')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('loads default magekCli exports from CJS adapters', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-default', {
        source: `
          const { Command } = require('${oclifCorePath}')

          class AdapterCommand extends Command {
            static id = 'adapter:default'
            static flags = {}
            static args = {}
            async run() {}
          }
          module.exports = { default: { magekCli: { commands: { 'adapter:default': AdapterCommand } } } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:default')
      expect(command?.id).to.equal('adapter:default')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('loads ESM adapter packages', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-esm', {
        main: 'index.mjs',
        type: 'module',
        source: `
          import * as oclifCore from '${oclifCoreUrl}'

          const { Command } = oclifCore

          export class AdapterCommand extends Command {
            static id = 'adapter:esm'
            static flags = {}
            static args = {}
            async run() {}
          }

          export const magekCli = { commands: { 'adapter:esm': AdapterCommand } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:esm')
      expect(command?.id).to.equal('adapter:esm')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('skips adapters with duplicate argument names', async () => {
    const tempDir = await createTempProject()
    try {
      await writeAdapterPackage(tempDir, 'adapter-duplicate-args', {
        source: `
          const { Command } = require('${oclifCorePath}')

          class AdapterCommand extends Command {
            static id = 'adapter:dupe'
            static flags = {}
            static args = [{ name: 'id' }, { name: 'id' }]
            async run() {}
          }
          module.exports = { magekCli: { commands: { 'adapter:dupe': AdapterCommand } } }
        `,
      })
      const config = await Config.load({ root: tempDir })
      await registerMagekCliPlugins(config, tempDir)
      const command = config.findCommand('adapter:dupe')
      expect(command).to.equal(undefined)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
