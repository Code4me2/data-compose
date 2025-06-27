/**
 * Main entry point for Data Compose application
 */

import Alpine from 'alpinejs';
import { createApp } from '@core/App';
import { configService } from '@services/config.service';

// Import modules
import { HomeModule } from '@modules/home/HomeModule';
import { ChatModule } from '@modules/chat/ChatModule';
import { WorkflowsModule } from '@modules/workflows/WorkflowsModule';
import { VisualizationModule } from '@modules/visualization/VisualizationModule';

// Import styles
import './styles/main.css';

// Import global functions for backward compatibility
import './utils/global-functions';

// Initialize Alpine.js before DOM is ready
window.Alpine = Alpine;

// Main application initialization
async function initializeApp(): Promise<void> {
  try {
    // Create app instance
    const app = createApp();
    
    // Make app globally available (for backward compatibility)
    window.app = app;
    
    // Enable debug mode if configured
    window.DEBUG = configService.isDebugMode();
    
    // Register modules
    await app.registerModule({ module: HomeModule });
    await app.registerModule({ module: ChatModule });
    await app.registerModule({ module: WorkflowsModule });
    await app.registerModule({ module: VisualizationModule });
    
    // Initialize the application
    await app.init();
    
    // Start Alpine.js
    Alpine.start();
    
    console.log('Data Compose initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Data Compose:', error);
    
    // Show error to user
    const container = document.querySelector('.app-container');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h2>Application Error</h2>
          <p>Failed to initialize the application. Please refresh the page or contact support.</p>
          <details>
            <summary>Error Details</summary>
            <pre>${error instanceof Error ? error.stack : String(error)}</pre>
          </details>
        </div>
      `;
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}

// Export types for global access
export type { DataComposeApp } from '@core/App';