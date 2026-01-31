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

export default class Query extends BaseCommand {
  public static description = "generate new query resource, write 'magek new' to see options"
  public static flags = {
    help: Flags.help({ char: 'h' }),
    fields: Flags.string({
      char: 'f',
      description: 'field list that this query will contain',
      multiple: true,
    }),
  }

  public static args = {
    queryName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Query)
    try {
      const fields = flags.fields || []
      if (!args.queryName) throw "You haven't provided a query name, but it is required, run with --help for usage"
      return run(args.queryName, fields)
    } catch (error) {
      console.error(error)
    }
  }
}

type QueryInfo = HasName & HasFields

const run = async (name: string, rawFields: Array<string>): Promise<void> =>
  Script.init(`magek ${Brand.energize('new:query')} 🚧`, joinParsers(parseName(name), parseFields(rawFields)))
    .step('Verifying project', checkCurrentDirIsAMagekProject)
    .step('Creating new query', generateQuery)
    .info('Query generated!')
    .done()

function generateImports(info: QueryInfo): Array<ImportDeclaration> {
  const queryFieldTypes = info.fields.map((f) => f.type)
  const queryUsesUUID = queryFieldTypes.some((type) => type == 'UUID')

  const componentsFromMagekCommon = ['QueryInfo']
  if (info.fields.length > 0) {
    componentsFromMagekCommon.unshift('Field')
  }
  if (queryUsesUUID) {
    componentsFromMagekCommon.push('UUID')
  }

  return [
    {
      packagePath: '@magek/core',
      commaSeparatedComponents: 'Query, returns',
    },
    {
      packagePath: '@magek/common',
      commaSeparatedComponents: componentsFromMagekCommon.join(', '),
    },
  ]
}

const generateQuery = (info: QueryInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'queries'),
    template: template('query'),
    info: {
      imports: generateImports(info),
      ...info,
    },
  })
