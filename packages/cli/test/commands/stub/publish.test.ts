import { Config } from '@oclif/core'
import * as fs from 'fs-extra'
import { join } from 'path'
import { restore, replace, fake, stub, SinonSpy, spy } from 'sinon'
import * as ProjectChecker from '../../../src/services/project-checker'
import { expect } from '../../expect'
import Publish from '../../../src/commands/stub/publish'
import Prompter from '../../../src/services/user-prompt'
import { resourceTemplatesPath } from '../../../src/services/stub-publisher'
import inquirer from 'inquirer'

describe('stub', async () => {
  describe('publish', async () => {
    let fakeMkdirSync: SinonSpy
    let fakeWriteFileSync: SinonSpy
    let fakeReadFileSync: SinonSpy
    let readdirSyncSpy: SinonSpy

    const directoryFileMocks: fs.Dirent[] = [
      {
        name: 'fake-command.stub',
        path: '/someDir',
        parentPath: '/someDir',
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      },
      {
        name: 'fake-event.stub',
        path: '/someDir',
        parentPath: '/someDir',
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      },
      {
        name: 'fake-directory',
        path: '/someDir',
        parentPath: '/someDir',
        isFile: () => false,
        isDirectory: () => true,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      },
    ]

    beforeEach(() => {
      fakeMkdirSync = fake()
      fakeWriteFileSync = fake()
      fakeReadFileSync = fake()
      readdirSyncSpy = spy()

      stub(ProjectChecker, 'checkCurrentDirIsAMagekProject').returnsThis()
      replace(ProjectChecker, 'checkCurrentDirMagekVersion', fake.resolves({}))

      replace(fs, 'outputFile', fake.resolves({}))
      replace(fs, 'mkdirSync', fakeMkdirSync)
      replace(fs, 'writeFileSync', fakeWriteFileSync)
      replace(fs, 'readFileSync', fakeReadFileSync)
      replace(fs, 'readdirSync', ((path: any, options?: any) => {
        readdirSyncSpy(path, options)
        if (options?.withFileTypes) {
          return directoryFileMocks
        }
        // Fallback for other calls (return file names only)
        return directoryFileMocks.filter(d => d.isFile()).map(d => d.name)
      }) as typeof fs.readdirSync)
    })

    afterEach(() => {
      restore()
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      const config = await Config.load()
      await new Publish([], config).init()
      expect(ProjectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    describe('Publishes stub files correctly', () => {
      it('when the `/stubs` folder does not yet exist', async () => {
        stub(fs, 'existsSync').returns(false)
        spy(Prompter, 'confirmPrompt')

        const config = await Config.load()
        await new Publish([], config).run()

        expect(fs.existsSync).to.have.been.calledOnce
        expect(fs.existsSync).to.have.been.returned(false)
        expect(fs.existsSync).to.have.been.calledWithMatch(join(process.cwd(), 'stubs'))

        expect(fakeMkdirSync).to.have.been.calledOnce
        expect(fakeMkdirSync).to.have.been.calledOnceWith(join(process.cwd(), 'stubs'))

        expect(ProjectChecker.checkCurrentDirIsAMagekProject).to.have.been.calledOnce
        expect(Prompter.confirmPrompt).not.to.have.been.called

        expect(readdirSyncSpy).to.have.been.calledOnceWith(resourceTemplatesPath, { withFileTypes: true })

        expect(fakeReadFileSync).to.have.been.calledTwice
        expect(fakeWriteFileSync).to.have.been.calledTwice
      })

      it('when the `/stubs` folder already exists', async () => {
        stub(fs, 'existsSync').returns(true)
        stub(inquirer, 'prompt').resolves({ confirm: true })
        spy(Prompter, 'confirmPrompt')

        const config = await Config.load()
        await new Publish([], config).run()

        expect(fs.existsSync).to.have.been.calledOnce
        expect(fs.existsSync).to.have.been.returned(true)
        expect(fs.existsSync).to.have.been.calledWithMatch(join(process.cwd(), 'stubs'))

        expect(fakeMkdirSync).not.to.have.been.calledOnce
        expect(fakeMkdirSync).not.to.have.been.calledOnceWith(join(process.cwd(), 'stubs'))

        expect(ProjectChecker.checkCurrentDirIsAMagekProject).to.have.been.calledOnce

        expect(Prompter.confirmPrompt).to.have.been.called

        expect(readdirSyncSpy).to.have.been.calledOnceWith(resourceTemplatesPath, { withFileTypes: true })

        expect(fakeReadFileSync).to.have.been.calledTwice
        expect(fakeWriteFileSync).to.have.been.calledTwice
      })

      it('when the `/stubs` folder already exists, but the --force flag is set', async () => {
        stub(fs, 'existsSync').returns(true)
        spy(Prompter, 'confirmPrompt')

        const config = await Config.load()
        await new Publish(['--force'], config).run()

        expect(fs.existsSync).to.have.been.calledOnce
        expect(fs.existsSync).to.have.been.returned(true)
        expect(fs.existsSync).to.have.been.calledWithMatch(join(process.cwd(), 'stubs'))

        expect(fakeMkdirSync).not.to.have.been.calledOnce
        expect(fakeMkdirSync).not.to.have.been.calledOnceWith(join(process.cwd(), 'stubs'))

        expect(ProjectChecker.checkCurrentDirIsAMagekProject).to.have.been.calledOnce

        expect(Prompter.confirmPrompt).not.to.have.been.called

        expect(readdirSyncSpy).to.have.been.calledOnceWith(resourceTemplatesPath, { withFileTypes: true })

        expect(fakeReadFileSync).to.have.been.calledTwice
        expect(fakeWriteFileSync).to.have.been.calledTwice
      })
    })

    describe('Displays error', () => {
      it('when the /stubs folder already exists and the user has not confirmed the overwrite', async () => {
        stub(fs, 'existsSync').returns(true)
        stub(inquirer, 'prompt').resolves({ confirm: false })
        spy(Prompter, 'confirmPrompt')

        let exceptionThrown = false
        let exceptionMessage = ''

        try {
          const config = await Config.load()
          await new Publish([], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }

        expect(Prompter.confirmPrompt).to.have.been.called
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.be.contain(
          'Stubs folder already exists. Use --force option to overwrite files in it'
        )

        expect(readdirSyncSpy).not.to.have.been.called
        expect(fakeReadFileSync).not.to.have.been.called
        expect(fakeWriteFileSync).not.to.have.been.called
      })
    })
  })
})
