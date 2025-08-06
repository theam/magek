 
import { stub, match, SinonStub, fake, replace } from 'sinon'
import { faker } from '@faker-js/faker'
import {
  GraphQLRequestEnvelope,
  GraphQLStart,
  GraphQLStop,
  MessageTypes,
  MagekConfig,
  GraphQLRequestEnvelopeError,
  UserEnvelope,
  ConnectionDataEnvelope,
} from '@magek/common'
import { GraphQLWebsocketHandler } from '../../../../src/services/graphql/websocket-protocol/graphql-websocket-protocol'
import { ExecutionResult } from 'graphql'
import { expect } from '../../../expect'
import { MagekTokenVerifier } from '../../../../src/token-verifier'

describe('the `GraphQLWebsocketHandler`', () => {
  let config: MagekConfig
  let websocketHandler: GraphQLWebsocketHandler
  let onStartCallback: (
    envelope: GraphQLRequestEnvelope
  ) => Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>
  let onStopCallback: (connectionID: string, messageID: string) => Promise<void>
  let onTerminateCallback: (connectionID: string) => Promise<void>
  let envelope: GraphQLRequestEnvelope
  let tokenVerifier: MagekTokenVerifier

  beforeEach(() => {
    config = new MagekConfig('test')
    config.logger = {
      debug: fake(),
      info: fake(),
      warn: fake(),
      error: fake(),
    }
    
    // Mock the session store using replace
    const mockSessionStore = {
      storeConnection: stub(),
      fetchConnection: stub(),
      deleteConnection: stub(),
      storeSubscription: stub(),
      fetchSubscription: stub(),
      deleteSubscription: stub(),
      fetchSubscriptionsForConnection: stub(),
      deleteSubscriptionsForConnection: stub(),
    }
    replace(config, 'sessionStore', mockSessionStore)
    
    // Mock the provider messaging
    config.provider = {
      messaging: {
        sendMessage: stub(),
      },
    } as any
    
    tokenVerifier = new MagekTokenVerifier(config)
    onStartCallback = stub()
    onStopCallback = stub()
    onTerminateCallback = stub()

    websocketHandler = new GraphQLWebsocketHandler(
      config,
      {
        onStartOperation: onStartCallback,
        onStopOperation: onStopCallback,
        onTerminate: onTerminateCallback,
      },
      tokenVerifier
    )
    envelope = {
      currentUser: undefined,
      eventType: 'MESSAGE',
      requestID: faker.lorem.word(10),
    }
  })

  describe('the "handle" method', () => {
    let resultPromise: Promise<void> | undefined
    beforeEach(() => {
      resultPromise = undefined
    })
    afterEach(async () => {
      // The handle method must never fail, just log or send the error to the connection ID.
      // We ensure here that the returned promise from the method is always fulfilled
      expect(resultPromise, "The test didn't set the 'resultPromise' variable with the result of 'handle' method").not
        .to.be.undefined
      await expect(resultPromise).to.eventually.be.fulfilled
    })

    describe('with an envelope with no connectionID', () => {
      beforeEach(() => {
        envelope.connectionID = undefined
      })

      it('just logs an error', async () => {
        resultPromise = websocketHandler.handle(envelope)
        await resultPromise
        expect(config.logger?.error).to.be.calledOnceWithExactly(match.any, 'Missing websocket connectionID')
      })
    })

    describe('with an envelope with connectionID', () => {
      beforeEach(() => {
        envelope.connectionID = faker.lorem.word(10)
      })

      describe('with an error in the envelope', () => {
        const errorMessage = faker.lorem.sentences(1)
        let envelopeWithError: GraphQLRequestEnvelopeError
        beforeEach(() => {
          envelopeWithError = {
            ...envelope,
            error: new Error(errorMessage),
          }
        })

        it('sends the error to the client', async () => {
          resultPromise = websocketHandler.handle(envelopeWithError)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelopeWithError.connectionID,
            match({
              type: MessageTypes.GQL_CONNECTION_ERROR,
              payload: errorMessage,
            })
          )
        })
      })

      describe('with an empty value', () => {
        beforeEach(() => {
          envelope.value = undefined
        })

        it('sends the right error', async () => {
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_CONNECTION_ERROR,
              payload: 'Received an empty GraphQL body',
            })
          )
        })
      })

      describe('with a value with GQL_CONNECTION_INIT message', () => {
        beforeEach(() => {
          envelope.value = {
            type: MessageTypes.GQL_CONNECTION_INIT,
            payload: {},
          }
        })

        it('sends back a GQL_CONNECTION_ACK', async () => {
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({ type: MessageTypes.GQL_CONNECTION_ACK })
          )
        })

        it('stores connection data', async () => {
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.sessionStore.storeConnection).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              user: undefined,
              expirationTime: match.number,
            })
          )
        })

        describe('with an access token', () => {
          beforeEach(() => {
            envelope.value = {
              type: MessageTypes.GQL_CONNECTION_INIT,
              payload: {
                Authorization: faker.datatype.uuid(),
              },
            }
          })

          it('stores connection data including the user', async () => {
            const expectedUser: UserEnvelope = {
              username: faker.internet.email(),
              roles: [faker.lorem.word()],
              claims: {},
            }

            const fakeVerifier = fake.resolves(expectedUser)
            replace(tokenVerifier, 'verify', fakeVerifier)

            resultPromise = websocketHandler.handle(envelope)
            await resultPromise
            expect(config.sessionStore.storeConnection).to.be.calledOnceWithExactly(
              config,
              envelope.connectionID,
              match({
                user: expectedUser,
                expirationTime: match.number,
              })
            )
          })
        })
      })

      describe('with a value with GQL_START message', () => {
        beforeEach(() => {
          envelope.value = {
            id: faker.lorem.word(10),
            type: MessageTypes.GQL_START,
            payload: {
              query: faker.lorem.word(20),
              variables: { aField: faker.lorem.word(5) },
              operationName: faker.lorem.word(10),
            },
          }
        })

        it('fails if there is no "id"', async () => {
          const value = envelope.value as GraphQLStart
          value.id = undefined as any // Force "id" to be undefined
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_CONNECTION_ERROR,
              payload: `Missing "id" in ${MessageTypes.GQL_START} message`,
            })
          )
        })

        it('fails if there is no "payload"', async () => {
          const value = envelope.value as GraphQLStart
          value.payload = undefined as any
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_ERROR,
              id: value.id,
              payload: {
                errors: match.some(
                  match.has('message', 'Message payload is invalid it must contain at least the "query" property')
                ),
              },
            })
          )
        })

        it('fails if there is no "query"', async () => {
          const message = envelope.value as GraphQLStart
          message.payload.query = undefined as any
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_ERROR,
              id: message.id,
              payload: {
                errors: match.some(
                  match.has('message', 'Message payload is invalid it must contain at least the "query" property')
                ),
              },
            })
          )
        })

        it('calls "onStartOperation" with the right parameters', async () => {
          const message = envelope.value as GraphQLStart
          const connectionData: ConnectionDataEnvelope = {
            user: {
              username: faker.internet.email(),
              roles: [faker.lorem.word()],
              claims: {},
            },
            expirationTime: faker.datatype.number(),
          }
          const fetchDataFake: SinonStub = config.sessionStore.fetchConnection as any
          fetchDataFake.withArgs(config, envelope.connectionID).returns(connectionData)

          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(onStartCallback).to.be.calledOnceWithExactly({
            ...envelope,
            currentUser: connectionData.user,
            value: {
              ...message.payload,
              id: message.id,
            },
          })
        })

        context('when "onStartOperation" returns the result of a subscription', () => {
          beforeEach(() => {
            onStartCallback = stub().returns({ next: () => {} })
            websocketHandler = new GraphQLWebsocketHandler(
              config,
              {
                onStartOperation: onStartCallback,
                onStopOperation: onStopCallback,
                onTerminate: onTerminateCallback,
              },
              tokenVerifier
            )
          })

          it('does not send anything back', async () => {
            resultPromise = websocketHandler.handle(envelope)
            await resultPromise
            expect(config.provider.messaging.sendMessage).not.to.be.called
          })
        })

        context('when "onStartOperation" returns the result of a query or mutation', () => {
          const result = {
            data: 'The result',
          }
          beforeEach(() => {
            onStartCallback = stub().returns(result)
            websocketHandler = new GraphQLWebsocketHandler(
              config,
              {
                onStartOperation: onStartCallback,
                onStopOperation: onStopCallback,
                onTerminate: onTerminateCallback,
              },
              tokenVerifier
            )
          })

          it('sends back the expected messages', async () => {
            resultPromise = websocketHandler.handle(envelope)
            await resultPromise
            const sendMessageFake: SinonStub = config.provider.messaging.sendMessage as any
            expect(sendMessageFake).to.be.calledTwice
            expect(sendMessageFake.getCall(0).args).to.be.deep.equal([
              config,
              envelope.connectionID,
              {
                type: MessageTypes.GQL_DATA,
                id: (envelope.value as GraphQLStart).id,
                payload: result,
              },
            ])
            expect(sendMessageFake.getCall(1).args).to.be.deep.equal([
              config,
              envelope.connectionID,
              {
                type: MessageTypes.GQL_COMPLETE,
                id: (envelope.value as GraphQLStart).id,
              },
            ])
          })
        })
      })

      describe('with a value with GQL_STOP message', () => {
        beforeEach(() => {
          envelope.value = {
            type: MessageTypes.GQL_STOP,
            id: faker.lorem.word(10),
          }
        })

        it('fails if there is no "id"', async () => {
          const value = envelope.value as GraphQLStop
          value.id = undefined as any // Force "id" to be undefined
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.be.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_CONNECTION_ERROR,
              payload: `Missing "id" in ${MessageTypes.GQL_STOP} message`,
            })
          )
        })

        it('calls "onStopOperation" with the right parameters', async () => {
          const value = envelope.value as GraphQLStop
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(onStopCallback).to.have.been.calledOnceWithExactly(envelope.connectionID, value.id)
        })

        it('sends back a GQL_COMPLETE message', async () => {
          const value = envelope.value as GraphQLStop
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(config.provider.messaging.sendMessage).to.have.been.calledOnceWithExactly(
            config,
            envelope.connectionID,
            match({
              type: MessageTypes.GQL_COMPLETE,
              id: value.id,
            })
          )
        })
      })

      describe('with a value with GQL_CONNECTION_TERMINATE message', () => {
        beforeEach(() => {
          envelope.value = {
            type: MessageTypes.GQL_CONNECTION_TERMINATE,
          }
        })

        it('calls "onTerminateOperation" with the right parameters and sends nothing back', async () => {
          resultPromise = websocketHandler.handle(envelope)
          await resultPromise
          expect(onTerminateCallback).to.have.been.calledOnceWithExactly(envelope.connectionID)
          expect(config.provider.messaging.sendMessage).not.to.have.been.called
        })
      })
    })
  })
})
