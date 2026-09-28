---
title: "Environment Configuration"
group: "Advanced"
---

# Environments

You can create multiple environments calling the `Magek.configure` function several times using different environment names as the first argument. You can create one file for each environment, but it is not required. In this example we set all environments in a single file:

```typescript
// Here we use a single file called src/config.ts, but you can use separate files for each environment too.

Magek.configure('stage', (config: MagekConfig): void => {
  config.appName = 'fruit-store-stage'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.readModelStoreAdapter = readModelStore
  config.sessionStoreAdapter = sessionStore
})

Magek.configure('prod', (config: MagekConfig): void => {
  config.appName = 'fruit-store-prod'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.readModelStoreAdapter = readModelStore
  config.sessionStoreAdapter = sessionStore
})
```

## Programmatic initialization

`Magek.config` is created the first time something reads it. When `MAGEK_ENV` is already set, that value is the environment name. That is the path used by the test runner and by apps that set the variable before startup.

You can set the name in code instead:

```typescript
import { Magek } from '@magek/core'

Magek.init('production')

Magek.configureCurrentEnv((config: MagekConfig): void => {
  config.appName = 'fruit-store'
})
```

`init` has to run before any module that uses Magek decorators or calls `Magek.configure` is evaluated. ES `import` declarations are hoisted, so a call written under those imports in the same file runs too late. Put `init` in a module that loads first, or import the rest of the app dynamically after `init`.

Calling `init` again with the same name does nothing. Calling it with a different name throws, including when config was already built from `MAGEK_ENV`.

## Pluggable Adapters

Magek uses a pluggable architecture for data storage, allowing you to choose the most appropriate storage solution for your needs. The framework provides several adapter types:

### Event Store Adapters
Event store adapters handle the storage and retrieval of events in your event-sourced system:

- `@magek/adapter-event-store-nedb` - A lightweight, file-based adapter perfect for development and testing

### Read Model Store Adapters  
Read model store adapters manage the storage of read models (projections of your domain state):

- `@magek/adapter-read-model-store-nedb` - A lightweight, file-based adapter perfect for development and testing

### Session Store Adapters
Session store adapters handle WebSocket connections and subscription management:

- `@magek/adapter-session-store-nedb` - A lightweight, file-based adapter perfect for development and testing

This modular approach allows you to:
- Start development quickly with simple file-based stores
- Switch to production-grade databases without changing your application code
- Create custom adapters for specific requirements
- Test your application with different storage backends

To use adapters, simply import them and assign them to the corresponding configuration properties (`config.eventStoreAdapter`, `config.readModelStoreAdapter`, `config.sessionStoreAdapter`) in your environment configuration.

## Environment Files

It is also possible to place an environment configuration in a separated file. Let's say that a developer called "John" created its own configuration file `src/config/john.ts`. The content would be the following:

```typescript

Magek.configure('john', (config: MagekConfig): void => {
  config.appName = 'john-fruit-store'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.readModelStoreAdapter = readModelStore
  config.sessionStoreAdapter = sessionStore
})
```

This way, you can have different configurations depending on your needs.

Magek environments are extremely flexible. As shown in the first example, your 'fruit-store' app can have three team-wide environments: 'dev', 'stage', and 'prod', each of them with different app names or configurations. Developers, like "John" in the second example, can create their own private environments in separate config files to test their changes before committing them.
