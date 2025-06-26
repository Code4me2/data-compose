/**
 * Global type definitions for Data Compose application
 */

// Extend Window interface for global app instance
declare global {
  interface Window {
    app: import('@core/App').DataComposeApp;
    DEBUG: boolean;
    d3?: typeof import('d3');
    loadD3: () => Promise<void>;
    Alpine: typeof import('alpinejs').default;
  }
}

// Module declarations for non-TypeScript assets
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Ensure this file is treated as a module
export {};