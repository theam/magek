
 * This script publishes all packages marked with shouldPublish=true in rush.json
 * to a local Verdaccio registry for E2E testing purposes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');


function main() {
  console.log('📤 Publishing packages to local Verdaccio registry...\n');

  // Read rush.json using require() - Node.js handles JSON comments natively
  console.log('📖 Reading rush.json...');
  const rushConfigPath = path.join(__dirname, '../../rush.json');
  
  if (!fs.existsSync(rushConfigPath)) {
    console.error('❌ rush.json not found at expected location');
    process.exit(1);
  }
  
  let rushConfig;
  try {
    rushConfig = require(rushConfigPath);
    console.log('✅ Successfully loaded rush.json');
  } catch (error) {
    console.error('❌ Failed to load rush.json:', error.message);
    process.exit(1);
  }
  const publishableProjects = rushConfig.projects.filter(project => project.shouldPublish);

  console.log(`Found ${publishableProjects.length} publishable projects:`);
  publishableProjects.forEach(project => {
    console.log(`  - ${project.packageName} (${project.projectFolder})`);
  });
  console.log();

  // Store the original working directory
  const originalCwd = process.cwd();
  const repoRoot = path.resolve(__dirname, '../..');

  let successCount = 0;
  let failureCount = 0;

  for (const project of publishableProjects) {
    const projectPath = path.resolve(repoRoot, project.projectFolder);
    const packageName = project.packageName;
    
    console.log(`\n📦 Publishing ${packageName}...`);
    
    try {
      // Verify project directory exists
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Project directory not found: ${projectPath}`);
      }

      // Verify package.json exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found in: ${projectPath}`);
      }

      // Change to project directory
      process.chdir(projectPath);
      
      // Pack the package
      console.log(`  📋 Packing ${packageName}...`);
      execSync('npm pack', { stdio: 'pipe' });
      
      // Find the generated .tgz file
      const files = fs.readdirSync('.');
      const tgzFile = files.find(file => file.endsWith('.tgz'));
      
      if (tgzFile) {
        // Publish to local registry
        console.log(`  🚀 Publishing ${tgzFile} to local registry...`);
        execSync(`npm publish "${tgzFile}" --registry http://localhost:4873 --access public`, { 
          stdio: 'pipe'
        });
        
        // Clean up the .tgz file
        fs.unlinkSync(tgzFile);
        
        console.log(`  ✅ Successfully published ${packageName}`);
        successCount++;
      } else {
        throw new Error('No .tgz file found after npm pack');
      }
    } catch (error) {
      console.log(`  ❌ Failed to publish ${packageName}: ${error.message}`);
      failureCount++;
    } finally {
      // Always go back to original working directory
      process.chdir(originalCwd);
    }
  }

  // Summary
  console.log(`\n📊 Publishing Summary:`);
  console.log(`  ✅ Successfully published: ${successCount} packages`);
  console.log(`  ❌ Failed to publish: ${failureCount} packages`);
  
  if (failureCount > 0) {
    console.log(`\n⚠️  Some packages failed to publish. Check the output above for details.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All packages published successfully to Verdaccio!`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
