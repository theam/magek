---
title: "Event-Driven Architecture"
group: "Architecture"
---

# Magek architecture

Magek is a highly opinionated framework that provides a complete toolset to build production-ready event-driven serverless applications.

Two patterns influence the Magek's event-driven architecture: Command-Query Responsibility Segregation ([CQRS](https://www.martinfowler.com/bliki/CQRS.html)) and [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html). They're complex techniques to implement from scratch with lower-level frameworks, but Magek makes them feel natural and very easy to use.

![architecture](../magek-arch.png)

As you can see in the diagram, Magek applications consist of four main building blocks: `Commands`, `Events`, `Entities`, and `Read Models`. `Commands` and `Read Models` are the public interface of the application, while `Events` and `Entities` are private implementation details. With Magek, clients submit `Commands`, query the `Read Models`, or subscribe to them for receiving real-time updates thanks to the out of the box [GraphQL API](/graphql)

Magek applications are event-driven and event-sourced so, **the source of truth is the whole history of events**. When a client submits a command, Magek _wakes up_ and handles it throght `Command Handlers`. As part of the process, some `Events` may be _registered_ as needed.

On the other side, the framework caches the current state by automatically _reducing_ all the registered events into `Entities`. You can also _react_ to events via `Event Handlers`, triggering side effect actions to certain events. Finally, `Entities` are not directly exposed, they are transformed or _projected_ into `ReadModels`, which are exposed to the public.

In this chapter you'll walk through these concepts in detail.

## Architecture Components

- [Commands](02_command.md) - The input interface for your application
- [Events](03_event.md) - Records of facts that represent the source of truth
- [Event Handlers](04_event-handler.md) - React to events and trigger side effects
- [Entities](05_entity.md) - Current state derived from events
- [Read Models](06_read-model.md) - Public projections of your data
- [Notifications](07_notifications.md) - Real-time updates and messaging
- [Queries](08_queries.md) - How to query your read models
