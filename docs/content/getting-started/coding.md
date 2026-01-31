---
title: "Coding Tutorial"
group: "Getting Started"
---

# Build a Magek app in minutes

In this section, we will go through all the necessary steps to have the backend up and
running for a blog application in just a few minutes.

Before starting, make sure you have [Node.js installed](/getting-started/installation). You'll need the Magek CLI later for development tasks, but project creation doesn't require any global installations.

### 1. Create the project

In your favourite terminal, run this command:

```bash
npm create magek@latest boosted-blog
```

The create script will prompt you for project details like description, author, and license. You can press Enter to accept the defaults for any field. The script automatically configures your project to use **Magek Server**, which allows you to run and debug your application locally.

After filling in the details, you will see your project generated!:

```bash
📦 Creating project...
✓ Template copied
🔧 Configuring project...
✓ Project configured
📦 Installing dependencies...
✓ Dependencies installed
🔄 Initializing git repository...
✓ Git repository initialized

🎉 Project created successfully!

Next steps:
  cd boosted-blog
  nvm use
  npm install
  npx magek version
```

> **Tip:** You can create a project non-interactively by providing command line options:
>
> ```shell
> npm create magek@latest my-app -- --author "Your Name" --description "My awesome Magek app"
> ```
>
> Available options:
> - `--author` - Author of the project
> - `--description` - Project description  
> - `--license` - License (defaults to MIT)
> - `--skip-install` - Skip npm install
> - `--skip-git` - Skip git repository initialization
> - `--package-manager` - Package manager to use (npm or pnpm, defaults to npm)
> - `--template` - Custom template from GitHub (e.g., user/repo-name)

> The `npm create` command follows the modern npm ecosystem pattern for project scaffolding:
>
> - `npm create` uses the standard npm create pattern (similar to `create-react-app`, `create-next-app`)
> - `magek@latest` specifies the package name and version to use for creating projects
> - `boosted-blog` is the name of the project directory to create
>
> This approach requires no global installations - just npm v7+ which comes with Node.js.

> **Tip:** You can also use equivalent commands with other package managers:
> - `npx create-magek@latest boosted-blog`  
> - `pnpm dlx create-magek@latest boosted-blog`
> - `bun create magek boosted-blog`

When finished, you'll see some scaffolding that has been generated. The project name will be the
project's root so `cd` into it:

```bash
cd boosted-blog
```

There you should have these files and directories already generated:

```text
boosted-blog
├── .eslintignore
├── .gitignore
├── .eslintrc.js
├── .prettierrc.yaml
├── package-lock.json
├── package.json
├── src
│   ├── commands
│   ├── common
│   ├── config
│   │   └── config.ts
│   ├── entities
│   ├── events
│   ├── event-handlers
│   ├── read-models
│   └── index.ts
├── tsconfig.eslint.json
└── tsconfig.json
```

