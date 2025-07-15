// test/setup.ts
import * as sinon from 'sinon';

// Global setup for tests
export const mochaHooks = {
  afterEach() {
    // Reset all sinon stubs and spies after each test
    sinon.restore();
  }
};