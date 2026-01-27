import * as ProjectChecker from '../../../src/services/project-checker.js'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import Command from '../../../src/commands/new/command.js'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.js'
import { template } from '../../../src/services/generator.js'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('Command', () => {
    const command = 'ExampleCommand'
    const commandsRoot = 'src/commands/'
    const commandPath = `${commandsRoot}example-command.ts`
    const noFieldsCommandImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Command',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Register',
      },
    ]
    const defaultCommandImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Command',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, Register',
      },
    ]
    const uuidCommandImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Command',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, Register, UUID',
      },
    ]

    const renderCommand = (imports: any[], name: string, fields: any[]): string => {
      return Mustache.render(template('command'), {
        imports: imports,
        name: name,
        fields: fields,
      })
    }

    let outputFileStub: SinonSpy

    beforeEach(() => {
      stub(ProjectChecker.projectChecker, 'checkCurrentDirIsAMagekProject').resolves()
      outputFileStub = fake.resolves({})
      replace(fs, 'outputFile', outputFileStub)
      replace(ProjectChecker.projectChecker, 'checkCurrentDirMagekVersion', fake.resolves({}))
    })

    afterEach(() => {
      restore()
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      const config = await Config.load()
      await new Command([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('with no fields', async () => {
        const config = await Config.load()
        await new Command([command], config).run()
        const renderedCommand = renderCommand(noFieldsCommandImports, command, [])
        expect(outputFileStub).to.have.been.calledWithMatch(commandPath, renderedCommand)
      })

      it('creates command with a string field', async () => {
        const config = await Config.load()
        await new Command([command, '--fields', 'title:string'], config).run()
        const renderedCommand = renderCommand(defaultCommandImports, command, [{ name: 'title', type: 'string' }])
        expect(outputFileStub).to.have.been.calledWithMatch(commandPath, renderedCommand)
      })

      it('creates command with a number field', async () => {
        const config = await Config.load()
        await new Command([command, '--fields', 'quantity:number'], config).run()
        const renderedCommand = renderCommand(defaultCommandImports, command, [{ name: 'quantity', type: 'number' }])
        expect(outputFileStub).to.have.been.calledWithMatch(commandPath, renderedCommand)
      })

      it('creates command with UUID field', async () => {
        const config = await Config.load()
        await new Command([command, '--fields', 'identifier:UUID'], config).run()
        const renderedCommand = renderCommand(uuidCommandImports, command, [{ name: 'identifier', type: 'UUID' }])
        expect(outputFileStub).to.have.been.calledWithMatch(commandPath, renderedCommand)
      })

      it('creates command with multiple fields', async () => {
        const config = await Config.load()
        await new Command(
          [command, '--fields', 'title:string', 'quantity:number', 'identifier:UUID'],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedCommand = renderCommand(uuidCommandImports, command, fields)
        expect(outputFileStub).to.have.been.calledWithMatch(commandPath, renderedCommand)
      })
    })

    describe('displays an error', () => {
      it('with empty command name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new Command([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(commandsRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided a command name/)
      })

      it('with empty fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Command([command, '--fields'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--fields expects a value')
      })

      it('with field with no type', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Command([command, '--fields', 'title'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
      })

      it('with no field type after :', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Command([command, '--fields', 'title:'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(commandPath)
      })

      it('with repeated fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Command(
            [command, '--fields', 'title:string', 'title:string', 'quantity:number'],
            config
          ).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(commandPath)
      })
    })
  })
})