Now open the project in your favorite editor, e.g. [Visual Studio Code](https://code.visualstudio.com/).

### 2. Setting up your development environment

Now that you have a project, navigate to your project directory and set up your development environment. The project includes the Magek CLI as a dependency, so you can use it immediately:

```bash
cd boosted-blog
nvm use
npm install
```

You can verify everything is working by running:

```bash
npx magek version
```

### 3. First command

Commands define the input to our system, so we'll start by generating our first
[command](/architecture/command) to create posts. Use the command generator, while in the project's root
directory, as follows:

```bash
npx magek new:command CreatePost --fields postId:UUID title:string content:string author:string
```

The `new:command` generator creates a `create-post.ts` file in the `commands` folder:

```text
boosted-blog
└── src
    └── commands
        └── create-post.ts
```

As we mentioned before, commands are the input of our system. They're sent
by the users of our application. When they are received you can validate its data,
execute some business logic, and register one or more events. Therefore, we have to define two more things:

1. Who is authorized to run this command.
1. The events that it will trigger.

Magek allows you to define authorization strategies (we will cover that
later). Let's start by allowing anyone to send this command to our application.
To do that, open the file we have just generated and add the string `'all'` to the
`authorize` parameter of the `@Command` decorator. Your `CreatePost` command should look like this:

```typescript
@Command({
  authorize: 'all', // Specify authorized roles here. Use 'all' to authorize anyone
})
export class CreatePost {
  @field()
  readonly postId!: UUID

  @field()
  readonly title!: string

  @field()
  readonly content!: string

  @field()
  readonly author!: string

  public static async handle(command: CreatePost, register: Register): Promise<void> {
    register.events(/* YOUR EVENT HERE */)
  }
}
```

### 4. First event

Instead of creating, updating, or deleting objects, Magek stores data in the form of events.
They are records of facts and represent the source of truth. Let's generate an event called `PostCreated`
that will contain the initial post info:

```bash
npx magek new:event PostCreated --fields postId:UUID title:string content:string author:string
```

The `new:event` generator creates a new file under the `src/events` directory.
The name of the file is the name of the event:

```text
boosted-blog
└── src
    └── events
        └── post-created.ts
```

All events in Magek must target an entity, so we need to implement an `entityID`
method. From there, we'll return the identifier of the post created, the field
`postID`. This identifier will be used later by Magek to build the final state
of the `Post` automatically. Edit the `entityID` method in `events/post-created.ts`
to return our `postID`:

```typescript
// src/events/post-created.ts

@Event
export class PostCreated {
  @field()
  public readonly postId!: UUID

  @field()
  public readonly title!: string

  @field()
  public readonly content!: string

  @field()
  public readonly author!: string

  public constructor(postId: UUID, title: string, content: string, author: string) {
    this.postId = postId
    this.title = title
    this.content = content
    this.author = author
  }

  public entityID(): UUID {
    return this.postId
  }
}
```

Now that we have an event, we can edit the `CreatePost` command to emit it. Let's change
the command's `handle` method to look like this:

```typescript
// src/commands/create-post.ts::handle
public static async handle(command: CreatePost, register: Register): Promise<void> {
  register.events(new PostCreated(command.postId, command.title, command.content, command.author))
}
```

Remember to import the event class correctly on the top of the file:

```typescript
```

We can do any validation in the command handler before storing the event, for our
example, we'll just save the received data in the `PostCreated` event.

### 5. First entity

So far, our `PostCreated` event suggests we need a `Post` entity. Entities are a
representation of our system internal state. They are in charge of reducing (combining) all the events
with the same `entityID`. Let's generate our `Post` entity:

```bash
npx magek new:entity Post --fields title:string content:string author:string --reduces PostCreated
```

You should see now a new file called `post.ts` in the `src/entities` directory.

This time, besides using the `--fields` flag, we use the `--reduces` flag to specify the events the entity will reduce and, this way, produce the Post current state. The generator will create one _reducer function_ for each event we have specified (only one in this case).

Reducer functions in Magek work similarly to the `reduce` callbacks in Javascript: they receive an event
and the current state of the entity, and returns the next version of the same entity.
In this case, when we receive a `PostCreated` event, we can just return a new `Post` entity copying the fields
from the event. There is no previous state of the Post as we are creating it for the first time:

```typescript
// src/entities/post.ts
@Entity
export class Post {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly title!: string

  @field()
  readonly content!: string

  @field()
  readonly author!: string

  @reduces(PostCreated)
  public static reducePostCreated(event: PostCreated, currentPost?: Post): Post {
    return evolve(currentPost, {
      id: event.postId,
      title: event.title,
      content: event.content,
      author: event.author,
    })
  }
}
```

Entities represent our domain model and can be queried from command or
event handlers to make business decisions or enforcing business rules.

### 6. First read model

In a real application, we rarely want to make public our entire domain model (entities)
including all their fields. What is more, different users may have different views of the data depending
on their permissions or their use cases. That's the goal of `ReadModels`. Client applications can query or
subscribe to them.

Read models are _projections_ of one or more entities into a new object that is reachable through the query and subscriptions APIs. Let's generate a `PostReadModel` that projects our
`Post` entity:

```bash
npx magek new:read-model PostReadModel --fields title:string author:string --projects Post:id
```

We have used a new flag, `--projects`, that allow us to specify the entities (can be many) the read model will
watch for changes. You might be wondering what is the `:id` after the entity name. That's the [joinKey](/architecture/read-model#the-projection-function),
but you can forget about it now.

As you might guess, the read-model generator will create a file called
`post-read-model.ts` under `src/read-models`:

```text
boosted-blog
└── src
    └── read-models
        └── post-read-model.ts
```

There are two things to do when creating a read model:

1. Define who is authorized to query or subscribe it
1. Add the logic of the projection functions, where you can filter, combine, etc., the entities fields.

While commands define the input to our system, read models define the output, and together they compound
the public API of a Magek application. Let's do the same we did in the command and authorize `all` to
query/subscribe the `PostReadModel`. Also, and for learning purposes, we will exclude the `content` field
from the `Post` entity, so it won't be returned when users request the read model.

Edit the `post-read-model.ts` file to look like this:

```typescript
// src/read-models/post-read-model.ts
@ReadModel({
  authorize: 'all', // Specify authorized roles here. Use 'all' to authorize anyone
})
export class PostReadModel {
  @field(type => UUID)
  public id!: UUID

  @field()
  readonly title!: string

  @field()
  readonly author!: string

  @projects(Post, 'id')
  public static projectPost(entity: Post, currentPostReadModel?: PostReadModel): ProjectionResult<PostReadModel> {
    return evolve(currentPostReadModel, {
      id: entity.id,
      title: entity.title,
      author: entity.author,
    })
  }
}
```

### 7. Building and Running

At this point, we've:

- Created a publicly accessible command
- Emitted an event as a mechanism to store data
- Reduced the event into an entity to have a representation of our internal state
- Projected the entity into a read model that is also publicly accessible.

With this, you already know the basics to build event-driven, CQRS-based applications
with Magek.

You can check that code compiles correctly by running the build command:

```bash
npm run build
```

You can also clean the compiled code by running:

```bash
npm run clean
```

#### 7.1 Running your application locally

Now, let's run our application to see it working. It is as simple as running:

```bash
npx magek start -e local
```

This will execute a local `Express.js` server and will try to expose it in port `3000`. You can change the port by using the `-p` option:

```bash
npx magek start -e local -p 8080
```

Once the server is running, you can access the GraphQL API at the URL shown in the console (typically `http://localhost:3000/graphql`).

> **Note:** By default, the full error stack trace is sent to a local file, `./errors.log`. To see the full error stack trace directly from the console, use the `--verbose` flag.

### 8. Testing

Let's get started testing the project. We will perform three actions:

- Add a couple of posts
- Retrieve all posts
- Retrieve a specific post

Magek applications provide you with a GraphQL API out of the box. You send commands using
_mutations_ and get read models data using _queries_ or _subscriptions_.

In this section, we will be sending requests by hand using the free [Altair](https://altair.sirmuel.design/) GraphQL client,
which is very simple and straightforward for this guide. However, you can use any client you want. Your endpoint URL should look like this:

```text
<httpURL>/graphql
```

#### 8.1 Creating posts

Let's use two mutations to send two `CreatePost` commands.

```graphql
mutation {
  CreatePost(
    input: {
      postId: "95ddb544-4a60-439f-a0e4-c57e806f2f6e"
      title: "Build a blog in 10 minutes with Magek"
      content: "I am so excited to write my first post"
      author: "Boosted developer"
    }
  )
}
```

```graphql
mutation {
  CreatePost(
    input: {
      postId: "05670e55-fd31-490e-b585-3a0096db0412"
      title: "Magek framework rocks"
      content: "I am so excited for writing the second post"
      author: "Another boosted developer"
    }
  )
}
```

The expected response for each of those requests should be:

```json
{
  "data": {
    "CreatePost": true
  }
}
```

> **Note:** In this example, the IDs are generated on the client-side. When running production applications consider adding validation for ID uniqueness. For this example, we have used [a UUID generator](https://www.uuidgenerator.net/version4)

#### 8.2 Retrieving all posts

Let's perform a GraphQL `query` that will be hitting our `PostReadModel`:

```graphql
query {
  PostReadModels {
    id
    title
    author
  }
}
```

It should respond with something like:

```json
{
  "data": {
    "PostReadModels": [
      {
        "id": "05670e55-fd31-490e-b585-3a0096db0412",
        "title": "Magek framework rocks",
        "author": "Another boosted developer"
      },
      {
        "id": "95ddb544-4a60-439f-a0e4-c57e806f2f6e",
        "title": "Build a blog in 10 minutes with Magek",
        "author": "Boosted developer"
      }
    ]
  }
}
```

#### 8.3 Retrieving specific post

It is also possible to retrieve specific a `Post` by adding the `id` as input, e.g.:

```graphql
query {
  PostReadModel(id: "95ddb544-4a60-439f-a0e4-c57e806f2f6e") {
    id
    title
    author
  }
}
```

You should get a response similar to this:

```json
{
  "data": {
    "PostReadModel": {
      "id": "95ddb544-4a60-439f-a0e4-c57e806f2f6e",
      "title": "Build a blog in 10 minutes with Magek",
      "author": "Boosted developer"
    }
  }
}
```

> Congratulations! You've built an event-driven backend in less than 10 minutes. We hope you have enjoyed discovering the magic of the Magek Framework.

### 9. More functionalities

This is a really basic example of a Magek application. The are many other features Magek provides like:

- Use a more complex authorization schema for commands and read models based on user roles
- Use GraphQL subscriptions to get updates in real-time
- Make events trigger other events
- Reading entities within command handlers to apply domain-driven decisions
- And much more...

Continue reading to dig more. You've just scratched the surface of all the Magek
capabilities!
