---
title: "Installation"
group: "Getting Started"
---

# Installation

You can develop with Magek using any of the following operating systems:

- Linux
- macOS
- Windows (Native and WSL)

## Magek Prerequisites

### Install Node.js

The latest version of Magek (`3.x`) requires the current LTS version of Node.js which is `22.x`. Magek releases with versions `2.x` will only work with the previous Node.js LTS version (`20.x`).

> **Info:** For more information on upgrades between Magek v2.x.x and v3.x.x, read [this page](https://github.com/theam/magek/blob/main/upgrade-v3.md).
>
> For more information on upgrades between Magek v1.x.x and v2.x.x, read [this page](https://github.com/theam/magek/blob/main/upgrade-v2.md).

Download the installer [from Node.js website](https://nodejs.org/en/), or install it using your system's package
manager.

## Windows

Using [Chocolatey](https://chocolatey.org/) package manager, run the following command in your PowerShell

```bash
choco install nodejs
```

## macOS

Using [Homebrew](https://brew.sh) package manager, run the following command on the terminal

```bash
brew install node
```

## Ubuntu
  
Just run the following commands on the terminal:

```bash
curl -sL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install nodejs
```

Verify that it was installed properly by checking so from your terminal:

```bash
node -v
```

> v22.12.0

```bash
npm -v
```

> 10.9.1

As soon as you have a Node.js version `22.x` or higher, and an `npm` version higher than
`7`, you are good to go. Just note that `npm` comes with node, you don't have to install
it apart.

Alternatively, we recommend you to use a version manager for dealing with different Node.js
versions:

- [`nvm`](https://github.com/nvm-sh/nvm) - Works with macOS, Linux, and Windows Subsystem
  for Linux
- [`nvm-windows`](https://github.com/coreybutler/nvm-windows) - Works with native Windows

### Install Git

Magek will initialize a Git repository when you create a new project (unless you use the `--skipGit` flag), so it is required that you have it already installed in your system.

## Windows

```bash
choco install git
```

## macOS

```bash
brew install git
```

## Ubuntu

```bash
sudo apt install git-all
```

#### Git configuration variables

After installing git in your machine, make sure that `user.name` and `user.email` are properly configured.
Take a look at the [Git configuration page](https://git-scm.com/docs/git-config) for more info.

To configure them, run in your terminal:

```bash
git config --global user.name "Your Name Here"
git config --global user.email "your_email@youremail.com"
```

## Creating Projects and Installing the Magek CLI

### Quick Start: No Installation Required

To create a new Magek project, you don't need to install anything, if you have node installed in your machine, you can run:

```bash
npm create magek@latest my-project
```

This command will create a new project using the latest version without requiring any global installations.

### Installing the Magek CLI (No Global Installation Required)

For project development after creation, Magek includes the CLI as a dependency in your project. There's no need for global installation - the CLI is automatically available via `npx` after creating your project.

When you create a project using `npm create magek@latest`, the CLI is added as a dependency and can be used immediately:

```bash
cd my-project
npm install
npx magek version
```

Verify the Magek CLI installation with the `npx magek version` command. You should get back something like

```bash
npx magek version
```

> @magek/cli/0.16.1 darwin-x64 node-v22.12.0

> **Tip:** The CLI is automatically included in every Magek project - no global installation needed! Use `npx magek` for all CLI commands within your project directory.
