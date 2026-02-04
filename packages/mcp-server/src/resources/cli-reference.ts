export const CLI_REFERENCE_URI = 'magek://cli/reference'

export const CLI_REFERENCE_CONTENT = `# Magek CLI Commands

Comprehensive reference for all Magek CLI scaffolding commands. These commands generate TypeScript files following Magek conventions.

## Scaffolding Commands

### Create a Command

Commands represent user intent that triggers events. They are the entry point for all write operations.

\`\`\`bash
npx magek new:command <Name> --fields field1:type1 field2:type2
\`\`\`

**Example:**
\`\`\`bash
npx magek new:command CreateProduct --fields sku:string price:number description:string
\`\`\`

**Available field types:** string, number, boolean, UUID, Date

---

### Create an Event

Events are immutable facts that happened in the system. They are the source of truth.

\`\`\`bash
npx magek new:event <Name> --fields field1:type1 field2:type2
\`\`\`

**Example:**
\`\`\`bash
npx magek new:event ProductCreated --fields productId:UUID sku:string price:number
\`\`\`

---

### Create an Entity

Entities (aggregate roots) maintain state from events. Use --reduces to specify which events the entity handles.

\`\`\`bash
npx magek new:entity <Name> --fields field1:type1 field2:type2 --reduces EventName
\`\`\`

**Example:**
\`\`\`bash
npx magek new:entity Product --fields sku:string price:number inStock:boolean --reduces ProductCreated
\`\`\`

---

### Create a Read Model

Read models are query-optimized projections. Use --projects to specify which entity to project.

\`\`\`bash
npx magek new:read-model <Name> --fields field1:type1 field2:type2 --projects Entity:joinKey
\`\`\`

**Example:**
\`\`\`bash
npx magek new:read-model ProductReadModel --fields sku:string price:number name:string --projects Product:id
\`\`\`

---

### Create an Event Handler

Event handlers react to events and perform side effects (send emails, call external APIs, etc.).

\`\`\`bash
npx magek new:event-handler <Name> --event EventName
\`\`\`

**Example:**
\`\`\`bash
npx magek new:event-handler SendWelcomeEmail --event UserRegistered
\`\`\`

---

### Create a Scheduled Command

Scheduled commands run on a cron schedule for recurring tasks.

\`\`\`bash
npx magek new:scheduled-command <Name>
\`\`\`

**Example:**
\`\`\`bash
npx magek new:scheduled-command CleanupExpiredSessions
\`\`\`

---

### Create a Query

Queries retrieve data from read models without side effects.

\`\`\`bash
npx magek new:query <Name> --fields field1:type1
\`\`\`

**Example:**
\`\`\`bash
npx magek new:query GetProductBySku --fields sku:string
\`\`\`

---

### Create a Type

Custom types for domain modeling.

\`\`\`bash
npx magek new:type <Name> --fields field1:type1 field2:type2
\`\`\`

**Example:**
\`\`\`bash
npx magek new:type Money --fields amount:number currency:string
\`\`\`

---

## Project Initialization

### Create a New Magek Project

\`\`\`bash
npx create-magek my-app
\`\`\`

Or with pnpm:
\`\`\`bash
pnpm create magek my-app
\`\`\`

---

## Development Server

### Start the Development Server

\`\`\`bash
npx magek start
\`\`\`

This starts:
- GraphQL API at http://localhost:3000/graphql
- GraphQL Playground for testing queries

---

## Field Type Reference

| Type | Description | Example |
|------|-------------|---------|
| \`string\` | Text values | \`name:string\` |
| \`number\` | Numeric values | \`price:number\` |
| \`boolean\` | True/false values | \`isActive:boolean\` |
| \`UUID\` | Unique identifiers | \`productId:UUID\` |
| \`Date\` | Date/time values | \`createdAt:Date\` |

## Tips for Claude Code

When helping users scaffold Magek components:

1. **Start with the Command** - This defines the user action
2. **Create the Event** - This records what happened
3. **Create the Entity** - This maintains the state
4. **Create the Read Model** - This provides query access

Always use descriptive names that reflect the domain (e.g., \`CreateOrder\` not \`Create\`).
`

export interface CliReferenceResource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export function getCliReferenceResource(): CliReferenceResource {
  return {
    uri: CLI_REFERENCE_URI,
    name: 'Magek CLI Reference',
    description: 'Complete reference for Magek CLI scaffolding commands',
    mimeType: 'text/markdown',
  }
}

export function readCliReference(): { content: string; mimeType: string } {
  return {
    content: CLI_REFERENCE_CONTENT,
    mimeType: 'text/markdown',
  }
}
