#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import degit from 'degit'
import prompts from 'prompts'
import kleur from 'kleur'
import { globby } from 'globby'
import { spawn } from 'child_process'

interface ProjectConfig {
  projectName: string
  description: string
  version: string
  author: string
  homepage: string
  license: string
  repository: string
  providerPackageName: string
  template?: string
  skipInstall?: boolean
  skipGit?: boolean
}

class ForbiddenProjectName extends Error {
  constructor(public name: string, public restrictionText: string) {
    super(`Project name cannot ${restrictionText}:\n\n    Found: '${name}'`)
  }
}

function assertNameIsCorrect(name: string): void {
  // Current characters max length: 37
  // Lambda name limit is 64 characters
  // `-subscriptions-notifier` lambda is 23 characters
  // `-app` prefix is added to application stack
  // which is 64 - 23 - 4 = 37
  const maxProjectNameLength = 37

  if (name.length > maxProjectNameLength)
    throw new ForbiddenProjectName(name, `be longer than ${maxProjectNameLength} characters`)

  if (name.includes(' ')) throw new ForbiddenProjectName(name, 'contain spaces')

  if (name.toLowerCase() !== name) throw new ForbiddenProjectName(name, 'contain uppercase letters')

  if (name.includes('_')) throw new ForbiddenProjectName(name, 'contain underscore')
}

function checkProjectAlreadyExists(name: string): void {
  const projectPath = path.join(process.cwd(), name)
  if (fs.existsSync(projectPath)) {
    throw new Error(`Directory "${name}" already exists. Please choose a different project name or remove the existing directory.`)
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function replaceInFile(filePath: string, replacements: Record<string, string>): Promise<void> {
  if (!fs.existsSync(filePath)) return
  
  let content = fs.readFileSync(filePath, 'utf-8')
  
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g')
    content = content.replace(regex, value)
  }
  
  fs.writeFileSync(filePath, content, 'utf-8')
}

async function replaceInAllFiles(targetDir: string, replacements: Record<string, string>): Promise<void> {
  const files = await globby([
    '**/*',
    '!node_modules/**',
    '!.git/**',
    '!**/node_modules/**'
  ], { 
    cwd: targetDir,
    dot: true,
    absolute: true
  })

  for (const file of files) {
    const stat = fs.statSync(file)
    if (stat.isFile()) {
      await replaceInFile(file, replacements)
    }
  }
}

async function collectProjectInfo(args: string[]): Promise<ProjectConfig> {
  const projectName = args[0]
  
  if (!projectName) {
    console.error(kleur.red('Error: Project name is required'))
    console.log('Usage: npm create booster-ai@latest <project-name>')
    process.exit(1)
  }

  assertNameIsCorrect(projectName)
  checkProjectAlreadyExists(projectName)

  // Parse command line flags
  const flags: Record<string, string | boolean> = {}
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg
        i++
      } else {
        flags[key] = true
      }
    }
  }

  // If --default flag is provided, use defaults
  if (flags.default) {
    return {
      projectName,
      description: '',
      version: '0.1.0',
      author: '',
      homepage: '',
      license: 'MIT',
      repository: '',
      providerPackageName: '@booster-ai/server',
      template: flags.template as string,
      skipInstall: flags['skip-install'] as boolean,
      skipGit: flags['skip-git'] as boolean,
    }
  }

  // Collect information via prompts
  const responses = await prompts([
    {
      type: 'text',
      name: 'description',
      message: 'What\'s your project description?',
      initial: flags.description as string || ''
    },
    {
      type: 'text',
      name: 'version',
      message: 'What\'s the first version?',
      initial: flags.version as string || '0.1.0'
    },
    {
      type: 'text',
      name: 'author',
      message: 'Who\'s the author?',
      initial: flags.author as string || ''
    },
    {
      type: 'text',
      name: 'homepage',
      message: 'What\'s the website?',
      initial: flags.homepage as string || ''
    },
    {
      type: 'text',
      name: 'license',
      message: 'What license will you be publishing this under?',
      initial: flags.license as string || 'MIT'
    },
    {
      type: 'text',
      name: 'repository',
      message: 'What\'s the URL of the repository?',
      initial: flags.repository as string || ''
    },
    {
      type: 'text',
      name: 'providerPackageName',
      message: 'What\'s the package name of your provider infrastructure library?',
      initial: flags.providerPackageName as string || '@booster-ai/server'
    }
  ])

  return {
    projectName,
    description: responses.description || '',
    version: responses.version || '0.1.0',
    author: responses.author || '',
    homepage: responses.homepage || '',
    license: responses.license || 'MIT',
    repository: responses.repository || '',
    providerPackageName: responses.providerPackageName || '@booster-ai/server',
    template: flags.template as string,
    skipInstall: flags['skip-install'] as boolean,
    skipGit: flags['skip-git'] as boolean,
  }
}

async function createProject(config: ProjectConfig): Promise<void> {
  const targetDir = path.join(process.cwd(), config.projectName)
  
  console.log(kleur.blue('📦 Creating project...'))
  
  // Determine template source
  const templateSource = config.template || 'boostercloud/boosterai/templates/default'
  
  try {
    // Clone template using degit
    const emitter = degit(templateSource, { cache: false, force: true })
    await emitter.clone(targetDir)
    
    console.log(kleur.green('✓ Template cloned'))
    
    // Replace placeholders in all files
    console.log(kleur.blue('🔧 Configuring project...'))
    
    const replacements = {
      PROJECT_NAME: config.projectName,
      PROJECT_NAME_UPPER: config.projectName.toUpperCase().replace(/-/g, '_'),
      description: config.description,
      version: config.version,
      author: config.author,
      homepage: config.homepage,
      license: config.license,
      repository: config.repository,
      providerPackageName: config.providerPackageName
    }
    
    await replaceInAllFiles(targetDir, replacements)
    
    console.log(kleur.green('✓ Project configured'))
    
    // Install dependencies
    if (!config.skipInstall) {
      console.log(kleur.blue('📦 Installing dependencies...'))
      try {
        await runCommand('npm', ['install'], targetDir)
        console.log(kleur.green('✓ Dependencies installed'))
      } catch (error) {
        console.log(kleur.yellow('⚠ Failed to install dependencies. You can run "npm install" manually.'))
      }
    }
    
    // Initialize git repository
    if (!config.skipGit) {
      console.log(kleur.blue('🔄 Initializing git repository...'))
      try {
        await runCommand('git', ['init'], targetDir)
        await runCommand('git', ['add', '-A'], targetDir)
        await runCommand('git', ['commit', '-m', 'Initial commit'], targetDir)
        console.log(kleur.green('✓ Git repository initialized'))
      } catch (error) {
        console.log(kleur.yellow('⚠ Failed to initialize git repository. You can run "git init" manually.'))
      }
    }
    
    // Print success message
    console.log()
    console.log(kleur.green('🎉 Project created successfully!'))
    console.log()
    console.log('Next steps:')
    console.log(kleur.cyan(`  cd ${config.projectName}`))
    if (config.skipInstall) {
      console.log(kleur.cyan('  npm install'))
    }
    console.log(kleur.cyan('  npm run build'))
    console.log(kleur.cyan('  npm run start:local'))
    console.log()
    console.log('Learn more at: https://docs.boosterframework.com')
    
  } catch (error) {
    console.error(kleur.red('❌ Failed to create project:'))
    console.error(error)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  try {
    const config = await collectProjectInfo(args)
    await createProject(config)
  } catch (error) {
    console.error(kleur.red('❌ Error:'), error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(kleur.red('❌ Unexpected error:'), error)
    process.exit(1)
  })
}

export { main }