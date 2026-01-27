import { Flags, Args } from '@oclif/core'
import BaseCommand from '../../common/base-command.js'
import { Script } from '../../common/script.js'
import Brand from '../../common/brand.js'
import {
  HasFields,
  HasReaction,
  HasName,
  joinParsers,
  parseName,
  parseFields,
  parseReaction,
  ImportDeclaration,
} from '../../services/generator/target/index.js'
import * as path from 'path'
import { generate, template } from '../../services/generator.js'
import { checkCurrentDirIsAMagekProject } from '../../services/project-checker.js'
import { classNameToFileName } from '../../common/filenames.js'

export default class Entity extends BaseCommand {
  public static description = 'create a new entity'
  public static flags = {
    help: Flags.help({ char: 'h' }),
    fields: Flags.string({
      char: 'f',
      description: 'fields that this entity will contain',
      multiple: true,
    }),
    reduces: Flags.string({
      char: 'r',
      description: 'events that this entity will reduce to build its state',
      multiple: true,
    }),
  }

  public static args = {
    entityName: Args.string(),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Entity)

    try {
      const fields = flags.fields || []
      const events = flags.reduces || []
      if (!args.entityName) throw "You haven't provided an entity name, but it is required, run with --help for usage"
      return run(args.entityName, fields, events)
    } catch (error) {
      console.error(error)
    }
  }
}

type EntityInfo = HasName & HasFields & HasReaction

const run = async (name: string, rawFields: Array<string>, rawEvents: Array<string>): Promise<void> =>
  Script.init(
    `magek ${Brand.energize('new:entity')} 🚧`,
    joinParsers(parseName(name), parseFields(rawFields), parseReaction(rawEvents))
  )
    .step('Verifying project', checkCurrentDirIsAMagekProject)
    .step('Creating new entity', generateEntity)
    .info('Entity generated!')
    .done()

function generateImports(info: EntityInfo): Array<ImportDeclaration> {
  const eventsImports: Array<ImportDeclaration> = info.events.map((eventData) => {
    const fileName = classNameToFileName(eventData.eventName)
    return {
      packagePath: `../events/${fileName}`,
      commaSeparatedComponents: eventData.eventName,
    }
  })

  const coreComponents = ['Entity']
  if (info.events.length > 0) {
    coreComponents.push('Reduces')
  }

  const commonComponents = ['UUID']
  if (info.fields.length > 0) {
    commonComponents.unshift('Field')
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

const generateEntity = (info: EntityInfo): Promise<void> =>
  generate({
    name: info.name,
    extension: '.ts',
    placementDir: path.join('src', 'entities'),
    template: template('entity'),
    info: {
      imports: generateImports(info),
      ...info,
    },
  })
