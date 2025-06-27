/**
 * Common Node Validation Utilities
 * Shared across all n8n custom node tests
 */

const fs = require('fs');
const path = require('path');

class NodeValidator {
  /**
   * Validate that a node class has the required n8n structure
   */
  static validateNodeStructure(NodeClass, options = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      const node = new NodeClass();
      const description = node.description;

      // Required properties
      if (!description) {
        results.errors.push('Node must have a description property');
        results.valid = false;
        return results;
      }

      // Check required description fields
      const requiredFields = ['displayName', 'name', 'version', 'properties'];
      requiredFields.forEach(field => {
        if (!description[field]) {
          results.errors.push(`Missing required field: description.${field}`);
          results.valid = false;
        }
      });

      // Validate version format
      if (description.version && typeof description.version !== 'number') {
        results.errors.push('Version must be a number');
        results.valid = false;
      }

      // Check properties array
      if (description.properties && !Array.isArray(description.properties)) {
        results.errors.push('Properties must be an array');
        results.valid = false;
      }

      // Validate operations if present
      if (description.properties && description.properties.length > 0) {
        const operationProp = description.properties.find(p => p.name === 'operation');
        if (operationProp && operationProp.options) {
          if (!Array.isArray(operationProp.options)) {
            results.errors.push('Operation options must be an array');
            results.valid = false;
          } else if (operationProp.options.length === 0) {
            results.warnings.push('No operations defined');
          }
        }
      }

      // Check for execute method
      if (typeof node.execute !== 'function') {
        results.errors.push('Node must have an execute method');
        results.valid = false;
      }

      // Optional checks
      if (options.checkIcon && description.icon) {
        if (!description.icon.startsWith('file:') && !description.icon.startsWith('fa:')) {
          results.warnings.push('Icon should start with "file:" or "fa:"');
        }
      }

    } catch (error) {
      results.errors.push(`Failed to instantiate node: ${error.message}`);
      results.valid = false;
    }

    return results;
  }

  /**
   * Validate that a node can be loaded from a file path
   */
  static validateNodeLoading(nodePath) {
    const results = {
      loaded: false,
      module: null,
      error: null,
      nodeClass: null
    };

    try {
      // Check if file exists
      if (!fs.existsSync(nodePath)) {
        results.error = `File not found: ${nodePath}`;
        return results;
      }

      // Try to load the module
      const nodeModule = require(nodePath);
      results.module = nodeModule;
      results.loaded = true;

      // Find the node class (usually exported as the main class name)
      const nodeClasses = Object.keys(nodeModule).filter(key => {
        return typeof nodeModule[key] === 'function' && 
               nodeModule[key].prototype && 
               nodeModule[key].prototype.execute;
      });

      if (nodeClasses.length === 0) {
        results.error = 'No valid node class found in module';
        results.loaded = false;
      } else {
        results.nodeClass = nodeModule[nodeClasses[0]];
      }

    } catch (error) {
      results.error = error.message;
      results.loaded = false;
    }

    return results;
  }

  /**
   * Validate node's package.json configuration
   */
  static validatePackageJson(packagePath) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      config: null
    };

    try {
      if (!fs.existsSync(packagePath)) {
        results.errors.push('package.json not found');
        results.valid = false;
        return results;
      }

      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      results.config = packageJson;

      // Check n8n configuration
      if (!packageJson.n8n) {
        results.errors.push('Missing n8n configuration in package.json');
        results.valid = false;
      } else {
        if (!packageJson.n8n.nodes) {
          results.errors.push('Missing n8n.nodes array in package.json');
          results.valid = false;
        } else if (!Array.isArray(packageJson.n8n.nodes)) {
          results.errors.push('n8n.nodes must be an array');
          results.valid = false;
        } else if (packageJson.n8n.nodes.length === 0) {
          results.warnings.push('No nodes defined in n8n.nodes array');
        }
      }

      // Check main field
      if (!packageJson.main) {
        results.warnings.push('Missing main field in package.json');
      }

      // Check scripts
      if (!packageJson.scripts) {
        results.warnings.push('No scripts defined in package.json');
      } else {
        if (!packageJson.scripts.build) {
          results.warnings.push('No build script defined');
        }
        if (!packageJson.scripts.dev) {
          results.warnings.push('No dev script defined');
        }
      }

    } catch (error) {
      results.errors.push(`Failed to parse package.json: ${error.message}`);
      results.valid = false;
    }

    return results;
  }

  /**
   * Validate that required files exist in the node directory
   */
  static validateNodeFiles(nodeDir) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      files: {}
    };

    // Required files
    const requiredFiles = [
      'package.json',
      'tsconfig.json'
    ];

    // Optional but recommended files
    const recommendedFiles = [
      'README.md',
      'gulpfile.js',
      '.gitignore'
    ];

    // Check required files
    requiredFiles.forEach(file => {
      const filePath = path.join(nodeDir, file);
      results.files[file] = fs.existsSync(filePath);
      if (!results.files[file]) {
        results.errors.push(`Missing required file: ${file}`);
        results.valid = false;
      }
    });

    // Check recommended files
    recommendedFiles.forEach(file => {
      const filePath = path.join(nodeDir, file);
      results.files[file] = fs.existsSync(filePath);
      if (!results.files[file]) {
        results.warnings.push(`Missing recommended file: ${file}`);
      }
    });

    // Check for dist directory
    const distPath = path.join(nodeDir, 'dist');
    results.files['dist'] = fs.existsSync(distPath);
    if (!results.files['dist']) {
      results.warnings.push('No dist directory found - node may not be built');
    }

    // Check for node source files
    const nodesPath = path.join(nodeDir, 'nodes');
    results.files['nodes'] = fs.existsSync(nodesPath);
    if (!results.files['nodes']) {
      results.errors.push('No nodes directory found');
      results.valid = false;
    }

    return results;
  }

  /**
   * Print validation results in a formatted way
   */
  static printResults(results, title = 'Validation Results') {
    console.log(`\n${title}:`);
    console.log('----------------------------------------');
    
    if (results.valid === false) {
      console.log('Status: ❌ INVALID');
    } else if (results.warnings && results.warnings.length > 0) {
      console.log('Status: ⚠️  VALID WITH WARNINGS');
    } else {
      console.log('Status: ✅ VALID');
    }

    if (results.errors && results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    if (results.warnings && results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }

    if (results.files) {
      console.log('\nFile Check:');
      Object.entries(results.files).forEach(([file, exists]) => {
        console.log(`  ${exists ? '✓' : '✗'} ${file}`);
      });
    }

    console.log('');
  }
}

module.exports = NodeValidator;