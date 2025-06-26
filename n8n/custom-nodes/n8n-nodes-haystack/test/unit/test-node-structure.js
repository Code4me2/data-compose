/**
 * Node Structure Validation Test for Haystack
 * Using shared NodeValidator utility
 */

const path = require('path');
const NodeValidator = require('../../../test-utils/common/node-validator');

console.log('Testing Haystack Search Node Structure\n');

// Test 1: Validate package.json
console.log('Test 1: Validating package.json configuration...');
const packagePath = path.join(__dirname, '..', '..', 'package.json');
const packageResults = NodeValidator.validatePackageJson(packagePath);
NodeValidator.printResults(packageResults, 'Package.json Validation');

if (!packageResults.valid) {
  process.exit(1);
}

// Test 2: Validate file structure
console.log('\nTest 2: Validating node file structure...');
const nodeDir = path.join(__dirname, '..', '..');
const fileResults = NodeValidator.validateNodeFiles(nodeDir);
NodeValidator.printResults(fileResults, 'File Structure Validation');

if (!fileResults.valid) {
  process.exit(1);
}

// Test 3: Load and validate compiled node
console.log('\nTest 3: Loading and validating compiled Haystack node...');
const nodePath = path.join(__dirname, '..', '..', 'dist', 'nodes', 'HaystackSearch', 'HaystackSearch.node.js');
const loadResults = NodeValidator.validateNodeLoading(nodePath);

if (!loadResults.loaded) {
  console.error('❌ Failed to load Haystack node:', loadResults.error);
  console.log('\n💡 Make sure to run "npm run build" first');
  process.exit(1);
}

console.log('✅ Haystack node loaded successfully');
console.log('📦 Module loaded:', !!loadResults.module);
console.log('🔧 Node class found:', !!loadResults.nodeClass);

// Test 4: Validate node structure
console.log('\nTest 4: Validating node class structure...');
const structureResults = NodeValidator.validateNodeStructure(loadResults.nodeClass, {
  checkIcon: true
});
NodeValidator.printResults(structureResults, 'Node Structure Validation');

if (!structureResults.valid) {
  process.exit(1);
}

// Test 5: Check node descriptor details
console.log('\nTest 5: Checking node descriptor details...');
try {
  const node = new loadResults.nodeClass();
  const description = node.description;
  
  console.log('Node Details:');
  console.log('  Name:', description.displayName);
  console.log('  Version:', description.version);
  console.log('  Description:', description.description);
  console.log('  Icon:', description.icon);
  
  // Check operations
  const operationProp = description.properties.find(p => p.name === 'operation');
  if (operationProp && operationProp.options) {
    console.log('  Operations:', operationProp.options.length);
    operationProp.options.forEach(op => {
      console.log(`    - ${op.name}: ${op.description || 'No description'}`);
    });
    
    // Verify expected operations
    const expectedOps = [
      'importFromNode',
      'search',
      'getHierarchy',
      'healthCheck',
      'batchHierarchy',
      'getFinalSummary',
      'getCompleteTree',
      'getDocumentWithContext'
    ];
    
    const actualOps = operationProp.options.map(op => op.value);
    console.log('\nVerifying expected operations:');
    
    expectedOps.forEach(expectedOp => {
      if (actualOps.includes(expectedOp)) {
        console.log(`  ✅ ${expectedOp}`);
      } else {
        console.log(`  ❌ ${expectedOp} - Missing`);
      }
    });
    
    // Check for batch_hierarchy issue
    if (actualOps.includes('batchHierarchy')) {
      console.log('\n⚠️  Warning: batchHierarchy operation exists but has no backend implementation');
    }
  }
  
  // Check for Haystack-specific properties
  console.log('\nHaystack-specific properties:');
  const properties = description.properties || [];
  
  // Look for search type
  const searchTypeProp = properties.find(p => p.name === 'searchType');
  if (searchTypeProp) {
    console.log('  ✅ Search type property found');
    if (searchTypeProp.options) {
      console.log('    Options:', searchTypeProp.options.map(o => o.value).join(', '));
    }
  }
  
  // Look for API endpoint
  const endpointProp = properties.find(p => p.name === 'apiEndpoint' || p.name === 'haystackUrl');
  if (endpointProp) {
    console.log('  ✅ API endpoint property found');
  }
  
} catch (error) {
  console.error('❌ Failed to check node descriptor:', error.message);
  process.exit(1);
}

console.log('\n✅ Node structure validation passed');
process.exit(0);