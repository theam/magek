// Setup file to provide Mocha-compatible globals for Vitest
import { beforeEach, afterEach } from 'vitest'

// Alias context to describe for Mocha compatibility
global.context = global.describe

// Re-export afterEach and beforeEach in case they're needed
global.beforeEach = beforeEach
global.afterEach = afterEach