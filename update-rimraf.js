const fs = require('fs');
const path = require('path');

// List of package.json files to update
const filesToUpdate = [
  './packages/framework-provider-local-infrastructure/package.json',
  './packages/cli/package.json',
  './packages/common/package.json',
  './packages/metadata-booster/package.json',
  './packages/framework-core/package.json'
];

// Process each file
filesToUpdate.forEach(filePath => {
  try {
    // Read the file
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the rimraf version
    const updatedContent = content.replace(
      /"rimraf": "\^5\.0\.0"/g,
      '"rimraf": "^6.0.1"'
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(fullPath, updatedContent, 'utf8');
    
    console.log(`Updated rimraf version in ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
});

console.log('Finished updating rimraf versions. Run "rush update" to apply changes.');

