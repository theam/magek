import type { Command as OclifCommand, Config } from '@oclif/core'

/**
 * Type for a concrete oclif Command class (non-abstract).
 * This represents a class constructor that creates Command instances.
 */
export type ConcreteCommand = new (argv: string[], config: Config) => OclifCommand

/**
 * Injectable interface for registering custom CLI commands with Magek.
 * Commands should be oclif Command classes (concrete implementations, not abstract).
 */
export interface Injectable {
  /**
   * Map of command names to oclif Command classes.
   * The command name will be used as the subcommand name.
   */
  commands: Record<string, ConcreteCommand>
}

/**
 * Type for an oclif Command class.
 */
export type Command = ConcreteCommand
