# Change Log - @magek/core

This log was last generated on Wed, 04 Feb 2026 22:30:21 GMT and should not be manually modified.

## 0.0.10
Wed, 04 Feb 2026 22:30:21 GMT

### Patches

- fix(core): correct EventHandlerInterface type for TC39 decorators

## 0.0.9
Wed, 04 Feb 2026 21:36:16 GMT

### Minor changes

- Forced version bump due to incomplete v0.0.8 release (some packages failed to publish to npm)

## 0.0.8
Wed, 04 Feb 2026 19:54:30 GMT

### Patches

- Add @returns decorator for command handler return type inference. Users can now specify the return type of their command's handle method using the @returns decorator, which will be properly reflected in the generated GraphQL schema.

### Updates

- refactor: extract internal utilities to their packages

## 0.0.7
Sat, 31 Jan 2026 11:54:24 GMT

### Minor changes

- Handle ReducerAction.Skip in event-store and rename ReadModelAction to ProjectionAction in read-model-store
- Complete TC39 Stage 3 decorators migration. Rename decorators to camelCase: @reduces, @projects, @calculatedField, @toVersion, @trace, @nonExposed. Remove all legacy decorator support. Remove experimentalDecorators from all configs.

### Patches

- Fix @Command decorator to allow fieldless commands without requiring @field() properties

### Updates

- Move createdAt assignment from adapter to framework
- Add delete-event-dispatcher tests
- Bump jwks-rsa from 3.2.1 to 3.2.2

## 0.0.6
Tue, 27 Jan 2026 18:50:37 GMT

_Version update only_

## 0.0.5
Sat, 24 Jan 2026 18:28:05 GMT

_Version update only_

## 0.0.4
Fri, 23 Jan 2026 18:30:48 GMT

### Patches

- Improve MAGEK_ENV error message with detailed fix instructions

### Updates

- Update jwks-rsa from 3.2.0 to 3.2.1

## 0.0.3
Thu, 22 Jan 2026 16:08:02 GMT

### Minor changes

- Update GraphQL generator to use UUID instead of TimeKey for sequence keys

### Patches

- Add CLI adapter plugin discovery.
- refactor: rename ProviderLibrary to Runtime and update runtime usage

### Updates

- No changes - merge artifact
- Bump inquirer from 13.1.0 to 13.2.0
- Bump @types/node from 22.19.3 to 22.19.6 to resolve version mismatch
- Bump @types/node to 22.19.7
- chore(deps): bump fastify from 5.6.2 to 5.7.1 in /packages/server
- Sync package versions to match npm registry (0.0.2)

