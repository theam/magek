import * as ProjectChecker from '../../../src/services/project-checker.ts'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import ScheduledCommand from '../../../src/commands/new/scheduled-command.ts'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.ts'
import { template } from '../../../src/services/generator.ts'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('ScheduledCommand', () => {
    const scheduledCommandName = 'ExampleScheduledCommand'
    const scheduledCommandRoot = 'src/scheduled-commands/'
    const scheduledCommandPath = `${scheduledCommandRoot}example-scheduled-command.ts`
    const defaultScheduledCommandImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'ScheduledCommand',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Register',
      },
    ]

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
      await new ScheduledCommand([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('with scheduled command name', async () => {
        const config = await Config.load()
        await new ScheduledCommand([scheduledCommandName], config).run()
        const renderedCommand = Mustache.render(template('scheduled-command'), {
          imports: defaultScheduledCommandImports,
          name: scheduledCommandName,
        })
        expect(outputFileStub).to.have.been.calledWithMatch(scheduledCommandPath, renderedCommand)
      })
    })

    describe('displays an error', () => {
      it('with empty scheduled command name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new ScheduledCommand([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(scheduledCommandRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided a scheduled command name/)
      })

      it('with two scheduled command names', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new ScheduledCommand([scheduledCommandName, 'AnotherName'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Unexpected argument: AnotherName')
        expect(outputFileStub).to.have.not.been.calledWithMatch(scheduledCommandPath)
      })
    })
  })
})
