---
title: "Entities"
group: "Architecture"
---

# Entity

If events are the _source of truth_ of your application, entities are the _current state_ of your application. For example, if you have an application that allows users to create bank accounts, the events would be something like `AccountCreated`, `MoneyDeposited`, `MoneyWithdrawn`, etc. But the entities would be the `BankAccount` themselves, with the current balance, owner, etc.

Entities are created by _reducing_ the whole event stream. Magek generates entities on the fly, so you don't have to worry about their creation. However, you must define them in order to instruct Magek how to generate them.

> **Info:** Under the hood, Magek stores snapshots of the entities in order to reduce the load on the event store. That way, Magek doesn't have to reduce the whole event stream whenever the current state of an entity is needed.

## Creating entities

The Magek CLI will help you to create new entities. You just need to run the following command and the CLI will generate all the boilerplate for you:

```bash
npx magek new:entity Product --fields displayName:string description:string price:Money
```

This will generate a new file called `product.ts` in the `src/entities` directory. You can also create the file manually, but you will need to create the class and decorate it, so we recommend using the CLI.

## Declaring an entity

To declare an entity in Magek, you must define a class decorated with the `@Entity` decorator. Inside of the class, you must define a constructor with all the fields you want to have in your entity.

```typescript title="src/entities/entity-name.ts"
@Entity
export class EntityName {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly fieldA!: SomeType

  @field()
  readonly fieldB!: SomeOtherType
}
```

## The reduce function

In order to tell Magek how to reduce the events, you must define a static method decorated with the `@reduces` decorator. This method will be called by the framework every time an event of the specified type is emitted. The reducer method must return a new entity instance with the current state of the entity.

```typescript title="src/entities/entity-name.ts"
@Entity
export class EntityName {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly fieldA!: SomeType

  @field()
  readonly fieldB!: SomeOtherType

  // highlight-start
  @reduces(SomeEvent)
  public static reduceSomeEvent(event: SomeEvent, currentEntityState?: EntityName): EntityName {
    return evolve(currentEntityState, {
      id: event.entityID(),
      fieldA: event.fieldA,
      fieldB: event.fieldB,
    })
  }
  // highlight-end
}
```

The reducer method receives two parameters:

- `event` - The event object that triggered the reducer
- `currentEntity?` - The current state of the entity instance that the event belongs to if it exists. **This parameter is optional** and will be `undefined` if the entity doesn't exist yet (For example, when you process a `ProductCreated` event that will generate the first version of a `Product` entity).

> **Tip:** The `evolve()` helper function creates a new immutable copy of the entity with the specified field updates. It safely handles the case where `currentEntityState` is `undefined` (for newly created entities) and ensures immutability by returning a fresh object rather than mutating the existing one.

### Reducing multiple events

You can define as many reducer methods as you want, each one for a different event type. For example, if you have a `Cart` entity, you could define a reducer for `ProductAdded` events and another one for `ProductRemoved` events.

```typescript title="src/entities/cart.ts"
@Entity
export class Cart {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly items!: Array<CartItem>

  @reduces(ProductAdded)
  public static reduceProductAdded(event: ProductAdded, currentCart?: Cart): Cart {
    const newItems = addToCart(event.item, currentCart)
    return evolve(currentCart, { id: event.entityID(), items: newItems })
  }

  @reduces(ProductRemoved)
  public static reduceProductRemoved(event: ProductRemoved, currentCart?: Cart): Cart {
    const newItems = removeFromCart(event.item, currentCart)
    return evolve(currentCart, { items: newItems })
  }
}
```

> **Tip:** It's highly recommended to **keep your reducer functions pure**, which means that you should be able to produce the new entity version by just looking at the event and the current entity state. You should avoid calling third party services, reading or writing to a database, or changing any external state.

### Skipping Events with ReducerAction.Skip

Sometimes a reducer may need to skip an event instead of updating the entity state. This can happen when:
- Receiving an update event for an entity that doesn't exist
- Processing an event that is no longer relevant
- Handling events that should be ignored under certain conditions

To skip an event, return `ReducerAction.Skip` from your reducer. This tells Magek to keep the current entity state unchanged:

```typescript title="src/entities/product.ts"
import { ReducerAction, ReducerResult } from '@magek/common'

@Entity
export class Product {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly name!: string

  @field()
  readonly price!: number

  @reduces(ProductUpdated)
  public static reduceProductUpdated(
    event: ProductUpdated,
    currentProduct?: Product
  ): ReducerResult<Product> {
    if (!currentProduct) {
      // Can't update a non-existent product - skip this event
      return ReducerAction.Skip
    }
    return new Product(currentProduct.id, event.newName, event.newPrice)
  }
}
```

When a reducer returns `ReducerAction.Skip`, the framework will:
- Keep the previous entity snapshot unchanged
- Continue processing subsequent events in the event stream
- Not store a new snapshot for this event

> **Note:** `ReducerAction.Skip` should be used sparingly and only for events that genuinely should not affect entity state. In most cases, properly designed events and reducers won't need to skip events.

There could be a lot of events being reduced concurrently among many entities, but, **for a specific entity instance, the events order is preserved**. This means that while one event is being reduced, all other events of any kind _that belong to the same entity instance_ will be waiting in a queue until the previous reducer has finished. This is how Magek guarantees that the entity state is consistent.

![reducer process gif](/img/reducer.gif)

### Eventual Consistency

Additionally, due to the event driven and async nature of Magek, your data might not be instantly updated. Magek will consume the commands, generate events, and _eventually_ generate the entities. Most of the time this is not perceivable, but under huge loads, it could be noticed.

This property is called [Eventual Consistency](https://en.wikipedia.org/wiki/Eventual_consistency), and it is a trade-off to have high availability for extreme situations, where other systems might simply fail.

## Entity ID

In order to identify each entity instance, you must define an `id` field on each entity. This field will be used by the framework to identify the entity instance. If the value of the `id` field matches the value returned by the [`entityID()` method](./event.md#events-and-entities) of an Event, the framework will consider that the event belongs to that entity instance.

```typescript title="src/entities/entity-name.ts"
@Entity
export class EntityName {
  // highlight-next-line
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly fieldA!: SomeType

  @field()
  readonly fieldB!: SomeOtherType

  @reduces(SomeEvent)
  public static reduceSomeEvent(event: SomeEvent, currentEntityState?: EntityName): EntityName {
    return evolve(currentEntityState, {
      id: event.entityID(),
      fieldA: event.fieldA,
    })
  }
}
```

> **Tip:** We recommend you to use the `UUID` type for the `id` field. You can generate a new `UUID` value by calling the `UUID.generate()` method already provided by the framework.

## Entities naming convention

Entities are a representation of your application state in a specific moment, so name them as closely to your domain objects as possible. Typical entity names are nouns that might appear when you think about your app. In an e-commerce application, some entities would be:

- Cart
- Product
- UserProfile
- Order
- Address
- PaymentMethod
- Stock

Entities live within the entities directory of the project source: `<project-root>/src/entities`.

```text
<project-root>
├── src
│   ├── commands
│   ├── common
│   ├── config
│   ├── entities <------ put them here
│   ├── events
│   ├── index.ts
│   └── read-models
```
