import * as chai from 'chai'
const sinonChai = require('sinon-chai').default || require('sinon-chai')
import chaiAsPromised from 'chai-as-promised'

chai.use(sinonChai)
chai.use(chaiAsPromised)

export const expect = chai.expect
