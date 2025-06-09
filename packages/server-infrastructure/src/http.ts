import { httpStatusCodeFor, toClassTitle } from '@booster-ai/common'
import { FastifyReply } from 'fastify'

export enum HttpCodes {
  Ok = 200,
  BadRequest = 400,
  NotAuthorized = 403,
  InternalError = 500,
}

// Wrapper to return a failed request through GraphQL
export async function requestFailed(error: Error, reply: FastifyReply): Promise<void> {
  const statusCode = httpStatusCodeFor(error)
  reply.status(statusCode).send({
    title: toClassTitle(error),
    reason: error.message,
  })
}
