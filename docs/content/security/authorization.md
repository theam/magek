---
title: "Authorization"
group: "Security"
---

# Authorization

Magek uses a whitelisting approach to authorize users to perform commands and read models. This means that you must explicitly specify which users are allowed to perform each action. In order to do that you must configure the `authorize` policy parameter on every Command or Read Model. This parameter accepts one of the following options:

- `'all'`: The command or read-model is explicitly public, any user can access it.
- `[Role1, Role2, ...]`: An array of authorized [Roles](#defining-roles), this means that only those authenticated users that have any of the roles listed there are authorized to execute the command.
- An authorizer function that matches the `CommandAuthorizer` interface for commands or the `ReadModelAuthorizer` interface for read models.

## Making commands and read models public

Setting the option `authorize: 'all'` in a command or read model will make it publicly accessible to anyone that has access to the GraphQL endpoint. For example, the following command can be executed by anyone, even if they don't provide a valid JWT token:

```typescript title="src/commands/create-comment.ts"
@Command({
  authorize: 'all',
})
export class CreateComment {
  ...
}
```

> **Danger:** Think twice if you really need fully open GraphQL endpoints in your application, this might be useful during development, but we recommend to **avoid exposing your endpoints in this way in production**. Even for public APIs, it might be useful to issue API keys to avoid abuse. Magek is designed to scale to any given demand, but scaling also increases infrastructure costs! (See [Denial of wallet attacks](https://www.sciencedirect.com/science/article/pii/S221421262100079X))

## Simple Role-based authorization

Magek provides a simple role-based authentication mechanism that will work in many standard scenarios. It is based on the concept of roles, which are just a set of permissions. For example, a `User` role might have the permission to `create` and `read` comments, while an `Admin` role might have the permission to `create`, `read`, and `delete` comments. You can define as many roles as you want, and then assign them to users.

### Defining @Roles

As many other Magek artifacts, Magek Roles are defined as simple decorated classes. We recommend them to be defined in the `src/config/roles.ts` file, but it is not limited to that file. To define a role, you only need to decorate an empty class with the `@Role` decorator as follows:

```typescript title="src/config/roles.ts"
@Role()
export class User {}

@Role()
export class Admin {}
```

### Protecting commands and read models with roles

Once you have defined your roles, you can use them to protect your commands and read models. For example, the following command can only be executed by users that have the role `Admin`:

```typescript title="src/commands/create-comment.ts"
@Command({
  authorize: [Admin],
})
export class CreateComment {
  ...
}
```

This command will not be available to users with the role `User`.

### Associating users with roles

Magek will read the roles from the JWT token that you provide in the request. The token must include a claim with the key you specidied in the `rolesClaim` field. Magek will read such field and compare it with the declared ones in the `authorize` field of the protected command or read model.

For example, given the following setup:

## Magek Config

```typescript title="src/config/config.ts"

Magek.configure('production', (config: MagekConfig): void => {
  config.appName = 'my-store'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.tokenVerifiers = [
    new JwksUriTokenVerifier(
      'https://my-auth0-tenant.auth0.com/', // Issuer
      'https://my-auth0-tenant.auth0.com/.well-known/jwks.json', // JWKS URL
      // highlight-next-line
      'firebase:groups' // <- roles are read from 'firebase:groups' claim from the token
    ),
  ]
})
```

## Decoded Token

```json
{
  // highlight-next-line
  "firebase:groups": "User", // <- roles are read from 'firebase:groups' claim
  "iss": "https://securetoken.google.com/demoapp",
  "aud": "demoapp",
  "auth_time": 1604676721,
  "user_id": "xJY5Y6fTbVggNtDjaNh7cNSBd7q1",
  "sub": "xJY5Y6fTbVggNtDjaNh7cNSBd7q1",
  "iat": 1604676721,
  "exp": 1604680321,
  "phone_number": "+999999999",
  "firebase": {}
}
```

## Magek Command

```typescript title="src/commands/create-comment.ts"
@Command({
  authorize: [Admin],
})
export class CreateComment {
  ...
}
```

## Magek Roles

```typescript title="src/config/roles.ts"
@Role()
export class User {}

@Role()
export class Admin {}
```

Magek will check that the token contains the `firebase:groups` claim and that it contains the `Admin` role.
Also, if the token doesn't contain the `Admin` role, the command will not be executed. As you can see, the decoded token
has `User` as value of the `firebase:groups` claim, so the command will not be executed.

## Custom authorization functions

Magek also allows you to implement your own authorization functions, in case the role-based authorization model doesn't work for your application. In order to
apply your own authorization functions, you need to provide them in the `authorize` field of the command or read model. As authorization functions are regular
JavaScript functions, you can easily reuse them in your project or even in other Magek projects as a library.

### Command Authorizers

As mentioned, the `authorize` parameter of the `@Command` can receive a function. However, this function must match the `CommandAuthorizer` type. This function will receive two parameters and return a `Promise` that will resolve if the user is authorized to execute the command or reject if not:

```typescript
export type CommandAuthorizer = (currentUser?: UserEnvelope, input?: CommandInput) => Promise<void>
```

| Parameter   | Type           | Description                               |
| ----------- | -------------- | ----------------------------------------- |
| currentUser | `UserEnvelope` | User data decoded from the provided token |
| input       | `CommandInput` | The input of the command                  |

For instance, if you want to restrict a command to users that have a permission named `Permission-To-Rock` in the `permissions` claim you can do this:

```typescript

const CustomCommandAuthorizer: CommandAuthorizer = async (currentUser) => {
    if (!currentUser.claims['permissions'].includes('Permission-To-Rock')) {
      throw new Error(`User ${currentUser.username} should not be rocking!`) // <- This will reject the access to the command
    }
  }

@Command({
  authorize: CustomCommandAuthorizer,
})
export class PerformIncredibleGuitarSolo {
  ...
}
```

### Read Model Authorizers

As with commands, the `authorize` parameter of the `@ReadModel` decorator can also receive a function. However, this function must match the `ReadModelAuthorizer` type. This function will receive two parameters and return a `Promise` that will resolve if the user is authorized to execute the command or reject if not:

```typescript
export type ReadModelAuthorizer<TReadModel extends ReadModelInterface> = (
  currentUser?: UserEnvelope,
  readModelRequestEnvelope?: ReadModelRequestEnvelope<TReadModel>
) => Promise<void>
```

| Parameter   | Type           | Description                               |
| ----------- | -------------- | ----------------------------------------- |
| currentUser | `UserEnvelope` | User data decoded from the provided token |
| input       | `CommandInput` | The input of the command                  |

For instance, you may want to restrict access to a specific resource only to people that has been granted read permission:

```typescript
const CustomReadModelAuthorizer: ReadModelAuthorizer = async (currentUser, readModelRequestEnvelope) => {
    const userPermissions = Magek.entity(UserPermissions, currentUser.username)
    if (!userPermissions || !userPermissions.accessTo[readModelRequestEnvelope.className].includes(readModelRequestEnvelope.key.id)) {
      throw new Error(`User ${currentUser.username} should not be looking here`)
    }
  }

@ReadModel({
  authorize: CustomReadModelAuthorizer
})
```

### Event Stream Authorizers

You can restrict the access to the [Event Stream](/features/event-stream) of an `Entity` by providing an `authorizeReadEvents` function in the `@Entity` decorator. This function is called every time an event stream is requested. The function must match the `EventStreamAuthorizer` type receives the current user and the event search request as parameters. The function must return a `Promise<void>`. If the promise is rejected, the request will be denied. If the promise is resolved successfully, the request will be allowed.

```typescript
export type EventStreamAuthorizer = (
  currentUser?: UserEnvelope,
  eventSearchRequest?: EventSearchRequest
) => Promise<void>
```

For instance, you can restrict access to entities that the current user own.

```typescript
const CustomEventAuthorizer: EventStreamAuthorizer = async (currentUser, eventSearchRequest) => {
  const { entityID } = eventSearchRequest.parameters
  if (!entityID) {
    throw new Error(`${currentUser.username} cannot list carts`)
  }
  const cart = Magek.entity(Cart, entityID)
  if (cart.ownerUserName !== currentUser.userName) {
    throw new Error(`${currentUser.username} cannot see events in cart ${entityID}`)
  }
}

@Entity({
  authorizeReadEvents: CustomEventAuthorizer
})
export class Cart {
  @Field(type => UUID)
  readonly id!: UUID

  @Field()
  readonly ownerUserName!: string

  @Field()
  readonly cartItems!: Array<CartItem>

  @Field()
  public shippingAddress?: Address

  @Field()
  public checks: number = 0

  // ... reducers
}
```
