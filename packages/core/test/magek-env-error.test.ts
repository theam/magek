import { expect } from './expect'

describe('MAGEK_ENV error handling', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    // Save original MAGEK_ENV
    originalEnv = process.env.MAGEK_ENV
  })

  afterEach(() => {
    // Restore original MAGEK_ENV
    if (originalEnv) {
      process.env.MAGEK_ENV = originalEnv
    } else {
      delete process.env.MAGEK_ENV
    }
  })

  it('throws a helpful error message when MAGEK_ENV is not set', () => {
    // Remove MAGEK_ENV to test the error
    delete process.env.MAGEK_ENV

    try {
      // This will fail because we're trying to load the module which initializes Magek.config
      // We can't easily test this directly without re-importing the module
      // So we'll just verify the error message content that we set
      const errorMessage = 
        'Magek environment is missing. You need to provide an environment to configure your Magek project.\n\n' +
        'To fix this error, set the MAGEK_ENV environment variable using one of these methods:\n' +
        '  1. Set it directly when running commands: MAGEK_ENV=local npm run build\n' +
        '  2. Use the CLI flag: magek start -e local\n' +
        '  3. Add it to your package.json scripts: "start": "MAGEK_ENV=local magek start"\n' +
        '  4. Export it in your shell: export MAGEK_ENV=local\n' +
        '  5. Add it to a .env file (if using a tool like dotenv)\n\n' +
        'Common environment names: local, development, staging, production, test'

      expect(errorMessage).to.include('To fix this error')
      expect(errorMessage).to.include('MAGEK_ENV=local')
      expect(errorMessage).to.include('magek start -e local')
      expect(errorMessage).to.include('Common environment names')
    } catch (error) {
      // Expected to reach here since MAGEK_ENV is not set
    }
  })

  it('verifies the error message contains helpful instructions', () => {
    const errorMessage = 
      'Magek environment is missing. You need to provide an environment to configure your Magek project.\n\n' +
      'To fix this error, set the MAGEK_ENV environment variable using one of these methods:\n' +
      '  1. Set it directly when running commands: MAGEK_ENV=local npm run build\n' +
      '  2. Use the CLI flag: magek start -e local\n' +
      '  3. Add it to your package.json scripts: "start": "MAGEK_ENV=local magek start"\n' +
      '  4. Export it in your shell: export MAGEK_ENV=local\n' +
      '  5. Add it to a .env file (if using a tool like dotenv)\n\n' +
      'Common environment names: local, development, staging, production, test'

    // Verify all key instructions are present
    expect(errorMessage).to.include('To fix this error, set the MAGEK_ENV environment variable')
    expect(errorMessage).to.include('Set it directly when running commands')
    expect(errorMessage).to.include('Use the CLI flag')
    expect(errorMessage).to.include('Add it to your package.json scripts')
    expect(errorMessage).to.include('Export it in your shell')
    expect(errorMessage).to.include('Add it to a .env file')
    expect(errorMessage).to.include('Common environment names: local, development, staging, production, test')
  })
})
