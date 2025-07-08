import { Flags, Args } from '@oclif/core'
import BaseCommand from '../../common/base-command.js'
import { Script } from '../../common/script.js'
import Brand from '../../common/brand.js'
import { generate, template } from '../../services/generator.js'
import { HasName, joinParsers, parseName, ImportDeclaration } from '../../services/generator/target/index.js'
import * as path from 'path'
import { checkCurrentDirIsABoosterProject } from '../../services/project-checker.js'

export default class ScheduledCommand extends BaseCommand {
  public static description = "generate new scheduled command, write 'boost new:scheduled-command -h' to see options"
  public static flags = {
    help: Flags.help({ char: 'h' }),
  }

  public static args = {
    scheduledCommandName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(ScheduledCommand as any)

    try {
      if (!args.scheduledCommandName)
        throw "You haven't provided a scheduled command name, but it is required, run with --help for usage"
      return run(args.scheduledCommandName)
    } catch (error) {
      console.error(error)
    }
  }
}

type ScheduledCommandInfo = HasName

const run = async (name: string): Promise<void> =>
  Script.init(`boost ${Brand.energize('new:scheduled-command')} 🚧`, joinParsers(parseName(name)))
    .step('Verifying project', checkCurrentDirIsABoosterProject)
    .step('Creating new scheduled command', generateScheduledCommand)
    .info('Scheduled command generated!')
    .done()

function generateImports(): Array<ImportDeclaration> {
  const componentsFromBoosterTypes = ['Register']
  return [
    {
      packagePath: '@booster-ai/core',
      commaSeparatedComponents: 'ScheduledCommand',
    },
    {
      packagePath: '@booster-ai/common',
      commaSeparatedComponents: componentsFromBoosterTypes.join(', '),
    },
  ]
}

const generateScheduledCommand = (info: ScheduledCommandInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'scheduled-commands'),
    template: template('scheduled-command'),
    info: {
      imports: generateImports(),
      ...info,
    },
  })
