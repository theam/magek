import * as path from 'path'

export const eventsDatabase = internalPath('events.json')
export const eventProcessingCursorFile = internalPath('event-processing-cursor.json')

function internalPath(filename: string): string {
  return path.normalize(path.join('.', '.magek', filename))
}