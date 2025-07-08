#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import degit from 'degit'
import prompts from 'prompts'
import kleur from 'kleur'
import { globby } from 'globby'
import { spawn } from 'child_process'

// Get the Booster version from the current package or a reasonable default
function getBoosterVersion(): string {
  try {
    // Read from the create package itself
    const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
    return packageJson.version
  } catch {
    return '3.2.0'
  }
}

interface ProjectConfig {
  projectName: string
  description: string
  version: string
  author: string
  homepage: string
  license: string
  repository: string
  template?: string
  packageManager: 'npm' | 'pnpm'
  skipInstall?: boolean
  skipGit?: boolean
}

class ForbiddenProjectName extends Error {
  constructor(
    public name: string,
    public restrictionText: string
  ) {
    super(`Project name cannot ${restrictionText}:\n\n    Found: '${name}'`)
  }
}

function assertNameIsCorrect(name: string): void {
  // Follow npm package naming guidelines:
  // - Lowercase only
  // - Max length ≤ 214 characters
  // - URL-safe characters only (no spaces or ~)('!* characters)
  // - Cannot begin with . or _ (unless scoped)
  // - No leading/trailing spaces
  // - No core/reserved names
  const maxProjectNameLength = 214

  if (name.length > maxProjectNameLength)
    throw new ForbiddenProjectName(name, `be longer than ${maxProjectNameLength} characters`)

  if (name.includes(' ')) throw new ForbiddenProjectName(name, 'contain spaces')

  if (name.toLowerCase() !== name) throw new ForbiddenProjectName(name, 'contain uppercase letters')

  // URL-unsafe characters according to npm guidelines
  if (/[~)('!*]/.test(name)) throw new ForbiddenProjectName(name, "contain URL-unsafe characters (~)'(!*)")

  if (name.startsWith('.') || name.startsWith('_')) throw new ForbiddenProjectName(name, 'begin with . or _')

  if (name.trim() !== name) throw new ForbiddenProjectName(name, 'have leading or trailing spaces')

  // Check for core/reserved names
  const reservedNames = ['http', 'node_modules', 'favicon.ico', 'npm', 'node', 'js', 'json']
  if (reservedNames.includes(name.toLowerCase())) throw new ForbiddenProjectName(name, `be a reserved name (${name})`)
}

function checkProjectAlreadyExists(name: string): void {
  const projectPath = path.join(process.cwd(), name)
  if (fs.existsSync(projectPath)) {
    throw new Error(
      `Directory "${name}" already exists. Please choose a different project name or remove the existing directory.`
    )
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
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
  const files = await globby(['**/*', '!node_modules/**', '!.git/**', '!**/node_modules/**'], {
    cwd: targetDir,
    dot: true,
    absolute: true,
  })

  for (const file of files) {
    const stat = fs.statSync(file)
    if (stat.isFile()) {
      await replaceInFile(file, replacements)
    }
  }
}

// Default values for project configuration
const defaults = {
  description: '',
  version: '0.1.0',
  author: '',
  homepage: '',
  license: 'MIT',
  repository: '',
  packageManager: 'npm' as const,
  skipInstall: false,
  skipGit: false,
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

  // Check if we should skip prompts (any required flags provided or skip flags set)
  const shouldSkipPrompts =
    flags['skip-install'] ||
    flags['skip-git'] ||
    Object.keys(flags).some((key) =>
      ['description', 'version', 'author', 'homepage', 'license', 'repository', 'package-manager'].includes(key)
    )

  let config: ProjectConfig

  if (shouldSkipPrompts) {
    // Use defaults with any provided flag values
    config = {
      projectName,
      description: (flags.description as string) || defaults.description,
      version: (flags.version as string) || defaults.version,
      author: (flags.author as string) || defaults.author,
      homepage: (flags.homepage as string) || defaults.homepage,
      license: (flags.license as string) || defaults.license,
      repository: (flags.repository as string) || defaults.repository,
      packageManager: (flags['package-manager'] as 'npm' | 'pnpm') || defaults.packageManager,
      template: flags.template as string,
      skipInstall: (flags['skip-install'] as boolean) || defaults.skipInstall,
      skipGit: (flags['skip-git'] as boolean) || defaults.skipGit,
    }
  } else {
    // Collect information via prompts
    const responses = await prompts([
      {
        type: 'text',
        name: 'description',
        message: "What's your project description?",
        initial: (flags.description as string) || defaults.description,
      },
      {
        type: 'text',
        name: 'version',
        message: "What's the first version?",
        initial: (flags.version as string) || defaults.version,
      },
      {
        type: 'text',
        name: 'author',
        message: "Who's the author?",
        initial: (flags.author as string) || defaults.author,
      },
      {
        type: 'text',
        name: 'homepage',
        message: "What's the website?",
        initial: (flags.homepage as string) || defaults.homepage,
      },
      {
        type: 'text',
        name: 'license',
        message: 'What license will you be publishing this under?',
        initial: (flags.license as string) || defaults.license,
      },
      {
        type: 'text',
        name: 'repository',
        message: "What's the URL of the repository?",
        initial: (flags.repository as string) || defaults.repository,
      },
      {
        type: 'select',
        name: 'packageManager',
        message: 'Which package manager would you like to use?',
        choices: [
          { title: 'npm', value: 'npm' },
          { title: 'pnpm', value: 'pnpm' },
        ],
        initial: (flags['package-manager'] as string) === 'pnpm' ? 1 : 0,
      },
    ])

    config = {
      projectName,
      description: responses.description || defaults.description,
      version: responses.version || defaults.version,
      author: responses.author || defaults.author,
      homepage: responses.homepage || defaults.homepage,
      license: responses.license || defaults.license,
      repository: responses.repository || defaults.repository,
      packageManager: responses.packageManager || defaults.packageManager,
      template: flags.template as string,
      skipInstall: (flags['skip-install'] as boolean) || defaults.skipInstall,
      skipGit: (flags['skip-git'] as boolean) || defaults.skipGit,
    }
  }

  return config
}

async function createProject(config: ProjectConfig): Promise<void> {
  const targetDir = path.join(process.cwd(), config.projectName)

  console.log(kleur.blue('📦 Creating project...'))

  // Determine template source - default to GitHub template
  const templateSource = config.template || 'github.com/boostercloud/boosterai/templates/default'

  try {
    // Check if template is a local path
    const isLocalPath = templateSource.startsWith('/') || templateSource.startsWith('./') || templateSource.startsWith('../')
    
    if (isLocalPath) {
      // Copy local template directory
      console.log(kleur.blue('📁 Copying local template...'))
      const fs = await import('fs/promises')
      
      // Ensure source template exists
      try {
        await fs.access(templateSource)
      } catch (error) {
        throw new Error(`Template directory not found: ${templateSource}`)
      }
      
      // Copy template files recursively
      await fs.cp(templateSource, targetDir, { recursive: true })
      console.log(kleur.green('✓ Template copied'))
    } else {
      // Clone template using degit (from GitHub/remote)
      console.log(kleur.blue('🌐 Cloning template...'))
      const emitter = degit(templateSource, { cache: false, force: true })
      await emitter.clone(targetDir)
      console.log(kleur.green('✓ Template copied'))
    }

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
      boosterVersion: getBoosterVersion(),
    }

    await replaceInAllFiles(targetDir, replacements)

    console.log(kleur.green('✓ Project configured'))

    // Install dependencies
    if (!config.skipInstall) {
      console.log(kleur.blue('📦 Installing dependencies...'))
      try {
        switch (config.packageManager) {
          case 'pnpm':
            await runCommand('pnpm', ['install'], targetDir)
            break
          case 'npm':
            await runCommand('npm', ['install'], targetDir)
            break
          default:
            throw new Error(`Unsupported package manager: ${config.packageManager}`)
        }

        console.log(kleur.green('✓ Dependencies installed'))
      } catch (error) {
        console.log(
          kleur.yellow(`⚠ Failed to install dependencies. You can run "${config.packageManager} install" manually.`)
        )
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
      console.log(kleur.cyan(`  ${config.packageManager} install`))
    }
    console.log(kleur.cyan(`  ${config.packageManager} run build`))
    console.log(kleur.cyan(`  ${config.packageManager} run start:local`))
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

// Check if this file is being run directly
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(kleur.red('❌ Unexpected error:'), error)
    process.exit(1)
  })
}

export { main, assertNameIsCorrect, checkProjectAlreadyExists, replaceInFile }
