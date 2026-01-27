import * as ProjectChecker from '../../../src/services/project-checker.js'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import Event from '../../../src/commands/new/event.js'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.js'
import { template } from '../../../src/services/generator.js'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('Event', () => {
    const eventName = 'ExampleEvent'
    const eventsRoot = 'src/events/'
    const eventPath = `${eventsRoot}example-event.ts`
    const noFieldsEventImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Event',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'UUID',
      },
    ]
    const defaultEventImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Event',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, UUID',
      },
    ]

    const renderEvent = (imports: any[], name: string, fields: any[]): string => {
      return Mustache.render(template('event'), {
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
      await new Event([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('with no fields', async () => {
        const config = await Config.load()
        await new Event([eventName], config).run()
        const renderedEvent = renderEvent(noFieldsEventImports, eventName, [])
        expect(outputFileStub).to.have.been.calledWithMatch(eventPath, renderedEvent)
      })

      it('creates Event with a string field', async () => {
        const config = await Config.load()
        await new Event([eventName, '--fields', 'title:string'], config).run()
        const renderedEvent = renderEvent(defaultEventImports, eventName, [{ name: 'title', type: 'string' }])
        expect(outputFileStub).to.have.been.calledWithMatch(eventPath, renderedEvent)
      })

      it('creates Event with a number field', async () => {
        const config = await Config.load()
        await new Event([eventName, '--fields', 'quantity:number'], config).run()
        const renderedEvent = renderEvent(defaultEventImports, eventName, [{ name: 'quantity', type: 'number' }])
        expect(outputFileStub).to.have.been.calledWithMatch(eventPath, renderedEvent)
      })

      it('creates Event with UUID field', async () => {
        const config = await Config.load()
        await new Event([eventName, '--fields', 'identifier:UUID'], config).run()
        const renderedEvent = renderEvent(defaultEventImports, eventName, [{ name: 'identifier', type: 'UUID' }])
        expect(outputFileStub).to.have.been.calledWithMatch(eventPath, renderedEvent)
      })

      it('creates Event with multiple fields', async () => {
        const config = await Config.load()
        await new Event(
          [eventName, '--fields', 'title:string', 'quantity:number', 'identifier:UUID'],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedEvent = renderEvent(defaultEventImports, eventName, fields)
        expect(outputFileStub).to.have.been.calledWithMatch(eventPath, renderedEvent)
      })
    })

    describe('displays an error', () => {
      it('with empty Event name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new Event([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventsRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided an event name/)
      })

      it('with empty fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Event([eventName, '--fields'], config).run()
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
          await new Event([eventName, '--fields', 'title'], config).run()
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
          await new Event([eventName, '--fields', 'title:'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventPath)
      })

      it('with repeated fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Event(
            [eventName, '--fields', 'title:string', 'title:string', 'quantity:number'],
            config
          ).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(eventPath)
      })
    })
  })
})
