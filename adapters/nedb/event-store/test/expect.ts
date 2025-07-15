import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { default as sinonChai } from 'sinon-chai'

chai.use(sinonChai)
chai.use(chaiAsPromised)

export const expect = chai.expect
