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
  HasProjections,
  parseProjections,
} from '../../services/generator/target/index.js'
import * as path from 'path'
import { generate, template } from '../../services/generator.js'
import { checkCurrentDirIsAMagekProject } from '../../services/project-checker.js'
import { classNameToFileName } from '../../common/filenames.js'

export default class ReadModel extends BaseCommand {
  public static description = 'create a new read model'
  public static flags = {
    help: Flags.help({ char: 'h' }),
    fields: Flags.string({
      char: 'f',
      description: 'fields that this read model will contain',
      multiple: true,
    }),
    projects: Flags.string({
      char: 'p',
      description: 'entities that this read model will project to build its state',
      multiple: true,
    }),
  }

  public static args = {
    readModelName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ReadModel)

    try {
      const fields = flags.fields ?? []
      const projections = flags.projects ?? []
      if (!args.readModelName)
        throw "You haven't provided a read model name, but it is required, run with --help for usage"
      return run(args.readModelName, fields, projections)
    } catch (error) {
      console.error(error)
    }
  }
}

type ReadModelInfo = HasName & HasFields & HasProjections

const run = async (name: string, rawFields: Array<string>, rawProjections: Array<string>): Promise<void> =>
  Script.init(
    `magek ${Brand.energize('new:read-model')} 🚧`,
    joinParsers(parseName(name), parseFields(rawFields), parseProjections(rawProjections))
  )
    .step('Verifying project', checkCurrentDirIsAMagekProject)
    .step('Creating new read model', generateReadModel)
    .info('Read model generated!')
    .done()

function generateImports(info: ReadModelInfo): Array<ImportDeclaration> {
  const eventsImports: Array<ImportDeclaration> = info.projections.map((projection) => {
    const fileName = classNameToFileName(projection.entityName)
    return {
      packagePath: `../entities/${fileName}`,
      commaSeparatedComponents: projection.entityName,
    }
  })

  const coreComponents = ['ReadModel']
  if (info.projections.length > 0) {
    coreComponents.push('Projects')
  }

  const commonComponents = ['UUID']
  if (info.fields.length > 0) {
    commonComponents.unshift('Field')
  }
  if (info.projections.length > 0) {
    commonComponents.push('ProjectionResult')
  }

  return [
    {
      packagePath: '@magek/core',
      commaSeparatedComponents: coreComponents.join(', '),
    },
    {
      packagePath: '@magek/common',
      commaSeparatedComponents: commonComponents.join(', '),
    },
    ...eventsImports,
  ]
}

const generateReadModel = (info: ReadModelInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'read-models'),
    template: template('read-model'),
    info: {
      imports: generateImports(info),
      ...info,
    },
  })
