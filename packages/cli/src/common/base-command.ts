import { Command } from '@oclif/core'
import { checkCurrentDirMagekVersion } from '../services/project-checker.js'
import { appendOnErrorsFile } from '../services/logger.js'

export default abstract class BaseCommand extends Command {
  async init() {
    await checkCurrentDirMagekVersion(this.config.version)
  }

  async catch(fullError: Error) {
    const errorMessage = fullError.message.split('\n')[0].replace('Error:', '')
    const logRefMessage = '\n(You can see the full error logs in ./errors.log)'
    const errorForFile = `\nboost ${this.id} ${this.argv.join(' ')}\n${fullError.message}`
    appendOnErrorsFile(errorForFile)
    return super.catch(new Error(errorMessage + logRefMessage))
  }
}
