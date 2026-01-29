import * as ProjectChecker from '../../../src/services/project-checker.js'
import { restore, replace, fake, stub } from 'sinon'
import type { SinonSpy } from 'sinon'
import Type from '../../../src/commands/new/type.js'
import Mustache = require('mustache')
import { createRequire } from 'module'
import { Config } from '@oclif/core'
import { expect } from '../../expect.js'
import { template } from '../../../src/services/generator.js'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('new', (): void => {
  describe('Type', () => {
    const typeName = 'ExampleType'
    const typesRoot = 'src/common/'
    const typePath = `${typesRoot}example-type.ts`
    const noFieldsTypeImports: any[] = []
    const defaultTypeImports = [
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field',
      },
    ]
    const uuidTypeImports = [
      {
        packagePath: '@magek/common',
        commaSeparatedComponents: 'Field, UUID',
      },
    ]

    const renderType = (imports: any[], name: string, fields: any[]): string => {
      return Mustache.render(template('type'), {
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
      await new Type([], config).init()
      expect(ProjectChecker.projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Created correctly', () => {
      it('with no fields', async () => {
        const config = await Config.load()
        await new Type([typeName], config).run()
        const renderedType = renderType(noFieldsTypeImports, typeName, [])
        expect(outputFileStub).to.have.been.calledWithMatch(typePath, renderedType)
      })

      it('creates Type with a string field', async () => {
        const config = await Config.load()
        await new Type([typeName, '--fields', 'title:string'], config).run()
        const renderedType = renderType(defaultTypeImports, typeName, [{ name: 'title', type: 'string' }])
        expect(outputFileStub).to.have.been.calledWithMatch(typePath, renderedType)
      })

      it('creates Type with a number field', async () => {
        const config = await Config.load()
        await new Type([typeName, '--fields', 'quantity:number'], config).run()
        const renderedType = renderType(defaultTypeImports, typeName, [{ name: 'quantity', type: 'number' }])
        expect(outputFileStub).to.have.been.calledWithMatch(typePath, renderedType)
      })

      it('creates Type with UUID field', async () => {
        const config = await Config.load()
        await new Type([typeName, '--fields', 'identifier:UUID'], config).run()
        const renderedType = renderType(uuidTypeImports, typeName, [{ name: 'identifier', type: 'UUID' }])
        expect(outputFileStub).to.have.been.calledWithMatch(typePath, renderedType)
      })

      it('creates Type with multiple fields', async () => {
        const config = await Config.load()
        await new Type(
          [typeName, '--fields', 'title:string', 'quantity:number', 'identifier:UUID'],
          config
        ).run()
        const fields = [
          { name: 'title', type: 'string' },
          { name: 'quantity', type: 'number' },
          { name: 'identifier', type: 'UUID' },
        ]
        const renderedType = renderType(uuidTypeImports, typeName, fields)
        expect(outputFileStub).to.have.been.calledWithMatch(typePath, renderedType)
      })
    })

    describe('displays an error', () => {
      it('with empty Type name', async () => {
        replace(console, 'error', fake.resolves({}))
        const config = await Config.load()
        await new Type([], config).run()
        expect(outputFileStub).to.have.not.been.calledWithMatch(typesRoot)
        expect(console.error).to.have.been.calledWithMatch(/You haven't provided a type name/)
      })

      it('with empty fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Type([typeName, '--fields'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.be.equal('Flag --fields expects a value')
      })

      it('with field with no type', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Type([typeName, '--fields', 'title'], config).run()
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
          await new Type([typeName, '--fields', 'title:'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(typePath)
      })

      it('with repeated fields', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Type([typeName, '--fields', 'title:string', 'title:string', 'quantity:number'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Error parsing field title')
        expect(outputFileStub).to.have.not.been.calledWithMatch(typePath)
      })
    })
  })
})
