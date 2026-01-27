import { Flags, Args } from '@oclif/core'
import BaseCommand from '../../common/base-command.js'
import { Script } from '../../common/script.js'
import Brand from '../../common/brand.js'
import {
  HasFields,
  HasName,
  joinParsers,
  parseName,
  parseFields,
  ImportDeclaration,
} from '../../services/generator/target/index.js'
import { generate, template } from '../../services/generator.js'
import * as path from 'path'
import { checkCurrentDirIsAMagekProject } from '../../services/project-checker.js'

export default class Type extends BaseCommand {
  public static description = 'create a new type'

  public static flags = {
    help: Flags.help({ char: 'h' }),
    fields: Flags.string({
      char: 'f',
      description: 'field that this type will contain',
      multiple: true,
    }),
  }

  public static args = {
    typeName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Type)

    try {
      const fields = flags.fields || []
      if (!args.typeName) throw "You haven't provided a type name, but it is required, run with --help for usage"
      return run(args.typeName, fields)
    } catch (error) {
      console.error(error)
    }
  }
}

type TypeInfo = HasName & HasFields

const run = async (name: string, rawFields: Array<string>): Promise<void> =>
  Script.init(`magek ${Brand.energize('new:type')} 🚧`, joinParsers(parseName(name), parseFields(rawFields)))
    .step('Verifying project', checkCurrentDirIsAMagekProject)
    .step('Creating new type', generateType)
    .info('Type generated!')
    .done()

function generateImports(info: TypeInfo): Array<ImportDeclaration> {
  const typeFieldTypes = info.fields.map((f) => f.type)
  const typeUsesUUID = typeFieldTypes.some((type) => type == 'UUID')

  const componentsFromMagekCommon: string[] = []
  if (info.fields.length > 0) {
    componentsFromMagekCommon.push('Field')
  }
  if (typeUsesUUID) {
    componentsFromMagekCommon.push('UUID')
  }

  if (componentsFromMagekCommon.length === 0) {
    return []
  }

  return [
    {
      packagePath: '@magek/common',
      commaSeparatedComponents: componentsFromMagekCommon.join(', '),
    },
  ]
}

const generateType = (info: TypeInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'common'),
    template: template('type'),
    info: {
      imports: generateImports(info),
      ...info,
    },
  })
