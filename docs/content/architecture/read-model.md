---
title: "Read Models"
group: "Architecture"
---

# Read model

A read model contains the data of your application that is exposed to the client through the GraphQL API. It's a _projection_ of one or more entities, so you dont have to directly expose them to the client. Magek generates the GraphQL queries that allow you to fetch your read models.

In other words, Read Models are cached data optimized for read operations. They're updated reactively when [Entities](./entity.md) are updated after reducing [events](./event.md).

## Creating a read model

The Magek CLI will help you to create new read models. You just need to run the following command and the CLI will generate all the boilerplate for you:

```shell
npx magek new:read-model CartReadModel --fields id:UUID cartItems:"Array<CartItem>" paid:boolean --projects Cart
```

This will generate a new file called `cart-read-model.ts` in the `src/read-models` directory. You can also create the file manually, but you will need to create the class and decorate it, so we recommend using the CLI.

## Declaring a read model

In Magek, a read model is a class decorated with the `@ReadModel` decorator. The properties of the class are the fields of the read model. The following example shows a read model with two fields:

```typescript
@ReadModel({
  authorize: 'all',
})
export class ReadModelName {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly fieldA!: SomeType

  @Field()
  readonly fieldB!: SomeType
}
```

> **Info:** The `ReadModelName` class name will be used as the read model name in the GraphQL schema. Also, the types on the constructor will be used to generate the GraphQL schema. For example, if you have a property of type `Array<CartItem>` the GraphQL schema will know that is an array of `CartItem` objects.

## The projection function

The projection function is a static method decorated with the `@Projects` decorator. It is used to define how the read model is updated when an entity is modified. he projection function must return a new instance of the read model, it receives two arguments:

- `entity`: The entity that has been modified
- `current?`: The current read model instance. If it's the first time the read model is created, this argument will be `undefined`

You must provide the `@Projects` decorator with an entity class and the **_join key_**. The join key is the name of the field in the entity that is used to match it with the read model's `id` field. In the example below, we are using the `id` field of the `Cart` entity to match it with the `CartReadModel` read model.

```typescript
@ReadModel({
  authorize: 'all',
})
export class CartReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly cartItems!: Array<CartItem>

  @Field()
  readonly paid!: boolean

  // highlight-start
  @Projects(Cart, 'id')
  public static projectCart(entity: Cart, currentCartReadModel?: CartReadModel): CartReadModel {
    return evolve(currentCartReadModel, {
      id: entity.id,
      cartItems: entity.cartItems,
      paid: entity.paid,
    })
  }
  // highlight-end
}
```

### Projecting multiple entities

You are able to project multiple entities into the same read model. For example, you can have a `UserReadModel` that projects both the `User` entity and the `Post` entity. In this case, the join key will be different for each entity:

```typescript
@ReadModel({
  authorize: 'all',
})
export class UserReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly username!: string

  // highlight-next-line
  @Projects(User, 'id')
  public static projectUser(entity: User, current?: UserReadModel): ProjectionResult<UserReadModel> {
    // Here we update the user fields
  }

  // highlight-next-line
  @Projects(Post, 'ownerId')
  public static projectUserPost(entity: Post, current?: UserReadModel): ProjectionResult<UserReadModel> {
    //Here we can adapt the read model to show specific user information related with the Post entity
  }
}
```

### Advanced join keys

There might be cases where you need to project an entity into a read model using a more complex join key. For that reason, Magek supports other types of join keys.

#### Array of entities

You can use an array of entities as a join key. For example, if you have a `Group` entity with an array of users in that group (`users: Array<UUID>`), you can have the following to update each `UserReadModel` accordingly:

```typescript
  @Projects(Group, 'users')
  public static projectUserGroup(entity: Group, readModelID: UUID, current?: UserReadModel): ProjectionResult<UserReadModel> {
    //Here we can update the read models with group information
    //This logic will be executed for each read model id in the array
  }
```

