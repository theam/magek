export const CQRS_FLOW_PROMPT_NAME = 'magek_cqrs_flow'

export const CQRS_FLOW_PROMPT_DESCRIPTION =
  'Complete guide for implementing a CQRS feature end-to-end in Magek'

export interface CqrsFlowArguments {
  feature: string
}

export function getCqrsFlowPrompt(args: CqrsFlowArguments): string {
  const { feature } = args

  return `# Implementing "${feature}" in Magek

Follow this guide to implement the "${feature}" feature using Magek's CQRS pattern.

## Overview

Magek follows the CQRS (Command Query Responsibility Segregation) pattern with Event Sourcing:

\`\`\`
Command → Event → Entity → Read Model
   ↓         ↓        ↓          ↓
User     Immutable  State    Query
Intent    Facts    Reducer   Access
\`\`\`

## Step 1: Define the Command

Commands represent user intent. Create a command that captures what the user wants to do.

\`\`\`bash
npx magek new:command <CommandName> --fields <field1:type1> <field2:type2>
\`\`\`

**Best Practices:**
- Use imperative naming (Create, Update, Delete, Archive)
- Include only the fields needed to perform the action
- Commands should be named after what the user wants to do, not technical operations

**Example for "${feature}":**
\`\`\`typescript
@Command({ authorize: 'all' })
export class <CommandName> {
  public constructor(
    // Add fields that represent the command parameters
    readonly field1: string,
    readonly field2: number,
  ) {}

  public static async handle(
    command: <CommandName>,
    register: Register
  ): Promise<void> {
    // Validate the command
    // Generate a unique ID for the entity
    const entityId = UUID.generate()

    // Register the event
    register.events(new <EventName>(entityId, command.field1, command.field2))
  }
}
\`\`\`

## Step 2: Define the Event

Events are immutable facts. They record what happened as a result of the command.

\`\`\`bash
npx magek new:event <EventName> --fields <field1:type1> <field2:type2>
\`\`\`

**Best Practices:**
- Use past tense naming (Created, Updated, Deleted, Archived)
- Include the entity ID and all data needed to reconstruct state
- Events should be self-contained and meaningful

**Example:**
\`\`\`typescript
@Event
export class <EventName> {
  public constructor(
    readonly entityId: UUID,
    readonly field1: string,
    readonly field2: number,
  ) {}

  public entityID(): UUID {
    return this.entityId
  }
}
\`\`\`

## Step 3: Define the Entity

Entities maintain state by reducing events. They are the aggregate roots.

\`\`\`bash
npx magek new:entity <EntityName> --fields <field1:type1> <field2:type2> --reduces <EventName>
\`\`\`

**Best Practices:**
- One entity per aggregate root
- Entities should only contain state derived from events
- Use the \`@Reduces\` decorator to specify which events affect this entity

**Example:**
\`\`\`typescript
@Entity
export class <EntityName> {
  public constructor(
    readonly id: UUID,
    readonly field1: string,
    readonly field2: number,
  ) {}

  @Reduces(<EventName>)
  public static reduce<EventName>(
    event: <EventName>,
    currentEntity?: <EntityName>
  ): <EntityName> {
    return new <EntityName>(
      event.entityId,
      event.field1,
      event.field2,
    )
  }
}
\`\`\`

## Step 4: Define the Read Model

Read models provide optimized query access to your data.

\`\`\`bash
npx magek new:read-model <ReadModelName> --fields <field1:type1> <field2:type2> --projects <EntityName>:id
\`\`\`

**Best Practices:**
- Design read models for specific query use cases
- Include only the fields needed for queries
- You can have multiple read models projecting the same entity

**Example:**
\`\`\`typescript
@ReadModel({
  authorize: 'all'
})
export class <ReadModelName> {
  public constructor(
    readonly id: UUID,
    readonly field1: string,
    readonly field2: number,
  ) {}

  @Projects(<EntityName>, 'id')
  public static project<EntityName>(
    entity: <EntityName>,
    currentReadModel?: <ReadModelName>
  ): ProjectionResult<<ReadModelName>> {
    return new <ReadModelName>(
      entity.id,
      entity.field1,
      entity.field2,
    )
  }
}
\`\`\`

## Step 5: (Optional) Add Event Handlers

If your feature needs side effects (send emails, call APIs), add an event handler.

\`\`\`bash
npx magek new:event-handler <HandlerName> --event <EventName>
\`\`\`

**Example:**
\`\`\`typescript
@EventHandler(<EventName>)
export class <HandlerName> {
  public static async handle(event: <EventName>): Promise<void> {
    // Perform side effects here
    // e.g., send email, call external API, etc.
  }
}
\`\`\`

## Verification Checklist

After implementing all components:

1. ✅ Command validates input and registers events
2. ✅ Event contains all data needed to reconstruct state
3. ✅ Entity correctly reduces events to state
4. ✅ Read model projects entity state for queries
5. ✅ All files are registered in your application

## Testing

Run your Magek server and test via GraphQL:

\`\`\`bash
npx magek start
\`\`\`

Then test your mutation:
\`\`\`graphql
mutation {
  <CommandName>(input: { field1: "value", field2: 123 })
}
\`\`\`

And query:
\`\`\`graphql
query {
  <ReadModelName>s {
    id
    field1
    field2
  }
}
\`\`\`

## Common Patterns

### Authorization
Use the \`authorize\` option to control access:
- \`'all'\` - Anyone can access
- \`'authenticated'\` - Must be logged in
- \`['admin']\` - Specific roles only

### Validation
Validate in the command handler before registering events:
\`\`\`typescript
if (!command.field1) {
  throw new InvalidParameterError('field1 is required')
}
\`\`\`

### Entity References
Reference other entities using their UUID:
\`\`\`typescript
readonly relatedEntityId: UUID
\`\`\`
`
}

export function getCqrsFlowPromptDefinition() {
  return {
    name: CQRS_FLOW_PROMPT_NAME,
    description: CQRS_FLOW_PROMPT_DESCRIPTION,
    arguments: [
      {
        name: 'feature',
        description:
          'The feature to implement (e.g., "Create Product", "User Registration")',
        required: true,
      },
    ],
  }
}
