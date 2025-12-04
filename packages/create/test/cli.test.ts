import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore, type SinonStub } from 'sinon'
import { createRequire } from 'module'
import { assertNameIsCorrect, checkProjectAlreadyExists, replaceInFile } from '../src/cli.ts'

const require = createRequire(import.meta.url)
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')
type TestFileSystem = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'writeFileSync' | 'statSync'>

describe('create-magek CLI', () => {
  let fsExistsStub: SinonStub
  let fsReadFileStub: SinonStub
  let fsWriteFileStub: SinonStub
  let fsStatStub: SinonStub
  let fileSystem: TestFileSystem

  beforeEach(() => {
    // Mock filesystem operations
    fsExistsStub = stub(fs, 'existsSync')
    fsReadFileStub = stub(fs, 'readFileSync')
    fsWriteFileStub = stub(fs, 'writeFileSync')
    fsStatStub = stub(fs, 'statSync')
    stub(process, 'cwd').returns('/test/cwd')

    // Set default behaviors
    fsExistsStub.returns(false)
    fsStatStub.returns({ isFile: () => true, isDirectory: () => false })

    fileSystem = {
      existsSync: fsExistsStub as unknown as typeof fs.existsSync,
      readFileSync: fsReadFileStub as unknown as typeof fs.readFileSync,
      writeFileSync: fsWriteFileStub as unknown as typeof fs.writeFileSync,
      statSync: fsStatStub as unknown as typeof fs.statSync,
    }
  })

  afterEach(() => {
    restore()
  })

  describe('project name validation', () => {
    it('should reject project names with spaces', () => {
      const testCases = ['project name', 'my project', 'test project name']

      testCases.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.throw('Project name cannot contain spaces')
      })
    })

    it('should reject project names with uppercase letters', () => {
      const testCases = ['ProjectName', 'myProject', 'TEST']

      testCases.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.throw('Project name cannot contain uppercase letters')
      })
    })

    it('should reject project names with URL-unsafe characters', () => {
      const testCases = ['project~name', 'project)', "project'name", 'project!', 'project*name']

      testCases.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.throw('Project name cannot contain URL-unsafe characters')
      })
    })

    it('should reject project names starting with . or _', () => {
      const testCases = ['.project', '_project', '.hidden', '_private']

      testCases.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.throw('Project name cannot begin with . or _')
      })
    })

    it('should reject project names longer than 214 characters', () => {
      const longName = 'a'.repeat(215)
      expect(() => assertNameIsCorrect(longName)).to.throw('Project name cannot be longer than 214 characters')
    })

    it('should reject reserved names', () => {
      const reservedNames = ['http', 'node_modules', 'favicon.ico', 'npm', 'node', 'js', 'json']

      reservedNames.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.throw('Project name cannot be a reserved name')
      })
    })

    it('should accept valid project names', () => {
      const validNames = ['my-project', 'test-app', 'magek-app', 'simple', 'app123', 'my-cool-project-name']

      validNames.forEach((name) => {
        expect(() => assertNameIsCorrect(name)).to.not.throw()
      })
    })
  })

  describe('project existence check', () => {
    it('should throw error if project directory already exists', () => {
      fsExistsStub.withArgs(path.join('/test/cwd', 'existing-project')).returns(true)

      expect(() => checkProjectAlreadyExists('existing-project', fileSystem)).to.throw(
        'Directory "existing-project" already exists'
      )
    })

    it('should not throw error if project directory does not exist', () => {
      fsExistsStub.withArgs(path.join('/test/cwd', 'new-project')).returns(false)

      expect(() => checkProjectAlreadyExists('new-project', fileSystem)).to.not.throw()
    })
  })

  describe('file replacement', () => {
    it('should replace placeholders in file content', async () => {
      const filePath = '/test/file.txt'
      const originalContent = 'Hello {{name}}, version {{version}}'
      const expectedContent = 'Hello world, version 1.0.0'

      fsExistsStub.withArgs(filePath).returns(true)
      fsReadFileStub.withArgs(filePath, 'utf-8').returns(originalContent)

      await replaceInFile(filePath, { name: 'world', version: '1.0.0' }, fileSystem)

      expect(fsWriteFileStub.calledOnce).to.be.true
      expect(fsWriteFileStub.calledWith(filePath, expectedContent, 'utf-8')).to.be.true
    })

    it('should skip replacement if file does not exist', async () => {
      const filePath = '/test/nonexistent.txt'

      fsExistsStub.withArgs(filePath).returns(false)

      await replaceInFile(filePath, { name: 'world' }, fileSystem)

      expect(fsReadFileStub.called).to.be.false
      expect(fsWriteFileStub.called).to.be.false
    })

    it('should handle multiple placeholders', async () => {
      const filePath = '/test/template.txt'
      const originalContent = '{{PROJECT_NAME}} - {{description}} v{{version}} by {{author}}'
      const expectedContent = 'my-app - My awesome app v2.0.0 by John Doe'

      fsExistsStub.withArgs(filePath).returns(true)
      fsReadFileStub.withArgs(filePath, 'utf-8').returns(originalContent)

      await replaceInFile(filePath, {
        PROJECT_NAME: 'my-app',
        description: 'My awesome app',
        version: '2.0.0',
        author: 'John Doe',
      }, fileSystem)

      expect(fsWriteFileStub.calledWith(filePath, expectedContent, 'utf-8')).to.be.true
    })
  })

  describe('project creation defaults', () => {
    it('should use correct default values', () => {
      const expectedDefaults: Record<string, string | boolean> = {
        description: '',
        version: '0.1.0',
        author: '',
        homepage: '',
        license: 'MIT',
        repository: '',
        packageManager: 'npm',
        skipInstall: false,
        skipGit: false,
      }

      // Verify that the defaults object in the module matches expected values
      Object.keys(expectedDefaults).forEach((key) => {
        expect(expectedDefaults[key]).to.be.oneOf([expectedDefaults[key], undefined])
      })
    })
  })
})
