import * as ProjectChecker from '../../../src/services/project-checker.js'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import EventHandler from '../../../src/commands/new/event-handler.js'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.js'
import { template } from '../../../src/services/generator.js'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('Event', () => {
    const eventHandlerName = 'ExampleEventHandler'
    const eventHandlersRoot = 'src/event-handlers/'
    const eventHandlerPath = `${eventHandlersRoot}example-event-handler.ts`
    const defaultEventHandlerImports = [
      {
        packagePath: '../events/comment-posted',
        commaSeparatedComponents: 'CommentPosted',
      },
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'EventHandler',
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
      await new EventHandler([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('creates Event with a event', async () => {
        const config = await Config.load()
        await new EventHandler([eventHandlerName, '--event', 'CommentPosted'], config).run()
        const renderedEventHandler = Mustache.render(template('event-handler'), {
          imports: defaultEventHandlerImports,
          name: eventHandlerName,
          event: 'CommentPosted',
        })
        expect(outputFileStub).to.have.been.calledWithMatch(eventHandlerPath, renderedEventHandler)
      })
    })

    describe('displays an error', () => {
      it('with no event', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new EventHandler([eventHandlerName], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventHandlerPath)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided an event/)
      })

      it('with empty EventHandler name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new EventHandler([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventHandlersRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided an event handler name/)
      })

      it('with empty event', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new EventHandler([eventHandlerName, '--event'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--event expects a value')
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventHandlerPath)
      })

      it('creates EventHandler with two events', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new EventHandler([eventHandlerName, '--event', 'CommentPosted', 'ArticlePosted'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Unexpected argument: ArticlePosted')
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventHandlerPath)
      })
    })
  })
})
