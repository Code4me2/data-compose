/**
 * Environment Configuration Test
 * Migrated to use shared utilities
 */

const EnvLoader = require('../../../test-utils/common/env-loader');

console.log('Testing BitNet Environment Configuration\n');

// Define expected environment schema
const envSchema = {
  BITNET_INSTALLATION_PATH: {
    type: 'path',
    required: true,
    mustExist: true,
    description: 'Path to BitNet installation directory'
  },
  BITNET_MODEL_PATH: {
    type: 'string',
    required: true,
    description: 'Relative path to model file within installation'
  },
  BITNET_SERVER_HOST: {
    type: 'string',
    default: 'localhost',
    description: 'BitNet server hostname'
  },
  BITNET_SERVER_PORT: {
    type: 'number',
    default: 8080,
    description: 'BitNet server port'
  },
  BITNET_EXTERNAL_SERVER_URL: {
    type: 'url',
    required: false,
    description: 'External BitNet server URL (optional)'
  },
  BITNET_CONTEXT_SIZE: {
    type: 'number',
    default: 512,
    description: 'Context window size'
  },
  BITNET_CPU_THREADS: {
    type: 'number',
    default: 4,
    description: 'Number of CPU threads'
  },
  BITNET_GPU_LAYERS: {
    type: 'number',
    default: 0,
    description: 'Number of GPU layers'
  }
};

// Load environment
const loadResults = EnvLoader.loadNodeEnv('bitnet', {
  required: Object.keys(envSchema).filter(key => envSchema[key].required)
});

// Print loading results
EnvLoader.printResults(loadResults, { 
  showVariables: true,
  maskSensitive: false 
});

if (!loadResults.loaded) {
  console.error('\n❌ Failed to load required environment variables');
  
  // Create example env file
  const examplePath = '.env.bitnet.example';
  EnvLoader.createExampleEnv(envSchema, examplePath);
  console.log(`\n💡 Example environment file created at: ${examplePath}`);
  
  process.exit(1);
}

// Validate environment against schema
console.log('\nValidating environment variables...');
const validation = EnvLoader.validateEnv(envSchema);

if (!validation.valid) {
  console.error('\n❌ Environment validation failed:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✅ All environment variables validated successfully');

// Test server wrapper with loaded environment
console.log('\n\nTesting BitNetServerWrapper with loaded configuration...');
try {
  const BitNetServerWrapper = require('../../bitnet-server-wrapper.js');
  const wrapper = new BitNetServerWrapper();
  
  console.log('✅ BitNetServerWrapper instantiated successfully');
  console.log('📁 Installation path:', wrapper.config.bitnetPath);
  console.log('📁 Model path:', wrapper.config.modelPath);
  console.log('🌐 Server URL:', wrapper.getServerUrl());
  
} catch (error) {
  console.error('❌ Failed to test server wrapper:', error.message);
  process.exit(1);
}

console.log('\n✅ Environment configuration test passed');
process.exit(0);