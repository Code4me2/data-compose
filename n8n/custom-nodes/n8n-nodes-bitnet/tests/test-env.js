// Test script to verify environment variable loading
const path = require('path');
const dotenv = require('dotenv');

// Load BitNet-specific environment variables
const envPath = path.resolve(__dirname, '../.env.bitnet');
console.log('Loading environment from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.bitnet:', result.error);
} else {
    console.log('Environment loaded successfully!');
    console.log('\nLoaded variables:');
    console.log('BITNET_INSTALLATION_PATH:', process.env.BITNET_INSTALLATION_PATH);
    console.log('BITNET_MODEL_PATH:', process.env.BITNET_MODEL_PATH);
    console.log('BITNET_SERVER_HOST:', process.env.BITNET_SERVER_HOST);
    console.log('BITNET_SERVER_PORT:', process.env.BITNET_SERVER_PORT);
    console.log('BITNET_EXTERNAL_SERVER_URL:', process.env.BITNET_EXTERNAL_SERVER_URL);
    console.log('BITNET_CONTEXT_SIZE:', process.env.BITNET_CONTEXT_SIZE);
    console.log('BITNET_CPU_THREADS:', process.env.BITNET_CPU_THREADS);
    console.log('BITNET_GPU_LAYERS:', process.env.BITNET_GPU_LAYERS);
}

// Test the server wrapper
console.log('\n\nTesting BitNetServerWrapper...');
const BitNetServerWrapper = require('../bitnet-server-wrapper.js');

const wrapper = new BitNetServerWrapper();
console.log('Server configuration:', wrapper.config);