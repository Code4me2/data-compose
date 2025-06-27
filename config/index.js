/**
 * Configuration loader with environment variable interpolation and schema validation
 */

const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Load configuration for the current environment
   */
  load() {
    if (this.config) {
      return this.config;
    }

    // Load default configuration
    const defaultConfig = this.loadFile('default.json');
    
    // Load environment-specific configuration
    let envConfig = {};
    const envFile = `${this.environment}.json`;
    if (fs.existsSync(path.join(__dirname, envFile))) {
      envConfig = this.loadFile(envFile);
    }

    // Merge configurations (environment overrides default)
    this.config = this.deepMerge(defaultConfig, envConfig);

    // Interpolate environment variables
    this.config = this.interpolateEnvVars(this.config);

    // Validate against schema
    this.validateConfig();

    return this.config;
  }

  /**
   * Load a configuration file
   */
  loadFile(filename) {
    const filepath = path.join(__dirname, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Interpolate environment variables in configuration
   */
  interpolateEnvVars(obj) {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with environment variable value
      return obj.replace(/\${([^}]+)}/g, (match, varName) => {
        return process.env[varName] || match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateEnvVars(item));
    } else if (this.isObject(obj)) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateEnvVars(value);
      }
      return result;
    }
    return obj;
  }

  /**
   * Validate configuration against schema
   */
  validateConfig() {
    // Basic validation - in production, use a JSON schema validator like ajv
    const required = ['app', 'server', 'services'];
    for (const field of required) {
      if (!(field in this.config)) {
        throw new Error(`Required configuration field missing: ${field}`);
      }
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(this.config.app.environment)) {
      throw new Error(`Invalid environment: ${this.config.app.environment}`);
    }

    // Validate port
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      throw new Error(`Invalid port: ${this.config.server.port}`);
    }
  }

  /**
   * Get a configuration value by path
   */
  get(path, defaultValue = undefined) {
    if (!this.config) {
      this.load();
    }

    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false) === true;
  }

  /**
   * Get webhook configuration
   */
  getWebhook(webhookName) {
    return this.get(`webhooks.${webhookName}`, null);
  }
}

// Export singleton instance
module.exports = new ConfigLoader();