export const TROUBLESHOOTING_PROMPT_NAME = 'magek_troubleshoot'

export const TROUBLESHOOTING_PROMPT_DESCRIPTION =
  'Common Magek issues and solutions'

export interface TroubleshootingArguments {
  issue?: string
}

export function getTroubleshootingPrompt(args: TroubleshootingArguments): string {
  const { issue } = args

  const intro = issue
    ? `# Troubleshooting: ${issue}\n\nHere are solutions for issues related to "${issue}":\n\n`
    : '# Magek Troubleshooting Guide\n\nCommon issues and their solutions:\n\n'

  return `${intro}## GraphQL Schema Issues

### Schema not updating after adding new components

**Symptoms:**
- New commands/queries don't appear in GraphQL playground
- Types are missing from schema

**Solutions:**
1. Make sure all components are exported from your main index file
2. Restart the development server (\`npx magek start\`)
3. Check that decorators are correctly applied (\`@Command\`, \`@Event\`, \`@Entity\`, \`@ReadModel\`)
4. Verify imports are correct (no circular dependencies)

\`\`\`typescript
// src/index.ts - ensure all components are exported
export * from './commands/CreateProduct'
export * from './events/ProductCreated'
export * from './entities/Product'
export * from './read-models/ProductReadModel'
\`\`\`

---

## Event Issues

### Events not being reduced by Entity

**Symptoms:**
- Entity state doesn't update after command executes
- Read model stays empty

**Solutions:**
1. Verify the \`@Reduces\` decorator references the correct event class
2. Check that the event's \`entityID()\` method returns the correct ID
3. Ensure the reduce method returns a new entity instance (not mutating)

\`\`\`typescript
import { evolve } from '@magek/common'

@Entity
export class Product {
  // Make sure decorator references the actual event class
  @Reduces(ProductCreated)  // ✅ Correct
  @Reduces('ProductCreated') // ❌ Won't work
  public static reduceProductCreated(event: ProductCreated, current?: Product): Product {
    return evolve(current, {
      id: event.entityId,
      name: event.name,
    })
  }
}
\`\`\`

### Events registered but command returns error

**Symptoms:**
- Command throws error even though events were registered

**Solutions:**
1. Check for validation errors before registering events
2. Ensure all event constructor parameters are provided
3. Verify UUID generation is working

---

## Authorization Issues

### "Unauthorized" error on commands/queries

**Symptoms:**
- 401 or 403 errors when executing mutations/queries
- Works in playground but fails in app

**Solutions:**
1. Check the \`authorize\` option in decorators:
   \`\`\`typescript
   @Command({ authorize: 'all' })  // Public access
   @Command({ authorize: 'authenticated' })  // Requires login
   @Command({ authorize: ['admin'] })  // Requires admin role
   \`\`\`

2. If using authentication, ensure JWT token is valid
3. Verify token is passed in Authorization header:
   \`\`\`
   Authorization: Bearer <token>
   \`\`\`

---

## Read Model Issues

### Read model not updating

**Symptoms:**
- Queries return stale data
- Entity exists but read model is empty

**Solutions:**
1. Verify \`@Projects\` decorator is correct:
   \`\`\`typescript
   @Projects(Product, 'id')  // Must match entity and join key
   public static projectProduct(entity: Product): ProductReadModel {
     return new ProductReadModel(entity.id, entity.name)
   }
   \`\`\`

2. Check the projection method returns the correct type
3. Ensure the join key exists on the entity

### Read model returns null for existing entity

**Solutions:**
1. Check if the entity ID matches what's used in the projection
2. Verify the projection method handles all entity states
3. Look for errors in the server logs

---

## Entity Issues

### "Entity not found" errors

**Symptoms:**
- Commands that update existing entities fail
- Entity lookup returns undefined

**Solutions:**
1. Verify the entity ID is correct (UUID format)
2. Check that the entity has been created (initial event was processed)
3. Use \`fetchEntityByID\` or \`fetchEntityByKey\` correctly:
   \`\`\`typescript
   const entity = await entityProvider.fetchEntityByID(Product, entityId)
   if (!entity) {
     throw new InvalidParameterError('Product not found')
   }
   \`\`\`

### Reducer returns incorrect state

**Symptoms:**
- Entity state not updating as expected
- State appears corrupted or missing fields
- Immutability violations

**Solutions:**
1. **Always use \`evolve()\` for state updates** - never mutate directly:
   \`\`\`typescript
   // ✅ Correct - use evolve()
   return evolve(current, { name: event.newName })

   // ❌ Incorrect - mutates state directly
   current.name = event.newName
   return current

   // ❌ Incorrect - manual construction doesn't handle undefined
   return new Product(event.id, event.name)
   \`\`\`

2. Handle the case when \`current\` is undefined (new entity):
   \`\`\`typescript
   // evolve() handles this automatically
   return evolve(current, { id: event.id, name: event.name })
   \`\`\`

3. For update-only reducers, skip if entity doesn't exist:
   \`\`\`typescript
   if (!current) return ReducerAction.Skip
   return evolve(current, { name: event.newName })
   \`\`\`

---

## Development Server Issues

### Server won't start

**Symptoms:**
- Error on \`npx magek start\`
- Port already in use

**Solutions:**
1. Check if another process is using port 3000:
   \`\`\`bash
   lsof -i :3000
   kill -9 <PID>
   \`\`\`

2. Verify all dependencies are installed:
   \`\`\`bash
   npm install
   \`\`\`

3. Check for TypeScript compilation errors:
   \`\`\`bash
   npx tsc --noEmit
   \`\`\`

### Hot reload not working

**Solutions:**
1. Check file watcher limits (Linux):
   \`\`\`bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   \`\`\`

2. Restart the development server

---

## Type Errors

### TypeScript errors with decorators

**Symptoms:**
- "Unable to resolve signature" errors
- "Experimental decorator" warnings

**Solutions:**
1. Ensure \`tsconfig.json\` has decorator support:
   \`\`\`json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true
     }
   }
   \`\`\`

2. Make sure reflect-metadata is imported at the entry point

---

## Database/Persistence Issues

### Data not persisting across restarts

**Symptoms:**
- All data lost when server restarts
- Events not saved

**Solutions:**
1. Check database configuration in your environment
2. Verify the event store adapter is correctly configured
3. For development, NeDB stores data in \`.magek/\` directory

---

## Getting More Help

1. **Read the documentation**: \`magek://docs/index\`
2. **Check CLI reference**: \`magek://cli/reference\`
3. **Enable debug logging**: Set \`MAGEK_LOG_LEVEL=debug\`
4. **GitHub Issues**: https://github.com/theam/magek/issues
`
}

export function getTroubleshootingPromptDefinition() {
  return {
    name: TROUBLESHOOTING_PROMPT_NAME,
    description: TROUBLESHOOTING_PROMPT_DESCRIPTION,
    arguments: [
      {
        name: 'issue',
        description:
          'Specific issue description (optional, e.g., "GraphQL schema not updating")',
        required: false,
      },
    ],
  }
}
