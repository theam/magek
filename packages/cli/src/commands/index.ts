import Clean from './clean.js'
import AddProjection from './add/projection.js'
import AddReducer from './add/reducer.js'
import NewCommand from './new/command.js'
import NewEntity from './new/entity.js'
import NewEventHandler from './new/event-handler.js'
import NewEvent from './new/event.js'
import NewQuery from './new/query.js'
import NewReadModel from './new/read-model.js'
import NewScheduledCommand from './new/scheduled-command.js'
import NewType from './new/type.js'
import StubPublish from './stub/publish.js'

export const COMMANDS = {
  clean: Clean,
  'add:projection': AddProjection,
  'add:reducer': AddReducer,
  'new:command': NewCommand,
  'new:entity': NewEntity,
  'new:event-handler': NewEventHandler,
  'new:event': NewEvent,
  'new:query': NewQuery,
  'new:read-model': NewReadModel,
  'new:scheduled-command': NewScheduledCommand,
  'new:type': NewType,
  'stub:publish': StubPublish,
}
