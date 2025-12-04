import * as path from 'path'
import * as Mustache from 'mustache'
import { Target, HasName, HasFields, HasReaction, HasEvent, HasProjections } from '../../src/services/generator/target/index.js'
import * as projectChecker from '../../src/services/project-checker.js'
import { generate, template } from '../../src/services/generator.js'
import { restore, replace, fake } from 'sinon'
import { expect } from '../expect.js'
import { createRequire } from 'module'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const fs: typeof import('fs-extra') = requireFn('fs-extra')

describe('generate service', (): void => {
  const projectCheckerInstance = projectChecker.projectChecker
  beforeEach(() => {
    replace(fs, 'outputFile', fake.resolves({}))
    replace(projectCheckerInstance, 'checkResourceExists', fake.resolves({}))
  })

  afterEach(() => {
    restore()
  })

  describe('generates file from default template', () => {
    it('command', async () => {
      type CommandInfo = HasName & HasFields
      const info: CommandInfo = {
        name: 'NewCommand',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<CommandInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'commands'),
        template: template('command'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/commands/new-command.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the command!')
    })

    it('entity', async () => {
      type EntityInfo = HasName & HasFields & HasReaction
      const info: EntityInfo = {
        name: 'NewEntity',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
        events: [{ eventName: 'product-purchased' }],
      }
      const target: Target<EntityInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'entities'),
        template: template('entity'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/entities/new-entity.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the entity!')
    })

    it('event handler', async () => {
      type EventHandlerInfo = HasName & HasEvent
      const info: EventHandlerInfo = {
        name: 'NewEventHandler',
        event: 'product-purchased',
      }

      const target: Target<EventHandlerInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'event-handlers'),
        template: template('event-handler'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/event-handlers/new-event-handler.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the event handler!')
    })

    it('event', async () => {
      type EventInfo = HasName & HasFields
      const info: EventInfo = {
        name: 'NewEvent',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<EventInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'events'),
        template: template('event'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/events/new-event.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the event!')
    })

    it('read model', async () => {
      type ReadModelInfo = HasName & HasFields & HasProjections
      const info: ReadModelInfo = {
        name: 'NewReadModel',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
        projections: [{ entityName: 'account', entityId: 'id' }],
      }

      const target: Target<ReadModelInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'read-models'),
        template: template('read-model'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/read-models/new-read-model.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the read model!')
    })

    it('scheduled command', async () => {
      type ScheduledCommandInfo = HasName
      const info: ScheduledCommandInfo = {
        name: 'NewScheduledCommand',
      }

      const target: Target<ScheduledCommandInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'scheduled-commands'),
        template: template('scheduled-command'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/scheduled-commands/new-scheduled-command.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the scheduled command!')
    })

    it('type', async () => {
      type TypeInfo = HasName & HasFields
      const info: TypeInfo = {
        name: 'NewType',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<TypeInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'common'),
        template: template('type'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(fs.outputFile).to.have.been.calledWithMatch('src/common/new-type.ts', rendered)
      expect(projectCheckerInstance.checkResourceExists).to.have.been.called
      expect(rendered).not.to.contain('-> Custom code in the type!')
    })
  })

  describe('generates file from custom template', () => {
    beforeEach(() => {
      replace(process, 'cwd', fake.returns(path.join(process.cwd(), 'test', 'fixtures', 'mock_project')))
    })

    it('command', async () => {
      type CommandInfo = HasName & HasFields
      const info: CommandInfo = {
        name: 'NewCommand',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<CommandInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'commands'),
        template: template('command'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the command!')
    })

    it('entity', async () => {
      type EntityInfo = HasName & HasFields & HasReaction
      const info: EntityInfo = {
        name: 'NewEntity',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
        events: [{ eventName: 'product-purchased' }],
      }
      const target: Target<EntityInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'entities'),
        template: template('entity'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the entity!')
    })

    it('event handler', async () => {
      type EventHandlerInfo = HasName & HasEvent
      const info: EventHandlerInfo = {
        name: 'NewEventHandler',
        event: 'product-purchased',
      }

      const target: Target<EventHandlerInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'event-handlers'),
        template: template('event-handler'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the event handler!')
    })

    it('event', async () => {
      type EventInfo = HasName & HasFields
      const info: EventInfo = {
        name: 'NewEvent',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<EventInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'events'),
        template: template('event'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the event!')
    })

    it('read model', async () => {
      type ReadModelInfo = HasName & HasFields & HasProjections
      const info: ReadModelInfo = {
        name: 'NewReadModel',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
        projections: [{ entityName: 'account', entityId: 'id' }],
      }

      const target: Target<ReadModelInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'read-models'),
        template: template('read-model'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the read model!')
    })

    it('scheduled command', async () => {
      type ScheduledCommandInfo = HasName
      const info: ScheduledCommandInfo = {
        name: 'NewScheduledCommand',
      }

      const target: Target<ScheduledCommandInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'scheduled-commands'),
        template: template('scheduled-command'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the scheduled command!')
    })

    it('type', async () => {
      type TypeInfo = HasName & HasFields
      const info: TypeInfo = {
        name: 'NewType',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
        ],
      }

      const target: Target<TypeInfo> = {
        name: info.name,
        extension: '.ts',
        placementDir: path.join('src', 'common'),
        template: template('type'),
        info: info,
      }
      const rendered = Mustache.render(target.template, { ...target.info })

      await generate(target)

      expect(rendered).to.contain('-> Custom code in the type!')
    })
  })
})
