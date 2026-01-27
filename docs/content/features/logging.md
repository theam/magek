---
title: "Logging"
group: "Features"
---

# Logging in Magek

If no configuration is provided, Magek uses the default JavaScript logging capabilities. Depending on the log level, it will call different logging methods:

- `console.debug` for `Level.debug`
- `console.info` for `Level.info`
- `console.warn` for `Level.warn`
- `console.error` for `Level.error`

In this regard, there's no distinction from any other node process and you'll find the logs in your standard output.

## Advanced logging

You may need some advanced logging capabilities, such as redirecting your logs to a log aggregator. Magek also supports overriding the default behavior by providing custom loggers. The only thing you need to do is to provide an object that implements the `Logger` interface at config time:

```typescript title="@magek/common/lib/logger.ts"
interface Logger {
  debug(message?: any, ...optionalParams: any[]): void
  info(message?: any, ...optionalParams: any[]): void
  warn(message?: any, ...optionalParams: any[]): void
  error(message?: any, ...optionalParams: any[]): void
}
```

```typescript title="src/config/config.ts"

Magek.configure('development', (config: MagekConfig): void => {
  config.appName = 'my-store'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  // highlight-start
  config.logger = new MyCustomLogger() // Overrides the default logger object
  config.logLevel = Level.debug        // Sets the log level at 'debug'     
  config.logPrefix = 'my-store-dev'    // Sets the default prefix
  // highlight-end
})
```

## Using the Magek's logger

All framework's components will use this logger by default and will generate logs that match the following pattern:

```text
[<logPrefix>]|moduleName: <message>
```

You can get a custom logger instance that extends the configured logger by adding your moduleName and optionally overriding the configured prefix with the `getLogger` helper function. It's a good practice to build and use a separate logger instance built with this method for each context, as this will make it easier to filter your logs when you need to investigate a problem.

_Example: Obtaining a logger for your command:_

```typescript
@Command({
  authorize: [User],
})
export class UpdateShippingAddress {
  @Field()
  readonly cartId!: UUID

  @Field()
  readonly address!: Address

  public static async handle(command: UpdateShippingAddress, register: Register): Promise<void> {
    const logger = getLogger(Magek.config, 'UpdateShippingCommand#handler', 'MyApp')
    logger.debug(`User ${register.currentUser?.username} changed shipping address for cart ${command.cartId}: ${JSON.stringify(command.address}`)
    register.events(new ShippingAddressUpdated(command.cartId, command.address))
  }
}
```

When a `UpdateShippingAddress` command is handled, it wil log messages that look like the following:

```text
[MyApp]|UpdateShippingCommand#handler: User buyer42 changed shipping address for cart 314: { street: '13th rue del percebe', number: 6, ... }
```

Using the configured Magek logger is not mandatory for your application, but it might be convenient to centralize your logs and this is a standard way to do it.
