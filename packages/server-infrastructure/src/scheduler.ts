import { ScheduledCommandMetadata, MagekConfig } from '@magek/common'
import * as scheduler from 'node-schedule'

interface ScheduledCommandInfo {
  name: string
  metadata: ScheduledCommandMetadata
}

export function configureScheduler(config: MagekConfig, userProject: any): void {
  const triggerScheduleCommand = userProject['boosterTriggerScheduledCommand']
  Object.keys(config.scheduledCommandHandlers)
    .map((scheduledCommandName) => buildScheduledCommandInfo(config, scheduledCommandName))
    .filter((scheduledCommandInfo) => scheduledCommandInfo.metadata.scheduledOn)
    .forEach((scheduledCommandInfo) => {
      scheduler.scheduleJob(scheduledCommandInfo.name, createCronExpression(scheduledCommandInfo.metadata), () => {
        triggerScheduleCommand({ typeName: scheduledCommandInfo.name })
      })
    })
}

function createCronExpression(scheduledCommandMetadata: ScheduledCommandMetadata): string {
  const { minute = '*', hour = '*', day = '*', month = '*', weekDay = '*' } = scheduledCommandMetadata.scheduledOn
  return `${minute} ${hour} ${day} ${month} ${weekDay}`
}

function buildScheduledCommandInfo(config: MagekConfig, scheduledCommandName: string): ScheduledCommandInfo {
  return {
    name: scheduledCommandName,
    metadata: config.scheduledCommandHandlers[scheduledCommandName],
  }
}
