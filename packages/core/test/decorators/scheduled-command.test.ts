import { expect } from '../expect'
import { ScheduledCommand } from '../../src/decorators/'
import { Magek } from '../../src'
import { MagekConfig, Register } from '@magek/common'

describe('the `ScheduledCommand` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.scheduledCommandHandlers) {
        delete config.scheduledCommandHandlers[propName]
      }
    })
  })

  it('registers the scheduled command in config.scheduledCommandHandlers', () => {
    @ScheduledCommand({ minute: '0', hour: '*/2' })
    class CleanupExpiredSessions {
      public static async handle(_register: Register): Promise<void> {
        // Cleanup logic
      }
    }

    const commandMetadata = Magek.config.scheduledCommandHandlers['CleanupExpiredSessions']

    expect(commandMetadata).to.be.an('object')
    expect(commandMetadata.class).to.equal(CleanupExpiredSessions)
    expect(commandMetadata.scheduledOn).to.deep.equal({
      minute: '0',
      hour: '*/2',
    })
  })

  it('stores complete schedule configuration with all cron fields', () => {
    @ScheduledCommand({
      minute: '30',
      hour: '2',
      day: '1',
      month: '*/3',
      weekDay: '*',
      year: '2024',
    })
    class QuarterlyReport {
      public static async handle(_register: Register): Promise<void> {
        // Report generation logic
      }
    }

    const commandMetadata = Magek.config.scheduledCommandHandlers['QuarterlyReport']

    expect(commandMetadata.scheduledOn).to.deep.equal({
      minute: '30',
      hour: '2',
      day: '1',
      month: '*/3',
      weekDay: '*',
      year: '2024',
    })

    // Suppress unused variable warning
    void QuarterlyReport
  })

  it('allows registering multiple scheduled commands', () => {
    @ScheduledCommand({ minute: '*/5' })
    class HealthCheck {
      public static async handle(_register: Register): Promise<void> {}
    }

    @ScheduledCommand({ minute: '0', hour: '0' })
    class DailyBackup {
      public static async handle(_register: Register): Promise<void> {}
    }

    expect(Magek.config.scheduledCommandHandlers['HealthCheck'].class).to.equal(HealthCheck)
    expect(Magek.config.scheduledCommandHandlers['DailyBackup'].class).to.equal(DailyBackup)
    expect(Magek.config.scheduledCommandHandlers['HealthCheck'].scheduledOn.minute).to.equal('*/5')
    expect(Magek.config.scheduledCommandHandlers['DailyBackup'].scheduledOn.hour).to.equal('0')
  })

  it('throws an error when the same command is registered twice', () => {
    @ScheduledCommand({ minute: '0' })
    class DuplicateCommand {
      public static async handle(_register: Register): Promise<void> {}
    }

    expect(() => {
      // Re-registering a command with the same name should throw
      Magek.configureCurrentEnv((config: MagekConfig) => {
        if (config.scheduledCommandHandlers['DuplicateCommand']) {
          throw new Error(`A command called DuplicateCommand is already registered.
        If you think that this is an error, try performing a clean build.`)
        }
        config.scheduledCommandHandlers['DuplicateCommand'] = {
          class: DuplicateCommand,
          scheduledOn: { minute: '30' },
        }
      })
    }).to.throw(/already registered/)
  })

  it('stores partial schedule configuration correctly', () => {
    @ScheduledCommand({ hour: '6' })
    class MorningTask {
      public static async handle(_register: Register): Promise<void> {}
    }

    const commandMetadata = Magek.config.scheduledCommandHandlers['MorningTask']

    expect(commandMetadata.scheduledOn).to.deep.equal({ hour: '6' })
    expect(commandMetadata.scheduledOn.minute).to.be.undefined
    expect(commandMetadata.scheduledOn.day).to.be.undefined

    // Suppress unused variable warning
    void MorningTask
  })
})
