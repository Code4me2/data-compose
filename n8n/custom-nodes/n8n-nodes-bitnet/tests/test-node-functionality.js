// Test script to verify BitNet node functionality
const path = require('path');

console.log('Testing BitNet Node Functionality\n');

// Test 1: Verify compiled node exists and can be loaded
console.log('Test 1: Loading compiled BitNet node...');
try {
    const BitNetNode = require('../dist/nodes/BitNet/BitNet.node.js');
    console.log('✓ BitNet node loaded successfully');
    console.log('✓ Node class:', BitNetNode.BitNet ? 'BitNet class found' : 'ERROR: BitNet class not found');
} catch (error) {
    console.error('✗ Failed to load BitNet node:', error.message);
}

// Test 2: Verify RecursiveSummary module
console.log('\nTest 2: Loading RecursiveSummary module...');
try {
    const RecursiveSummary = require('../dist/nodes/BitNet/RecursiveSummary.js');
    console.log('✓ RecursiveSummary module loaded successfully');
    console.log('✓ RecursiveSummaryManager:', RecursiveSummary.RecursiveSummaryManager ? 'found' : 'ERROR: not found');
} catch (error) {
    console.error('✗ Failed to load RecursiveSummary:', error.message);
}

// Test 3: Verify server wrapper
console.log('\nTest 3: Testing BitNetServerWrapper...');
try {
    const BitNetServerWrapper = require('../bitnet-server-wrapper.js');
    const wrapper = new BitNetServerWrapper();
    console.log('✓ BitNetServerWrapper instantiated successfully');
    console.log('✓ Default installation path:', wrapper.config.bitnetPath);
    console.log('✓ Default model path:', wrapper.config.modelPath);
    console.log('✓ Server URL:', wrapper.getServerUrl());
} catch (error) {
    console.error('✗ Failed to test server wrapper:', error.message);
}

// Test 4: Check if paths exist
console.log('\nTest 4: Verifying configured paths...');
const fs = require('fs');
const envPath = path.resolve(__dirname, '../.env.bitnet');
require('dotenv').config({ path: envPath });

const bitnetPath = process.env.BITNET_INSTALLATION_PATH;
const modelPath = path.join(bitnetPath, process.env.BITNET_MODEL_PATH);

console.log('Checking BitNet installation:', bitnetPath);
if (fs.existsSync(bitnetPath)) {
    console.log('✓ BitNet installation directory exists');
    
    // Check for server binary
    const serverBinary = path.join(bitnetPath, 'build', 'bin', 'llama-server');
    if (fs.existsSync(serverBinary)) {
        console.log('✓ Server binary found:', serverBinary);
    } else {
        console.log('✗ Server binary not found at:', serverBinary);
    }
} else {
    console.log('✗ BitNet installation directory not found');
}

console.log('\nChecking model file:', modelPath);
if (fs.existsSync(modelPath)) {
    console.log('✓ Model file exists');
    const stats = fs.statSync(modelPath);
    console.log('✓ Model size:', (stats.size / 1024 / 1024 / 1024).toFixed(2), 'GB');
} else {
    console.log('✗ Model file not found');
}

// Test 5: Verify node descriptor
console.log('\nTest 5: Checking node descriptor...');
try {
    const { BitNet } = require('../dist/nodes/BitNet/BitNet.node.js');
    const node = new BitNet();
    const description = node.description;
    
    console.log('✓ Node name:', description.displayName);
    console.log('✓ Node version:', description.version);
    console.log('✓ Operations:', description.properties[0].options.length);
    console.log('✓ Default operation:', description.properties[0].default);
} catch (error) {
    console.error('✗ Failed to check node descriptor:', error.message);
}

console.log('\n=== All tests completed ===');