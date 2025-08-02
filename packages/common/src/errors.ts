import { EntityInterface, EventInterface } from './concepts'

export class MagekError extends Error {
  readonly code: string
  constructor(
    message: string,
    code?: string,
    readonly data?: Record<string, unknown>
  ) {
    super(message)
    this.code = code ?? this.constructor.name
  }
}

export class InvalidParameterError extends MagekError {}
export class InvalidProtocolError extends MagekError {}
export class NotAuthorizedError extends MagekError {}
export class MagekTokenExpiredError extends MagekError {}
export class MagekTokenNotBeforeError extends MagekError {}
export class NotFoundError extends MagekError {}
export class InvalidVersionError extends MagekError {}
export class OptimisticConcurrencyUnexpectedVersionError extends MagekError {}

export class InvalidEventError extends MagekError {}
export class InvalidReducerError extends MagekError {
  readonly eventInstance: EventInterface
  readonly snapshotInstance: EntityInterface | null

  constructor(message: string, eventInstance: EventInterface, snapshotInstance: EntityInterface | null) {
    super(message)
    this.eventInstance = eventInstance
    this.snapshotInstance = snapshotInstance
  }
}

export function httpStatusCodeFor(error: Error): number {
  const errorToHTTPCode: Record<string, number> = {
    [InvalidParameterError.name]: 400,
    [InvalidProtocolError.name]: 400,
    [NotAuthorizedError.name]: 401,
    [MagekTokenExpiredError.name]: 401,
    [MagekTokenNotBeforeError.name]: 401,
    [NotFoundError.name]: 404,
    [InvalidVersionError.name]: 422,
  }

  return errorToHTTPCode[error.constructor.name] ?? 500
}