You can even select arrays of UUIDs as `joinKey`. Magek get each value on the array, find a read model with that id and execute the projection function. The signature of the projection function is a bit different in this case. It receives the `readModelID` as the second argument, which is the id we are projecting from the array. The third argument is the current read model instance, which will be `undefined` if it's the first time the read model is created. For example, if we have a `Group` with an array of users in that group (`users: Array<UUID>`), we can have the following to update each `UserReadModel` accordingly:

```typescript
  @Projects(Group, 'users')
  public static projectUserGroup(entity: Group, readModelID: UUID, current?: UserReadModel): ProjectionResult<UserReadModel> {
    //Here we can update the read models with group information
    //This logic will be executed for each read model id in the array
  }
```

#### ReadModel queries

You can use a read model query as a join key to get all the read models that match the query. For example, consider the following read model for car purchases:

```typescript
@ReadModel({
  authorize: 'all',
})
export class CarPurchasesReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly carModel?: string

  @Field()
  readonly carOwner?: string

  @Field()
  readonly offers?: Array<CarOffers>

  // rest of the code
}
```

If a car model changed its name (or any other property of such an entity that's projected in `CarPurchasesReadModel` changed its value) and there are many purchases associated to that model, then it would be necessary to update all read model instances associated to that specific model so that name change is reflected. The better alternative is to instead project a `CarModel` entity:

```typescript
@ReadModel({
  authorize: 'all',
})
export class CarPurchasesReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly carModel?: CarModel

  @Field()
  readonly carOwner?: CarOwner

  @Field()
  readonly offers?: Array<CarOffers>

  @Projects(CarModel, (carModel: CarModel): FilterFor<CarPurchasesReadModel> => {
    return {
      carModel: {
        id: {
          eq: carModel.id,
        },
      },
    }
  })
  public static projectWithModel(
    model: CarModel,
    readModelId: UUID | undefined,
    oldCarPurchaseReadModel?: CarPurchasesReadModel
  ): ProjectionResult<CarPurchasesReadModel> {
    if (!readModelId) {
      return ProjectionAction.Skip
    }
    return evolve(oldCarPurchaseReadModel, {
      id: readModelId,
      carModel: model,
    })
  }
}
```

Since the `CarModel` entity doesn't have a field that matches the `id` field of `CarPurchasesReadModel`, this projection can use a read model query join key to get all the `CarPurchasesReadModel` instances for a given `CarModel`.

In this case, the `projectWithModel` function will be called for each `CarPurchasesReadModel` instance that matches the query. The `readModelId` argument will be the `id` of the `CarPurchasesReadModel` instance.

With this approach, every time there's a change in the `CarModel` entity it will be reflected in the read model without the need to manually update all read model instances.

> **Note:** If no read model matches the query, the `projectWithModel` function will be called with `readModelId` set to `undefined`.

> **Note:** Take a look at the [Getting, filtering and projecting read models data at code level](/graphql#getting-filtering-and-projecting-read-models-data-at-code-level) section for more information on how to filter read models.

### Returning special values

Projections usually return a new instance of the read model. However, there are some special cases where you may want to return a different value.

#### Deleting read models

One of the most common cases is when you want to delete a read model. For example, if you have a `UserReadModel` that projects the `User` entity, you may want to delete the read model when the user is deleted. In this case you can return the `ProjectionAction.Delete` value:

```typescript
@ReadModel({
  authorize: 'all',
})
export class UserReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly username!: string

  @Projects(User, 'id')
  public static projectUser(entity: User, current?: UserReadModel): ProjectionResult<UserReadModel>  {
    if (entity.deleted) {
      return ReadModelAction.Delete
    }
    return evolve(current, { id: entity.id, username: entity.username })
  }
```

> **Info:** Deleting a read model is a very expensive operation. It will trigger a write operation in the read model store. If you can, try to avoid deleting read models.

#### Skipping read model updates

Another common case is when you want to keep the read model untouched. For example, if you have a `UserReadModel` that projects the `User` entity, you may want to skip updating the read model when there are no relevant changes. In this case you can return the `ProjectionAction.Skip` value:

```typescript
@ReadModel({
  authorize: 'all',
})
export class UserReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly username!: string

  @Projects(User, 'id')
  public static projectUser(entity: User, current?: UserReadModel): ProjectionResult<UserReadModel>  {
    if (!entity.modified) {
      return ReadModelAction.Nothing
    }
    return evolve(current, { id: entity.id, username: entity.username })
  }
```

> **Info:** Skipping the read model update is highly recommended in favour of returning a new instance of the read model with the same data. This will not only prevent a new write operation in the database, making your application more efficient. It will also prevent an unnecessary update to be dispatched to any GraphQL clients subscribed to that read model.

## Nested queries and calculated values using getters

You can use TypeScript getters in your read models to allow nested queries and/or return calculated values. You can write arbitrary code in a getter, but you will typically query for related read model objects or generate a value computed based on the current read model instance or context. This greatly improves the potential of customizing your read model responses.

> **Info:** Starting version 2.13, getters for values which are calculated using other properties of the read model need to be annotated with the `@CalculatedField` decorator and a list of those properties as dependencies.

Here's an example of a getter in the `UserReadModel` class that returns all `PostReadModel`s that belong to a specific `UserReadModel`:

```typescript
@ReadModel({
  authorize: 'all',
})
export class UserReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly name!: string

  private postIds!: UUID[]

  @CalculatedField({ dependsOn: ['postIds'] })
  public get posts(): Promise<PostReadModel[]> {
    return this.postIds.map((postId) => Magek.readModel(PostReadModel)
      .filter({
        id: { eq: postId }
      })
      .search()
  }

  @Projects(User, 'id')
  public static projectUser(entity: User, current?: UserReadModel): ProjectionResult<UserReadModel>  {
    return evolve(current, { id: entity.id, name: entity.name, postIds: entity.postIds })
  }
}
```

As you can see, the getter posts uses the Magek.readModel(PostReadModel) method and filters it by the ids of the posts saved in the postIds private property. This allows you to retrieve all the PostReadModels that belong to a specific UserReadModel and include them as part of the GraphQL response.

Also, you can see here a simple example of a getter called `currentTime` that returns the timestamp at the moment of the request:

```typescript
public get currentTime(): Date {
  return new Date()
}
```

With the getters in place, your GraphQL API will start exposing the getters as regular fields and you will be able to transparently read them as follows:

```graphql
query {
  user(id: "123") {
    id
    name
    currentTime
    posts {
      id
      title
      content
    }
  }
}
```

And here is an example of the corresponding JSON response when this query is executed:

```json
{
  "data": {
    "user": {
      "id": "123",
      "name": "John Doe",
      "currentTime": "2022-09-20T18:30:00.000Z",
      "posts": [
        {
          "id": "1",
          "title": "My first post",
          "content": "This is the content of my first post"
        },
        {
          "id": "2",
          "title": "My second post",
          "content": "This is the content of my second post"
        }
      ]
    }
  }
}
```

Notice that getters are not cached in the read models database, so the getters will be executed every time you include these fields in the queries. If access to nested queries is frequent or the size of the responses are big, you could improe your API response performance by querying the read models separately and joining the results in the client application.

## Authorizing a read model

Read models are part of the public API of a Magek application, so you can define who is authorized to submit them. All read models are protected by default, which means that no one can query them. In order to allow users to query a read model, you must explicitly authorize them. You can use the `authorize` field of the `@ReadModel` decorator to specify the authorization rule.

```typescript title="src/read-model/product-read-model.ts"
@ReadModel({
  authorize: 'all',
})
export class ProductReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly name!: string

  @Field()
  readonly description!: string

  @Field()
  readonly price!: number

  @Projects(Product, 'id')
  public static projectProduct(entity: Product, current?: ProductReadModel): ProjectionResult<ProductReadModel> {
    return evolve(current, {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      price: entity.price,
    })
  }
}
```

You can read more about this on the [Authorization section](/security/authorization).

## Querying a read model

Magek read models are accessible to the outside world through GraphQL queries. GrahpQL fits very well with Magek's CQRS approach because it has two kinds of reading operations: Queries and Subscriptions. They are read-only operations that do not modify the state of the application. Magek uses them to fetch data from the read models.

Magek automatically creates the queries and subscriptions for each read model. You can use them to fetch the data from the read models. For example, given the following read model:

```typescript title="src/read-model/cart-read-model.ts"
@ReadModel({
  authorize: 'all',
})
export class CartReadModel {
  @Field(type => UUID)
  public id!: UUID

  @Field()
  readonly items!: Array<CartItem>

  @Projects(Cart, 'id')
  public static projectCart(entity: Cart, currentReadModel?: CartReadModel): ProjectionResult<CartReadModel> {
    return evolve(currentReadModel, { id: entity.id, items: entity.items })
  }
}
```

You will get the following GraphQL query and subscriptions:

```graphql
query CartReadModel(id: ID!): CartReadModel
subscription CartReadModel(id: ID!): CartReadModel
subscription CartReadModels(id: UUIDPropertyFilter!): CartReadModel
```

For more information about queries and how to use them, please check the [GraphQL API](/graphql) section.

### Filtering a read model

Magek GraphQL API provides support for filtering Read Models on `queries` and `subscriptions`. To get more information about it go to the [GraphQL API](/graphql#filtering-a-read-model) section.

## Subscribing to a read model

Magek GraphQL API also provides support for real-time updates using subscriptions and a web-socket. To get more information about it go to the [GraphQL API](/graphql#subscribing-to-read-models) section.

## Sorting Read Models

There are some cases when it's desirable to query your read models sorted a particular field. An example could be a chat app where you want to fetch the messages of a channel sorted by the time they were sent. Magek provides a special decorator to tag a specific property as a sequence key for a read model:

```typescript title="src/read-model/message-read-model.ts"
@ReadModel({
  authorize: 'all',
})
export class MessageReadModel {
  @Field(type => UUID)
  readonly id!: UUID // A channel ID

  @Field()
  @sequencedBy
  readonly timestamp!: string

  @Field()
  readonly contents!: string

  @Projects(Message, 'id')
  public static projectMessage(
    entity: Message,
    currentReadModel?: MessageReadModel
  ): ProjectionResult<MessageReadModel> {
    return evolve(currentReadModel, {
      id: entity.id,
      timestamp: entity.timestamp,
      contents: entity.contents,
    })
  }
}
```

## Selecting fields from a Read Model

See the [`Read Models data at code level`](/graphql#getting-filtering-and-projecting-read-models-data-at-code-level) section for more information about how to select fields from a Read Model.

### Querying time sequences

Adding a sequence key to a read model changes the behavior of the singular query, which now accepts the sequence key as an optional parameter:

```graphql
query MessageReadModel(id: ID!, timestamp: string): [MessageReadModel]
```

Using this query, when only the id is provided, you get an array of all the messages in the channel sorted by timestamp in ascending order (from older to newer). When you also provide an specific timestamp, you still get an array, but it will only contain the message sent in that exact moment.

It is important to guarantee that the sequence key is unique for each message. Magek uses UUIDv7 (RFC 9562) for all identifiers, which provides time-ordering and lexicographic sortability by design. You can use `UUID.generate()` to create unique, time-ordered identifiers for your read models. UUIDv7 includes sub-millisecond precision and random bits to ensure uniqueness even for events occurring within the same millisecond.

For more information about queries and how to use them, please check the [GraphQL API](/graphql#reading-read-models) section.

## Read models naming convention

As it has been previously commented, semantics plays an important role in designing a coherent system and your application should reflect your domain concepts, we recommend choosing a representative domain name and use the `ReadModel` suffix in your read models name.

Despite you can place your read models in any directory, we strongly recommend you to put them in `<project-root>/src/read-models`. Having all the read models in one place will help you to understand your application's capabilities at a glance.

```text
<project-root>
├── src
│   ├── commands
│   ├── common
│   ├── config
│   ├── entities
│   ├── read-models  <------ put them here
│   ├── events
│   ├── index.ts
│   └── read-models
```
