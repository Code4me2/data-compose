/**
 * File Path Validation Test
 * Verifies that configured paths exist
 */

const fs = require('fs');
const path = require('path');
const EnvLoader = require('../../../test-utils/common/env-loader');

console.log('Testing BitNet File Paths\n');

// Load environment first
const envResults = EnvLoader.loadNodeEnv('bitnet');
if (!envResults.loaded) {
  console.error('❌ Failed to load environment variables');
  process.exit(1);
}

const bitnetPath = process.env.BITNET_INSTALLATION_PATH;
const modelPath = process.env.BITNET_MODEL_PATH;

if (!bitnetPath) {
  console.error('❌ BITNET_INSTALLATION_PATH not set');
  process.exit(1);
}

// Test 1: Check BitNet installation directory
console.log('Test 1: Checking BitNet installation directory...');
console.log(`Path: ${bitnetPath}`);

if (fs.existsSync(bitnetPath)) {
  console.log('✅ BitNet installation directory exists');
  
  // List directory contents
  try {
    const contents = fs.readdirSync(bitnetPath);
    console.log('📁 Directory contents:', contents.slice(0, 10).join(', '), 
                contents.length > 10 ? '...' : '');
  } catch (error) {
    console.log('⚠️  Could not list directory contents:', error.message);
  }
} else {
  console.log('❌ BitNet installation directory not found');
  console.log('\n💡 Please ensure BitNet is installed at the configured path');
  process.exit(1);
}

// Test 2: Check for server binary
console.log('\nTest 2: Checking for server binary...');
const serverBinaryPaths = [
  path.join(bitnetPath, 'build', 'bin', 'llama-server'),
  path.join(bitnetPath, 'build', 'bin', 'server'),
  path.join(bitnetPath, 'llama-server'),
  path.join(bitnetPath, 'server')
];

let serverBinaryFound = false;
let foundServerPath = null;

for (const binaryPath of serverBinaryPaths) {
  if (fs.existsSync(binaryPath)) {
    serverBinaryFound = true;
    foundServerPath = binaryPath;
    break;
  }
}

if (serverBinaryFound) {
  console.log('✅ Server binary found at:', foundServerPath);
  
  // Check if executable
  try {
    fs.accessSync(foundServerPath, fs.constants.X_OK);
    console.log('✅ Server binary is executable');
  } catch {
    console.log('⚠️  Server binary exists but may not be executable');
  }
} else {
  console.log('❌ Server binary not found in expected locations:');
  serverBinaryPaths.forEach(p => console.log(`  - ${p}`));
}

// Test 3: Check model file
console.log('\nTest 3: Checking model file...');
if (modelPath) {
  const fullModelPath = path.isAbsolute(modelPath) 
    ? modelPath 
    : path.join(bitnetPath, modelPath);
    
  console.log(`Path: ${fullModelPath}`);
  
  if (fs.existsSync(fullModelPath)) {
    console.log('✅ Model file exists');
    
    // Get file stats
    try {
      const stats = fs.statSync(fullModelPath);
      const sizeInGB = (stats.size / 1024 / 1024 / 1024).toFixed(2);
      console.log(`📊 Model size: ${sizeInGB} GB`);
      console.log(`📅 Last modified: ${stats.mtime.toISOString()}`);
      
      // Check file extension
      const ext = path.extname(fullModelPath).toLowerCase();
      const validExts = ['.gguf', '.bin', '.pth', '.safetensors'];
      if (validExts.includes(ext)) {
        console.log(`✅ Valid model file extension: ${ext}`);
      } else {
        console.log(`⚠️  Unusual model file extension: ${ext}`);
      }
    } catch (error) {
      console.log('⚠️  Could not read model file stats:', error.message);
    }
  } else {
    console.log('❌ Model file not found');
    console.log('\n💡 Please ensure the model file exists at the configured path');
  }
} else {
  console.log('⚠️  BITNET_MODEL_PATH not configured');
}

// Test 4: Check for other important files
console.log('\nTest 4: Checking for additional BitNet files...');
const additionalFiles = [
  { path: 'LICENSE', required: false },
  { path: 'README.md', required: false },
  { path: 'requirements.txt', required: false },
  { path: 'setup.py', required: false }
];

additionalFiles.forEach(file => {
  const filePath = path.join(bitnetPath, file.path);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : (file.required ? '❌' : '⚠️ ');
  console.log(`${status} ${file.path}: ${exists ? 'found' : 'not found'}`);
});

// Summary
console.log('\n' + '='.repeat(50));
const criticalErrors = !serverBinaryFound || (modelPath && !fs.existsSync(path.join(bitnetPath, modelPath)));

if (criticalErrors) {
  console.log('❌ Path validation failed - critical files missing');
  process.exit(1);
} else {
  console.log('✅ Path validation passed');
  process.exit(0);
}