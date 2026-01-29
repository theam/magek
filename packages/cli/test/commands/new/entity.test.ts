import * as ProjectChecker from '../../../src/services/project-checker.js'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import Entity from '../../../src/commands/new/entity.js'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.js'
import { template } from '../../../src/services/generator.js'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('Entity', () => {
    const entityName = 'ExampleEntity'
    const entitysRoot = 'src/entities/'
    const entityPath = `${entitysRoot}example-entity.ts`
    const noFieldsEntityImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Entity',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'UUID',
      },
    ]
    const defaultEntityImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Entity',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, UUID',
      },
    ]
    const reducingEntityImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Entity, Reduces',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, UUID',
      },
      {
        packagePath: '../events/post-created',
        commaSeparatedComponents: 'PostCreated',
      },
    ]
    const reducingTwoEntityImports = [
      {
        packagePath: '@magek/core',
        commaSeparatedComponents: 'Entity, Reduces',
      },
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, UUID',
      },
      {
        packagePath: '../events/post-created',
        commaSeparatedComponents: 'PostCreated',
      },
      {
        packagePath: '../events/comment-created',
        commaSeparatedComponents: 'CommentCreated',
      },
    ]

    const renderEntity = (imports: any[], name: string, fields: any[], events: any[]): string => {
      return Mustache.render(template('entity'), {
        imports: imports,
        name: name,
        fields: fields,
        events: events,
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
      await new Entity([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('with no fields and no reduces', async () => {
        const config = await Config.load()
        await new Entity([entityName], config).run()
        const renderedEntity = renderEntity(noFieldsEntityImports, entityName, [], [])
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with a string field', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'title:string'], config).run()
        const renderedEntity = renderEntity(defaultEntityImports, entityName, [{ name: 'title', type: 'string' }], [])
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with a string field reducing PostCreated', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'title:string', '--reduces', 'PostCreated'], config).run()
        const renderedEntity = renderEntity(
          reducingEntityImports,
          entityName,
          [{ name: 'title', type: 'string' }],
          [{ eventName: 'PostCreated' }]
        )
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with a number field', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'quantity:number'], config).run()
        const renderedEntity = renderEntity(
          defaultEntityImports,
          entityName,
          [{ name: 'quantity', type: 'number' }],
          []
        )
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with a number field reducing PostCreated', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'quantity:number', '--reduces', 'PostCreated'], config).run()
        const renderedEntity = renderEntity(
          reducingEntityImports,
          entityName,
          [{ name: 'quantity', type: 'number' }],
          [{ eventName: 'PostCreated' }]
        )
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with UUID field', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'identifier:UUID'], config).run()
        const renderedEntity = renderEntity(
          defaultEntityImports,
          entityName,
          [{ name: 'identifier', type: 'UUID' }],
          []
        )
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with UUID field reducing PostCreated', async () => {
        const config = await Config.load()
        await new Entity([entityName, '--fields', 'identifier:UUID', '--reduces', 'PostCreated'], config).run()
        const renderedEntity = renderEntity(
          reducingEntityImports,
          entityName,
          [{ name: 'identifier', type: 'UUID' }],
          [{ eventName: 'PostCreated' }]
        )
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with multiple fields', async () => {
        const config = await Config.load()
        await new Entity(
          [entityName, '--fields', 'title:string', 'quantity:number', 'identifier:UUID'],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedEntity = renderEntity(defaultEntityImports, entityName, fields, [])
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with multiple fields reducing PostCreated', async () => {
        const config = await Config.load()
        await new Entity(
          [entityName, '--fields', 'title:string', 'quantity:number', 'identifier:UUID', '--reduces', 'PostCreated'],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedEntity = renderEntity(reducingEntityImports, entityName, fields, [{ eventName: 'PostCreated' }])
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })

      it('creates Entity with multiple fields reducing PostCreated and CommentCreated', async () => {
        const config = await Config.load()
        await new Entity(
          [
            entityName,
            '--fields',
            'title:string',
            'quantity:number',
            'identifier:UUID',
            '--reduces',
            'PostCreated',
            'CommentCreated',
          ],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedEntity = renderEntity(reducingTwoEntityImports, entityName, fields, [
          { eventName: 'PostCreated' },
          { eventName: 'CommentCreated' },
        ])
        expect(outputFileStub).to.have.been.calledWithMatch(entityPath, renderedEntity)
      })
    })

    describe('displays an error', () => {
      it('with empty Entity name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new Entity([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(entitysRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided an entity name/)
      })

      it('with empty fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity([entityName, '--fields'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--fields expects a value')
      })

      it('with empty reduces', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity([entityName, '--fields', 'title:string', '--reduces'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--reduces expects a value')
      })

      it('with empty fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity([entityName, '--fields', '--reduces'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Flag --fields expects a value')
      })

      it('with empty reduces', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity([entityName, '--fields', 'title', '--reduces'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Flag --reduces expects a value')
      })

      it('with field with no type', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity([entityName, '--fields', 'title'], config).run()
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
          await new Entity([entityName, '--fields', 'title:'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(entityPath)
      })

      it('with repeated fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Entity(
            [entityName, '--fields', 'title:string', 'title:string', 'quantity:number'],
            config
          ).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(entityPath)
      })
    })
  })
})
