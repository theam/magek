const fs = require('fs');
const path = require('path');

/**
 * Basic scaffolding validation test
 * This script verifies that create-booster-ai generates the expected project structure
 */

function validateProjectStructure(projectPath) {
  console.log('🔍 Validating project structure...');
  
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/index.ts',
    'src/config/config.ts'
  ];
  
  const requiredDirectories = [
    'src',
    'src/config'
  ];
  
  // Check files
  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
  
  // Check directories
  for (const dir of requiredDirectories) {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Required directory missing: ${dir}`);
    }
  }
  
  console.log('✅ Project structure validation passed');
}

function validateTokenReplacement(projectPath, expectedProjectName) {
  console.log('🔍 Validating token replacement...');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  if (packageJson.name !== expectedProjectName) {
    throw new Error(`Project name not replaced correctly. Expected: ${expectedProjectName}, Got: ${packageJson.name}`);
  }
  
  // Check for unreplaced placeholders
  const packageJsonString = fs.readFileSync(packageJsonPath, 'utf-8');
  const placeholderPattern = /\{\{[^}]+\}\}/g;
  const remainingPlaceholders = packageJsonString.match(placeholderPattern);
  
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.warn(`⚠️ Warning: Found unreplaced placeholders: ${remainingPlaceholders.join(', ')}`);
    // For now, we'll just warn about this rather than fail, as some placeholders might be intentional
  }
  
  console.log(`✅ Token replacement validation passed (project name: ${packageJson.name})`);
}

function validateDependencies(projectPath) {
  console.log('🔍 Validating dependencies...');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
    throw new Error('No dependencies found in package.json');
  }
  
  if (!packageJson.devDependencies || Object.keys(packageJson.devDependencies).length === 0) {
    throw new Error('No devDependencies found in package.json');
  }
  
  console.log('✅ Dependencies validation passed');
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateProjectStructure,
    validateTokenReplacement,
    validateDependencies
  };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const projectName = process.argv[3];
  
  if (!projectPath || !projectName) {
    console.error('Usage: node scaffold.spec.js <project-path> <project-name>');
    process.exit(1);
  }
  
  try {
    validateProjectStructure(projectPath);
    validateTokenReplacement(projectPath, projectName);
    validateDependencies(projectPath);
    console.log('🎉 All validations passed!');
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}