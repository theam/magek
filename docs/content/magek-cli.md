---
title: "Magek CLI"
group: "Guides"
---

# Magek CLI

The Magek CLI is a command line interface that helps you develop your Magek applications. It is built with Node.js and published to NPM through the package `@magek/cli`. It's automatically included as a dependency in every Magek project - no global installation required!

## No Installation Required

When you create a Magek project using `npm create magek@latest`, the CLI is automatically included as a dependency. Simply use `npx magek` to run any CLI command within your project directory.

```bash
# Create a new project (CLI automatically included)
npm create magek@latest my-project

# Navigate to your project and start using the CLI
cd my-project
npx magek --help
```

## Usage

Once you're in your Magek project directory, you can use the `npx magek` command to see the help message.

> **Tip:** You can also run `npx magek --help` to get the same output.

## Command Overview

| Command | Description |
|---------|-------------|
| [`new:command`](/architecture/command#creating-a-command) | Creates a new command in the project |
| [`new:entity`](/architecture/entity#creating-an-entity) | Creates a new entity in the project |
| [`new:event`](/architecture/event#creating-an-event) | Creates a new event in the project |
| [`new:event-handler`](/architecture/event-handler#creating-an-event-handler) | Creates a new event handler in the project |
| [`new:read-model`](/architecture/read-model#creating-a-read-model) | Creates a new read model in the project |
| [`new:scheduled-command`](/features/schedule-actions#creating-a-scheduled-command) | Creates a new scheduled command in the project |
| | |
| [`build`](/getting-started/coding#6-deployment) | Builds the project |
| | |

> **Tip:** To create a new Magek project, use the modern npm create pattern:
>
> ```bash
> npm create magek@latest my-project
> ```
>
> All CLI commands should be run with `npx magek` within your project directory.

```bash
npm create magek@latest my-project
```

See the [Getting Started guide](/getting-started/coding#1-create-the-project) for details.
