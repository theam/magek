import { Flags } from '@oclif/core'
import BaseCommand from '../common/base-command.js'
import { deployToCloudProvider } from '../services/provider-service.js'
import {
  cleanDeploymentSandbox,
  compileProjectAndLoadConfig,
  createDeploymentSandbox,
} from '../services/config-service.js'
import { BoosterConfig } from '@booster-ai/common'
import { Script } from '../common/script.js'
import Brand from '../common/brand.js'
import { logger } from '../services/logger.js'
import { currentEnvironment, initializeEnvironment } from '../services/environment.js'

const runTasks = async (
  compileAndLoad: Promise<BoosterConfig>,
  deployer: (config: BoosterConfig) => Promise<void>
): Promise<void> =>
  Script.init(`boost ${Brand.dangerize('deploy')} [${currentEnvironment()}] 🚀`, compileAndLoad)
    .step('Deploying', (config) => deployer(config))
    .step('Cleaning up deployment files', cleanDeploymentSandbox)
    .info('Deployment complete!')
    .done()

export default class Deploy extends BaseCommand {
  public static description = 'Deploy the current application as configured in your `index.ts` file.'

  public static flags = {
    help: Flags.help({ char: 'h' }),
    environment: Flags.string({
      char: 'e',
      description: 'environment configuration to run',
    }),
    verbose: Flags.boolean({
      description: 'display full error messages',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Deploy as any)

    if (initializeEnvironment(logger, flags.environment)) {
      const deploymentProjectPath = await createDeploymentSandbox()
      await runTasks(compileProjectAndLoadConfig(deploymentProjectPath), deployToCloudProvider)
    }
  }

  async catch(fullError: Error) {
    const {
      flags: { verbose },
    } = await this.parse(Deploy as any)

    if (verbose) {
      console.error(fullError.message)
    }

    return super.catch(fullError)
  }
}
