import { describe, it } from 'mocha'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { expect } from 'chai'

describe('create-booster-ai CLI', () => {
  const tempDir = path.join(__dirname, '../temp-test')
  const testProjectName = 'test-project'
  const testProjectPath = path.join(tempDir, testProjectName)
  const cliPath = path.join(__dirname, '../dist/cli.js')

  beforeEach(() => {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    // Clean up any existing test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    // Clean up test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true })
    }
  })

  after(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should create a project with default options', (done) => {
    const child = spawn('node', [
      cliPath,
      testProjectName,
      '--default',
      '--skip-install',
      '--skip-git'
    ], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let output = ''
    child.stdout.on('data', (data) => {
      output += data.toString()
    })

    child.on('close', (code) => {
      try {
        expect(code).to.equal(0)
        expect(output).to.include('Project created successfully!')
        
        // Check that project directory was created
        expect(fs.existsSync(testProjectPath)).to.be.true
        
        // Check that essential files were created
        expect(fs.existsSync(path.join(testProjectPath, 'package.json'))).to.be.true
        expect(fs.existsSync(path.join(testProjectPath, 'tsconfig.json'))).to.be.true
        expect(fs.existsSync(path.join(testProjectPath, 'src', 'index.ts'))).to.be.true
        expect(fs.existsSync(path.join(testProjectPath, 'src', 'config', 'config.ts'))).to.be.true
        expect(fs.existsSync(path.join(testProjectPath, 'README.md'))).to.be.true
        
        // Check that package.json was properly configured
        const packageJson = JSON.parse(fs.readFileSync(path.join(testProjectPath, 'package.json'), 'utf-8'))
        expect(packageJson.name).to.equal(testProjectName)
        expect(packageJson.version).to.equal('0.1.0')
        expect(packageJson.license).to.equal('MIT')
        
        // Check that placeholders were replaced
        const readme = fs.readFileSync(path.join(testProjectPath, 'README.md'), 'utf-8')
        expect(readme).to.include(`# ${testProjectName}`)
        
        done()
      } catch (error) {
        done(error)
      }
    })

    child.on('error', (error) => {
      done(error)
    })
  }).timeout(10000)

  it('should reject invalid project names', (done) => {
    const child = spawn('node', [
      cliPath,
      'Invalid Project Name',
      '--default',
      '--skip-install',
      '--skip-git'
    ], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let errorOutput = ''
    child.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    child.on('close', (code) => {
      try {
        expect(code).to.not.equal(0)
        expect(errorOutput).to.include('Project name cannot')
        done()
      } catch (error) {
        done(error)
      }
    })

    child.on('error', (error) => {
      done(error)
    })
  }).timeout(5000)
})