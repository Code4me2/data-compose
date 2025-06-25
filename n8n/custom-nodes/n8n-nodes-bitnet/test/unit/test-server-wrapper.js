/**
 * Server Wrapper Functionality Test
 * Tests the BitNetServerWrapper class
 */

const path = require('path');
const EnvLoader = require('../../../test-utils/common/env-loader');

console.log('Testing BitNet Server Wrapper\n');

// Load environment first
const envResults = EnvLoader.loadNodeEnv('bitnet');
if (!envResults.loaded) {
  console.error('❌ Failed to load environment variables');
  process.exit(1);
}

// Test 1: Load and instantiate wrapper
console.log('Test 1: Loading BitNetServerWrapper...');
let BitNetServerWrapper;
let wrapper;

try {
  BitNetServerWrapper = require('../../bitnet-server-wrapper.js');
  console.log('✅ BitNetServerWrapper module loaded');
} catch (error) {
  console.error('❌ Failed to load BitNetServerWrapper:', error.message);
  process.exit(1);
}

// Test 2: Create wrapper instance
console.log('\nTest 2: Creating wrapper instance...');
try {
  wrapper = new BitNetServerWrapper();
  console.log('✅ BitNetServerWrapper instantiated');
} catch (error) {
  console.error('❌ Failed to instantiate wrapper:', error.message);
  process.exit(1);
}

// Test 3: Check configuration
console.log('\nTest 3: Checking wrapper configuration...');
console.log('Configuration loaded:');
console.log('  BitNet Path:', wrapper.config.bitnetPath);
console.log('  Model Path:', wrapper.config.modelPath);
console.log('  Server Host:', wrapper.config.host);
console.log('  Server Port:', wrapper.config.port);
console.log('  External URL:', wrapper.config.externalUrl || '(not set)');
console.log('  Context Size:', wrapper.config.contextSize);
console.log('  CPU Threads:', wrapper.config.cpuThreads);
console.log('  GPU Layers:', wrapper.config.gpuLayers);

// Validate configuration
const requiredConfigs = ['bitnetPath', 'modelPath', 'host', 'port'];
let configValid = true;

requiredConfigs.forEach(key => {
  if (!wrapper.config[key]) {
    console.error(`❌ Missing required config: ${key}`);
    configValid = false;
  }
});

if (!configValid) {
  process.exit(1);
}
console.log('✅ All required configurations present');

// Test 4: Test wrapper methods
console.log('\nTest 4: Testing wrapper methods...');

// Test getServerUrl
try {
  const serverUrl = wrapper.getServerUrl();
  console.log('✅ getServerUrl():', serverUrl);
  
  // Validate URL format
  const url = new URL(serverUrl);
  console.log('  Protocol:', url.protocol);
  console.log('  Host:', url.host);
} catch (error) {
  console.error('❌ Invalid server URL:', error.message);
  process.exit(1);
}

// Test buildCommand (if it exists)
if (typeof wrapper.buildCommand === 'function') {
  console.log('\nTest 5: Testing command building...');
  try {
    const command = wrapper.buildCommand();
    console.log('✅ Build command successful');
    console.log('  Command:', command.split(' ')[0]); // Show only executable
    console.log('  Args count:', command.split(' ').length - 1);
  } catch (error) {
    console.error('❌ Failed to build command:', error.message);
  }
}

// Test 6: Check for other expected methods
console.log('\nTest 6: Checking wrapper interface...');
const expectedMethods = [
  'getServerUrl',
  'getModelPath',
  'getConfig'
];

const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(wrapper))
  .filter(name => name !== 'constructor' && typeof wrapper[name] === 'function');

console.log('Available methods:', availableMethods.join(', '));

expectedMethods.forEach(method => {
  if (typeof wrapper[method] === 'function') {
    console.log(`✅ Method '${method}' exists`);
  } else {
    console.log(`⚠️  Method '${method}' not found`);
  }
});

// Test 7: Configuration validation
console.log('\nTest 7: Validating configuration values...');

// Port validation
if (wrapper.config.port < 1 || wrapper.config.port > 65535) {
  console.error('❌ Invalid port number:', wrapper.config.port);
  configValid = false;
} else {
  console.log('✅ Valid port number:', wrapper.config.port);
}

// Context size validation
if (wrapper.config.contextSize < 128) {
  console.warn('⚠️  Context size seems small:', wrapper.config.contextSize);
} else {
  console.log('✅ Valid context size:', wrapper.config.contextSize);
}

// CPU threads validation
if (wrapper.config.cpuThreads < 1) {
  console.error('❌ Invalid CPU threads:', wrapper.config.cpuThreads);
  configValid = false;
} else {
  console.log('✅ Valid CPU threads:', wrapper.config.cpuThreads);
}

// Final result
console.log('\n' + '='.repeat(50));
if (configValid) {
  console.log('✅ Server wrapper test passed');
  process.exit(0);
} else {
  console.log('❌ Server wrapper test failed');
  process.exit(1);
}