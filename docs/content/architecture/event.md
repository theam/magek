---
title: "Events"
group: "Architecture"
---

# Event

An event is a fact of something that has happened in your application. Every action that takes place on your application should be stored as an event. They are stored in a single collection, forming a set of **immutable records of facts** that contain the whole story of your application. This collection of events is commonly known as the **Event Store**.

## Creating an event

The Magek CLI will help you to create new events. You just need to run the following command and the CLI will generate all the boilerplate for you:

```bash
npx magek new:event StockMoved --fields productID:string origin:string destination:string quantity:number
```

This will generate a new file called `stock-moved.ts` in the `src/events` directory. You can also create the file manually, but you will need to create the class and decorate it, so we recommend using the CLI.

## Declaring an event

Events are the cornerstone of Magek because of its event-driven and event-sourced nature. Magek events are TypeScript classes decorated with `@Event`. An event class may look like this:

```typescript title="src/events/event-name.ts"
@Event
export class EventName {
  @field()
  public readonly field1!: SomeType

  @field()
  public readonly field2!: SomeOtherType

  public constructor(field1: SomeType, field2: SomeOtherType) {
    this.field1 = field1
    this.field2 = field2
  }

  public entityID(): UUID {
    return /* the associated entity ID */
  }
}
```

The class name is the name of the event. The event name is used to identify the event in the application. It is also used to generate the GraphQL schema. The class parameter names are the names of the fields of the event and their types are the types of the fields of the event.

## Events and entities

Events and [Entities](./entity.md) are closely related. Each event will be aggregated (or _reduced_) into an entity. Therefore, Magek needs a way to know which entity is associated with each event. For that reason, it is required to provide an entity ID with each event. You can declare it with a class function named `entityID`. For example:

```typescript title="src/events/cart-paid.ts"
@Event
export class CartPaid {
  @field()
  public readonly cartID!: UUID

  @field()
  public readonly paymentID!: UUID

  public constructor(cartID: UUID, paymentID: UUID) {
    this.cartID = cartID
    this.paymentID = paymentID
  }

  // highlight-start
  public entityID(): UUID {
    // returns cartID because we want to associate it with
    // (and reduce it within) the Cart entity
    return this.cartID
  }
  // highlight-end
}
```

> **Tip:** If your domain requires a **_Singleton_** entity, where there's only one instance of that entity in your whole application, you can return a constant value.

> **Caution:** Make sure that the `entityID` method always returns the same value for the same event's instance. Otherwise, the result of the entity reduction will be unpredictable.

## Registering events in the event store

We have shown you how to _declare_ an event in Magek, but we haven't explained how to store them in the event store. In Magek terminology, creating an instance of an event and storing in the event store is known as `registering` it. You can do that on Magek using the `register.events(...)` function. The `register` object is provided as a parameter in the `handle` method of both [commands](./command.md#registering-events) and the [event handlers](./event-handler.md#registering-events-from-an-event-handler). For example:

### Registering events from command handlers

```typescript title="src/commands/move-stock.ts"
@Command({
  authorize: [Admin],
})
export class MoveStock {
  @field()
  readonly productID!: string

  @field()
  readonly origin!: string

  @field()
  readonly destination!: string

  @field()
  readonly quantity!: number

  public static async handle(command: MoveStock, register: Register): Promise<void> {
    if (!command.enoughStock(command.origin, command.quantity, command.productID)) {
      // highlight-next-line
      register.events(new ErrorEvent(`There is not enough stock for ${command.productID} at ${command.origin}`))
    }
  }
}
```

### Registering events from event handlers

```typescript title="src/event-handlers/stock-moved.ts"
@EventHandler(StockMoved)
export class HandleAvailability {
  public static async handle(event: StockMoved, register: Register): Promise<void> {
      // highlight-next-line
      register.events(new ProductAvailabilityChanged(event.productID, event.quantity))
    }
  }
}
```

## Events naming convention

As with commands, you can name events in any way you want, depending on your application's domain. However, we recommend you to choose short sentences written in past tense because events are facts that have happened and can't be changed. Some event names would be:

- ProductCreated
- ProductUpdated
- ProductDeleted
- CartItemChanged
- StockMoved

As with other Magek files, events have their own directory:

```text
<project-root>
├── src
│   ├── commands
│   ├── common
│   ├── config
│   ├── entities
│   ├── events <------ put them here
│   ├── index.ts
│   └── read-models
```
