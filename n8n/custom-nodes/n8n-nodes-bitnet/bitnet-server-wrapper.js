const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const dotenv = require('dotenv');

// Load BitNet-specific environment variables
const envPath = path.resolve(__dirname, '.env.bitnet');
dotenv.config({ path: envPath });

class BitNetServerWrapper {
    constructor(config = {}) {
        this.config = {
            bitnetPath: process.env.BITNET_INSTALLATION_PATH || config.bitnetPath || '/opt/bitnet',
            modelPath: process.env.BITNET_MODEL_PATH || config.modelPath || 'models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf',
            host: process.env.BITNET_SERVER_HOST || config.host || '127.0.0.1',
            port: parseInt(process.env.BITNET_SERVER_PORT || config.port || '8080'),
            contextSize: parseInt(process.env.BITNET_CONTEXT_SIZE || config.contextSize || '4096'),
            threads: parseInt(process.env.BITNET_CPU_THREADS || config.threads || '4'),
            gpuLayers: parseInt(process.env.BITNET_GPU_LAYERS || config.gpuLayers || '0'),
            batchSize: parseInt(process.env.BITNET_BATCH_SIZE || config.batchSize || '512'),
            continuousBatching: process.env.BITNET_CONTINUOUS_BATCHING === 'true' || config.continuousBatching !== false,
            cacheReuse: parseInt(process.env.BITNET_CACHE_REUSE || config.cacheReuse || '256'),
            ...config
        };
        
        this.serverProcess = null;
        this.isReady = false;
        this.startupTimeout = 60000; // 60 seconds
        this.healthCheckInterval = 2000; // 2 seconds
    }

    async start() {
        if (this.serverProcess) {
            console.log('BitNet server is already running');
            return true;
        }

        console.log('Starting BitNet server...');
        
        // Build the server binary path
        const serverBinary = path.join(
            this.config.bitnetPath,
            'build',
            'bin',
            process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
        );

        // Check if binary exists
        if (!fs.existsSync(serverBinary)) {
            throw new Error(`BitNet server binary not found at: ${serverBinary}. Please build BitNet first.`);
        }

        // Build the model path
        const modelFullPath = path.isAbsolute(this.config.modelPath) 
            ? this.config.modelPath 
            : path.join(this.config.bitnetPath, this.config.modelPath);

        // Check if model exists
        if (!fs.existsSync(modelFullPath)) {
            throw new Error(`Model file not found at: ${modelFullPath}`);
        }

        // Prepare server arguments
        const args = [
            '-m', modelFullPath,
            '-c', this.config.contextSize.toString(),
            '-t', this.config.threads.toString(),
            '-ngl', this.config.gpuLayers.toString(),
            '--host', this.config.host,
            '--port', this.config.port.toString(),
            '--metrics', // Enable metrics endpoint
            '--slots', // Enable slots monitoring
            '--log-disable' // Disable verbose logging
        ];

        // Add continuous batching if enabled
        if (this.config.continuousBatching) {
            args.push('-cb');
        }

        // Additional args for recursive summaries
        args.push(
            '--ctx-size', this.config.contextSize.toString(),
            '--batch-size', this.config.batchSize.toString(),
            '--cache-reuse', this.config.cacheReuse.toString()
        );

        // Start the server process
        this.serverProcess = spawn(serverBinary, args, {
            cwd: this.config.bitnetPath,
            env: { ...process.env }
        });

        // Handle server output
        this.serverProcess.stdout.on('data', (data) => {
            console.log(`BitNet Server: ${data.toString().trim()}`);
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error(`BitNet Server Error: ${data.toString().trim()}`);
        });

        this.serverProcess.on('error', (error) => {
            console.error('Failed to start BitNet server:', error);
            this.serverProcess = null;
        });

        this.serverProcess.on('exit', (code, signal) => {
            console.log(`BitNet server exited with code ${code} and signal ${signal}`);
            this.serverProcess = null;
            this.isReady = false;
        });

        // Wait for server to be ready
        try {
            await this.waitForServer();
            this.isReady = true;
            console.log('BitNet server is ready!');
            return true;
        } catch (error) {
            this.stop();
            throw error;
        }
    }

    async waitForServer() {
        const startTime = Date.now();
        
        while (Date.now() - startTime < this.startupTimeout) {
            try {
                const response = await this.checkHealth();
                if (response && response.status === 'ok') {
                    return true;
                }
            } catch (error) {
                // Server not ready yet
            }
            
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, this.healthCheckInterval));
        }
        
        throw new Error('BitNet server failed to start within timeout period');
    }

    async checkHealth() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.config.host,
                port: this.config.port,
                path: '/health',
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Health check timeout'));
            });

            req.end();
        });
    }

    stop() {
        if (this.serverProcess) {
            console.log('Stopping BitNet server...');
            this.serverProcess.kill('SIGTERM');
            
            // Force kill after 5 seconds if not terminated
            setTimeout(() => {
                if (this.serverProcess) {
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
            
            this.serverProcess = null;
            this.isReady = false;
        }
    }

    isRunning() {
        return this.serverProcess !== null && this.isReady;
    }

    getServerUrl() {
        return `http://${this.config.host}:${this.config.port}`;
    }

    // Utility method for recursive summaries
    async createSummaryPrompt(text, level = 0, maxChunkSize = 2048) {
        const chunks = this.splitTextIntoChunks(text, maxChunkSize);
        const summaryConfig = {
            0: { prefix: "Summarize the following text concisely:", ratio: 0.3 },
            1: { prefix: "Create a detailed summary of:", ratio: 0.25 },
            2: { prefix: "Extract key points from:", ratio: 0.2 },
            3: { prefix: "Provide a brief overview of:", ratio: 0.15 }
        };

        const config = summaryConfig[Math.min(level, 3)];
        return {
            chunks,
            config,
            estimatedTokens: Math.floor(text.length / 4), // Rough estimate
            targetLength: Math.floor(text.length * config.ratio)
        };
    }

    splitTextIntoChunks(text, maxChunkSize) {
        const chunks = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChunkSize) {
                currentChunk += sentence;
            } else {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }
}

// Export for use in n8n node
module.exports = BitNetServerWrapper;

// CLI usage
if (require.main === module) {
    const wrapper = new BitNetServerWrapper();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down BitNet server...');
        wrapper.stop();
        process.exit(0);
    });

    // Start server
    wrapper.start().then(() => {
        console.log('BitNet server is running. Press Ctrl+C to stop.');
    }).catch((error) => {
        console.error('Failed to start BitNet server:', error);
        process.exit(1);
    });
}