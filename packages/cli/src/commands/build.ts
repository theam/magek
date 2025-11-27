import { Flags } from '@oclif/core'
import BaseCommand from '../common/base-command.ts'
import { compileProject } from '../services/config-service.ts'
import { checkCurrentDirIsAMagekProject } from '../services/project-checker.ts'
import { Script } from '../common/script.ts'
import Brand from '../common/brand.ts'

const runTasks = async (compileAndLoad: (ctx: string) => Promise<void>): Promise<void> =>
  Script.init(`boost ${Brand.dangerize('build')} 🚀`, Promise.resolve(process.cwd()))
    .step('Checking project structure', checkCurrentDirIsAMagekProject)
    .step('Building project', compileAndLoad)
    .info('Build complete!')
    .done()

export default class Build extends BaseCommand {
  public static description = 'Build the current application as configured in your `index.ts` file.'

  public static flags = {
    help: Flags.help({ char: 'h' }),
    verbose: Flags.boolean({
      description: 'display full error messages',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    await runTasks((ctx: string) => compileProject(process.cwd()))
  }

  async catch(fullError: Error) {
    const {
      flags: { verbose },
    } = await this.parse(Build)

    if (verbose) {
      console.error(fullError.message)
    }

    return super.catch(fullError)
  }
}
