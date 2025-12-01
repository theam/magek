import { Flags } from '@oclif/core'
import BaseCommand from '../common/base-command.js'
import { nukeCloudProviderResources } from '../services/provider-service.js'
import { compileProjectAndLoadConfig } from '../services/config-service.js'
import type { MagekConfig } from '@magek/common'
import { Script } from '../common/script.js'
import Brand from '../common/brand.js'
import Prompter from '../services/user-prompt.js'
import { logger } from '../services/logger.js'
import { currentEnvironment, initializeEnvironment } from '../services/environment.js'

export const runTasks = async (
  compileAndLoad: Promise<MagekConfig>,
  nuke: (config: MagekConfig) => Promise<void>
): Promise<void> =>
  Script.init(`boost ${Brand.dangerize('nuke')} [${currentEnvironment()}] 🧨`, compileAndLoad)
    .step('Removing', (config) => nuke(config))
    .info('Removal complete!')
    .done()

export async function askToConfirmRemoval(
  prompter: Prompter,
  force: boolean,
  config: Promise<MagekConfig>
): Promise<MagekConfig> {
  if (force) return config
  const configuration = await config
  const appName = await prompter.defaultOrPrompt(
    null,
    'Please, enter the app name to confirm deletion of all resources:'
  )
  if (appName == configuration.appName) {
    return configuration
  } else {
    throw new Error('Wrong app name, stopping nuke!')
  }
}

export default class Nuke extends BaseCommand {
  public static description =
    'Remove all resources used by the current application as configured in your `index.ts` file.'

  public static flags = {
    help: Flags.help({ char: 'h' }),
    environment: Flags.string({
      char: 'e',
      description: 'environment configuration to run',
    }),
    force: Flags.boolean({
      char: 'f',
      description:
        'Run nuke without asking for confirmation. Be EXTRA CAUTIOUS with this option, all your application data will be irreversibly DELETED without confirmation.',
    }),
    verbose: Flags.boolean({
      description: 'display full error messages',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Nuke)

    if (initializeEnvironment(logger, flags.environment)) {
      await runTasks(
        askToConfirmRemoval(new Prompter(), flags.force, compileProjectAndLoadConfig(process.cwd())),
        nukeCloudProviderResources
      )
    }
  }

  async catch(fullError: Error) {
    const {
      flags: { verbose },
    } = await this.parse(Nuke)

    if (verbose) {
      console.error(fullError.message)
    }

    return super.catch(fullError)
  }
}
