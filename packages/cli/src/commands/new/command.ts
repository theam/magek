import { Flags, Args } from '@oclif/core'
import BaseCommand from '../../common/base-command.js'
import { Script } from '../../common/script.js'
import Brand from '../../common/brand.js'
import { generate, template } from '../../services/generator.js'
import {
  HasName,
  HasFields,
  joinParsers,
  parseName,
  parseFields,
  ImportDeclaration,
} from '../../services/generator/target/index.js'
import * as path from 'path'
import { checkCurrentDirIsAMagekProject } from '../../services/project-checker.js'

export default class Command extends BaseCommand {
  public static description = "Generate new resource, write 'magek new' to see options"

  public static flags = {
    help: Flags.help({ char: 'h' }),
    fields: Flags.string({
      char: 'f',
      description: 'Field that this command will contain',
      multiple: true,
    }),
  }

  public static args = {
    commandName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Command)
    try {
      const fields = flags.fields || []
      if (!args.commandName) throw "You haven't provided a command name, but it is required, run with --help for usage"
      return run(args.commandName, fields)
    } catch (error) {
      console.error(error)
    }
  }
}

type CommandInfo = HasName & HasFields

const run = async (name: string, rawFields: Array<string>): Promise<void> =>
  Script.init(`magek ${Brand.energize('new:command')} 🚧`, joinParsers(parseName(name), parseFields(rawFields)))
    .step('Verifying project', checkCurrentDirIsAMagekProject)
    .step('Creating new command', generateCommand)
    .info('Command generated!')
    .done()

function generateImports(info: CommandInfo): Array<ImportDeclaration> {
  const commandFieldTypes = info.fields.map((f) => f.type)
  const commandUsesUUID = commandFieldTypes.some((type) => type == 'UUID')

  const componentsFromMagekCommon = ['Register']
  if (info.fields.length > 0) {
    componentsFromMagekCommon.unshift('Field')
  }
  if (commandUsesUUID) {
    componentsFromMagekCommon.push('UUID')
  }

  return [
    {
      packagePath: '@magek/core',
      commaSeparatedComponents: 'Command',
    },
    {
      packagePath: '@magek/common',
      commaSeparatedComponents: componentsFromMagekCommon.join(', '),
    },
  ]
}

const generateCommand = (info: CommandInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'commands'),
    template: template('command'),
    info: {
      imports: generateImports(info),
      ...info,
    },
  })
