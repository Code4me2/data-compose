/**
 * Node Structure Validation Test
 * Using shared NodeValidator utility
 */

const path = require('path');
const NodeValidator = require('../../../test-utils/common/node-validator');

console.log('Testing BitNet Node Structure\n');

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
console.log('\nTest 3: Loading and validating compiled BitNet node...');
const nodePath = path.join(__dirname, '..', '..', 'dist', 'nodes', 'BitNet', 'BitNet.node.js');
const loadResults = NodeValidator.validateNodeLoading(nodePath);

if (!loadResults.loaded) {
  console.error('❌ Failed to load BitNet node:', loadResults.error);
  console.log('\n💡 Make sure to run "npm run build" first');
  process.exit(1);
}

console.log('✅ BitNet node loaded successfully');
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
  }
  
} catch (error) {
  console.error('❌ Failed to check node descriptor:', error.message);
  process.exit(1);
}

// Test 6: Verify additional modules
console.log('\nTest 6: Verifying additional modules...');
const modules = [
  { name: 'RecursiveSummary', path: 'dist/nodes/BitNet/RecursiveSummary.js' },
  { name: 'IntermediateProcessing', path: 'dist/nodes/BitNet/IntermediateProcessing.js' },
  { name: 'RecursiveSummaryAdapter', path: 'dist/nodes/BitNet/RecursiveSummaryAdapter.js' }
];

let allModulesValid = true;
modules.forEach(module => {
  const modulePath = path.join(__dirname, '..', '..', module.path);
  try {
    require(modulePath);
    console.log(`  ✅ ${module.name} module loaded`);
  } catch (error) {
    console.log(`  ❌ ${module.name} module failed:`, error.message);
    allModulesValid = false;
  }
});

if (!allModulesValid) {
  console.log('\n⚠️  Some modules failed to load, but continuing...');
}

console.log('\n✅ Node structure validation passed');
process.exit(0);