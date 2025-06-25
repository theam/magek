const fs = require('fs');
const path = require('path');

/**
 * Simple script to test the validation logic locally
 */

// Create a minimal test project structure
const testProjectPath = './test-local-project';

// Clean up any existing test project
if (fs.existsSync(testProjectPath)) {
  fs.rmSync(testProjectPath, { recursive: true, force: true });
}

// Create the basic structure
fs.mkdirSync(testProjectPath);
fs.mkdirSync(path.join(testProjectPath, 'src'));
fs.mkdirSync(path.join(testProjectPath, 'src', 'config'));

// Create package.json
fs.writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify({
  name: 'test-local-project',
  version: '1.0.0',
  dependencies: {
    'some-dependency': '1.0.0'
  },
  devDependencies: {
    'some-dev-dependency': '1.0.0'
  }
}, null, 2));

// Create tsconfig.json
fs.writeFileSync(path.join(testProjectPath, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'es2020',
    module: 'commonjs'
  }
}, null, 2));

// Create src/index.ts
fs.writeFileSync(path.join(testProjectPath, 'src', 'index.ts'), 'export {};\n');

// Create src/config/config.ts
fs.writeFileSync(path.join(testProjectPath, 'src', 'config', 'config.ts'), 'export const config = {};\n');

console.log('✅ Test project structure created');

// Import and run validation
const validation = require('./scaffold.spec.js');

try {
  validation.validateProjectStructure(testProjectPath);
  validation.validateTokenReplacement(testProjectPath, 'test-local-project');
  validation.validateDependencies(testProjectPath);
  console.log('🎉 Local validation test passed!');
} catch (error) {
  console.error('❌ Local validation test failed:', error.message);
  process.exit(1);
} finally {
  // Clean up
  if (fs.existsSync(testProjectPath)) {
    fs.rmSync(testProjectPath, { recursive: true, force: true });
  }
}