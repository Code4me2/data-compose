/**
 * Environment Variable Loading Utilities
 * Standardized environment handling for n8n custom nodes
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class EnvLoader {
  /**
   * Load environment variables for a specific node
   * @param {string} nodeName - Name of the node (e.g., 'bitnet', 'deepseek')
   * @param {object} options - Loading options
   * @returns {object} Result with loaded variables and any errors
   */
  static loadNodeEnv(nodeName, options = {}) {
    const results = {
      loaded: false,
      variables: {},
      error: null,
      envPath: null,
      missing: []
    };

    // Determine env file path
    const envFileName = options.envFile || `.env.${nodeName.toLowerCase()}`;
    const searchPaths = [
      path.resolve(process.cwd(), envFileName),
      path.resolve(process.cwd(), '..', envFileName),
      path.resolve(__dirname, '..', '..', `n8n-nodes-${nodeName}`, envFileName)
    ];

    // Find the env file
    for (const envPath of searchPaths) {
      if (fs.existsSync(envPath)) {
        results.envPath = envPath;
        break;
      }
    }

    if (!results.envPath) {
      results.error = `Environment file not found. Searched: ${searchPaths.join(', ')}`;
      return results;
    }

    // Load the environment file
    const loadResult = dotenv.config({ path: results.envPath });
    
    if (loadResult.error) {
      results.error = loadResult.error.message;
      return results;
    }

    results.loaded = true;
    results.variables = loadResult.parsed || {};

    // Check for required variables if specified
    if (options.required && Array.isArray(options.required)) {
      options.required.forEach(varName => {
        if (!process.env[varName]) {
          results.missing.push(varName);
        }
      });

      if (results.missing.length > 0) {
        results.error = `Missing required environment variables: ${results.missing.join(', ')}`;
        results.loaded = false;
      }
    }

    return results;
  }

  /**
   * Validate environment variables against a schema
   * @param {object} schema - Variable schema with types and defaults
   * @returns {object} Validated and typed environment object
   */
  static validateEnv(schema) {
    const validated = {};
    const errors = [];

    Object.entries(schema).forEach(([key, config]) => {
      const value = process.env[key];

      if (!value && config.required) {
        errors.push(`Missing required variable: ${key}`);
        return;
      }

      if (!value && config.default !== undefined) {
        validated[key] = config.default;
        return;
      }

      if (!value) {
        return;
      }

      // Type conversion and validation
      try {
        switch (config.type) {
          case 'number':
            validated[key] = Number(value);
            if (isNaN(validated[key])) {
              throw new Error(`Invalid number: ${value}`);
            }
            break;
          
          case 'boolean':
            validated[key] = value.toLowerCase() === 'true' || value === '1';
            break;
          
          case 'array':
            validated[key] = value.split(config.delimiter || ',').map(v => v.trim());
            break;
          
          case 'json':
            validated[key] = JSON.parse(value);
            break;
          
          case 'url':
            // Basic URL validation
            try {
              new URL(value);
              validated[key] = value;
            } catch {
              throw new Error(`Invalid URL: ${value}`);
            }
            break;
          
          case 'path':
            validated[key] = path.resolve(value);
            if (config.mustExist && !fs.existsSync(validated[key])) {
              throw new Error(`Path does not exist: ${validated[key]}`);
            }
            break;
          
          default:
            validated[key] = value;
        }

        // Additional validations
        if (config.validate) {
          const validationResult = config.validate(validated[key]);
          if (validationResult !== true) {
            throw new Error(validationResult || 'Validation failed');
          }
        }

      } catch (error) {
        errors.push(`${key}: ${error.message}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      env: validated
    };
  }

  /**
   * Create an example env file from a schema
   * @param {object} schema - Variable schema
   * @param {string} outputPath - Where to write the example file
   */
  static createExampleEnv(schema, outputPath) {
    const lines = ['# Auto-generated environment file example'];
    lines.push(`# Generated at: ${new Date().toISOString()}\n`);

    Object.entries(schema).forEach(([key, config]) => {
      if (config.description) {
        lines.push(`# ${config.description}`);
      }
      
      const required = config.required ? ' (REQUIRED)' : ' (optional)';
      lines.push(`# Type: ${config.type}${required}`);
      
      if (config.example !== undefined) {
        lines.push(`${key}=${config.example}`);
      } else if (config.default !== undefined) {
        lines.push(`${key}=${config.default}`);
      } else {
        lines.push(`${key}=`);
      }
      
      lines.push('');
    });

    fs.writeFileSync(outputPath, lines.join('\n'));
    return outputPath;
  }

  /**
   * Print environment loading results
   */
  static printResults(results, options = {}) {
    console.log('\nEnvironment Loading Results:');
    console.log('----------------------------------------');
    
    if (results.loaded) {
      console.log('✅ Environment loaded successfully');
      if (results.envPath) {
        console.log(`📁 File: ${results.envPath}`);
      }
      
      if (options.showVariables !== false && Object.keys(results.variables).length > 0) {
        console.log('\nLoaded variables:');
        Object.entries(results.variables).forEach(([key, value]) => {
          // Mask sensitive values
          const displayValue = options.maskSensitive && 
            (key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET'))
            ? '***' 
            : value;
          console.log(`  ${key}: ${displayValue}`);
        });
      }
    } else {
      console.log('❌ Failed to load environment');
      if (results.error) {
        console.log(`Error: ${results.error}`);
      }
    }

    if (results.missing && results.missing.length > 0) {
      console.log('\n⚠️  Missing required variables:');
      results.missing.forEach(varName => console.log(`  - ${varName}`));
    }

    console.log('');
  }
}

module.exports = EnvLoader;