---
title: "Introduction"
group: "Guides"
---

# Introduction

> _Progress isn't made by early risers. It's made by lazy men trying to find easier ways to do something._ — [Robert A. Heinlein](https://en.wikipedia.org/wiki/Robert_A._Heinlein)

## What is Magek?

Magek is the fastest way to create a scalable application. It is a new kind of framework to build scalable and reliable systems easier, reimagining the software development experience to maximize your team's speed and reduce friction on every level.

Magek follows an Event-Driven and a Domain-Driven Design approach in which you define your application in terms that are understandable by anyone in your company. From a bird’s eye view, your project is organized into:

- **Commands**: Define what a user can request from the system (i.e: Add an item to the cart)
- **Queries**: Define what a user can get from the system (i.e: Get cart items)
- **Events**: Simple records of facts (i.e: User X added item Y to the cart Z)
- **Entities**: Data about the things that the people in your company talk about (i.e: Orders, Customers, etc.)
- **Handlers**: Code that processes commands, reacts to events to trigger other actions, or update the entities after new events happen.

Events are the cornerstone of a Magek application, and that’s why we say that Magek is an event-driven framework. Events bring us many of the differentiating characteristics of Magek:

- **Real-time**: Events can trigger other actions when they’re created, and updates can be pushed to connected clients without extra requests.
- **High data resiliency**: Events are stored by default in an append-only database, so the data is never lost and it’s possible to recover any previous state of the system.
- **Scalable by nature**: Dependencies only happen at data level, so Magek apps can ingest more data without waiting for other operatons to complete. Low coupling also makes it easier to evolve the code without affecting other parts of the system.
- **Asynchronous**: Your users won't need to wait for your system to process the whole operation before continuing using it.

Before Magek, building an event-driven system with the mentioned characteristics required huge investments in hiring engineers with the needed expertise. Magek packs this expertise, acquired from real-case scenarios in high-scale companies, into a very simple tool that handles the hard parts for you!

We have redesigned the whole developer experience from scratch, taking advantage of the advanced TypeScript type system to go from project generation to a production-ready application which provides a real-time GraphQL API that can ingest thousands of concurrent users in a matter of minutes.

Magek's ultimate goal is making developer's lives easier, fulfilling the dream of writing code in a domain-driven way that eases communications for the whole team, without caring about how anything else is done at the infrastructure level!

## Magek Principles

Magek enhances developers' productivity by focusing only on business logic. Write your code, provide your credentials and let Magek do the rest. Magek takes a holistic and highly-opinionated approach at many levels:

- **Focus on business value**: The only code that makes sense is the code that makes your application different from any other.
- **Convention over configuration**: All the supporting code and configuration that is similar in all applications should be out of programmers’ sight.
- **Simple deployment**: Run your application as a standalone server or export handlers for serverless deployment.
- **Scale smoothly**: The code you write to handle your first 100 users will still work to handle your first million. You won't need to rewrite your application when it succeeds.
- **Event-source and CQRS**: Our world is event-driven, businesses are event-driven, and modern software maps better to reality when it’s event-driven.
- **Principle of Abstraction**: Building an application is hard enough to have to deal with recurring low-level details like SQL, API design, or authentication mechanisms, so we tend to build more semantic abstractions on top of them.
- **Real-time first**: Client applications must be able to react to events happening in the backend and notice data changes.

## Why use Magek

What does _Magek_ boost? Your team's productivity. Not just because it helps you work faster, but because it makes you worry about fewer buttons and switches. We aim to solve major productivity sinks for developers like designing the right infrastructure, writing APIs or dealing with ORMs.

Magek will fit like a glove in applications that are naturally event-driven like commerce applications (retail, e-commerce, omnichannel applications, warehouse management, etc.), business applications or communication systems, but it's a general-purpose framework that has several advantages over other solutions:

- **Faster time-to-market**: Magek can run your application from minute one, without complicated configurations. In addition to that, it features a set of code generators to help developers build the project scaffolding faster and focus on actual business code in a matter of seconds instead of dealing with complicated framework folklore.
- **Write less code**: Magek conventions and abstractions require less code to implement the same features. This not only speeds up development but combined with clear architecture guidelines also makes Magek projects easier to understand, iterate, and maintain.
- **Benefit from Typescript's advantages**: Typescript's type system provides an important security layer that helps developers make sure the code they write is the code they meant to write, making Magek apps more reliable and less error-prone.
- **All the advantages of Microservices, none of its cons**: Microservices are a great way to deal with code complexity, at least on paper. Services are isolated and can scale independently, and different teams can work independently, but that usually comes with a con: interfaces between services introduce huge challenges like delays, hard to solve cyclic dependencies, or deployment errors. In Magek, every handler function works independently, there are no direct dependencies between them, all communication happens asynchronously via events, and everything is compiled and type-checked atomically to avoid issues.
- **Event-sourcing by default**: Magek keeps all incremental data changes as events, indefinitely. This means that any previous state of the system can be recreated and replayed at any moment, enabling a whole world of possibilities for troubleshooting and auditing, syncing environments or performing tests and simulations.
- **Magek makes it easy to build enterprise-grade applications**: Implementing an event-sourcing system from scratch is a challenging exercise that usually requires highly specialized experts. There are some technical challenges like eventual consistency, message ordering, and snapshot building. Magek takes care of all of that and more for you, lowering the curve for people that are starting and making expert lives easier.
