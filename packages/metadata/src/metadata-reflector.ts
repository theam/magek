import 'reflect-metadata'

export function defineMetadata(metadataKey: string | symbol, metadataValue: unknown, target: object): void {
  Reflect.defineMetadata(metadataKey, metadataValue, target)
}

export function getMetadata<T>(metadataKey: string | symbol, target: object): T | undefined {
  return Reflect.getMetadata(metadataKey, target) as T | undefined
}
