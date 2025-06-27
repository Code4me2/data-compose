# TypeScript Migration Guide

## Overview

The Data Compose website has been migrated from vanilla JavaScript to TypeScript with a modular architecture. This guide provides instructions for development, building, and extending the application.

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Installation
```bash
cd website
npm install
```

### Development
```bash
# Make sure Docker services are running first:
cd .. && docker-compose up -d

# Then start the development server:
cd website && npm run dev
# Opens http://localhost:3000 with hot module replacement
# Proxies API calls to http://localhost:8080
```

### Building for Production
```bash
npm run build
# Creates optimized production build in dist/

# The built files are served by NGINX in the Docker container
# Access production build at http://localhost:8080
```

### Important: Development vs Production

- **Development**: Vite dev server runs on port 3000, proxies to Docker services on 8080
- **Production**: NGINX serves built files on port 8080 directly from Docker
- **No conflict**: Development and production use different ports

### Type Checking
```bash
npm run type-check
# Check TypeScript types without building
```

### Linting & Formatting
```bash
npm run lint       # Check for linting errors
npm run lint:fix   # Fix linting errors
npm run format     # Format code with Prettier
```

## Architecture Overview

### Directory Structure
```
website/
├── src/
│   ├── core/              # Core framework classes
│   │   ├── App.ts         # Main application class
│   │   ├── Router.ts      # Navigation management
│   │   ├── EventBus.ts    # Event system
│   │   └── ServiceRegistry.ts # Dependency injection
│   ├── modules/           # Feature modules
│   │   ├── chat/          # AI chat functionality
│   │   ├── workflows/     # n8n workflow management
│   │   └── visualization/ # Hierarchical visualization
│   ├── services/          # Shared services
│   │   ├── api/           # API clients
│   │   ├── storage/       # Storage adapters
│   │   └── config.service.ts # Configuration
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── styles/            # CSS files
│   └── main.ts            # Application entry point
├── public/                # Static assets
├── dist/                  # Build output
└── tests/                 # Test files
```

### Key Design Patterns

1. **Module System**: Each feature is a self-contained module implementing the `AppModule` interface
2. **Dependency Injection**: Services are registered and injected via `ServiceRegistry`
3. **Event-Driven**: Modules communicate via the `EventBus`
4. **Type Safety**: Strict TypeScript configuration ensures type safety throughout

## Creating a New Module

### 1. Create Module Class
```typescript
// src/modules/myfeature/MyFeatureModule.ts
import type { AppModule } from '@types/module.types';

export class MyFeatureModule implements AppModule {
  public readonly id = 'myfeature';
  public readonly name = 'My Feature';
  public readonly icon = 'fas fa-star';
  public readonly version = '1.0.0';

  public async init(): Promise<void> {
    // Initialize module
  }

  public mount(container: HTMLElement): void {
    // Mount UI to container
  }

  public unmount(): void {
    // Cleanup
  }
}
```

### 2. Register Module
```typescript
// src/main.ts
import { MyFeatureModule } from '@modules/myfeature/MyFeatureModule';

await app.registerModule({ module: MyFeatureModule });
```

### 3. Add Navigation Tab
The module will automatically appear in navigation with the specified name and icon.

## Working with Alpine.js

The application uses Alpine.js for reactive UI components. Here's how to create reactive components:

```typescript
// In your module
Alpine.data('myComponent', () => ({
  // Reactive state
  count: 0,
  message: '',
  
  // Methods
  increment() {
    this.count++;
  },
  
  async fetchData() {
    const response = await fetch('/api/data');
    this.message = await response.text();
  }
}));
```

```html
<!-- In your template -->
<div x-data="myComponent()">
  <p>Count: <span x-text="count"></span></p>
  <button @click="increment">Increment</button>
</div>
```

## Service Development

### Creating a Service
```typescript
// src/services/myservice/MyService.ts
export class MyService {
  async getData(): Promise<string> {
    return 'data';
  }
}

// Register in module
const myService = new MyService();
app.getService<ServiceRegistry>('serviceRegistry')
  .register('myService', myService);
```

### Using a Service
```typescript
const myService = app.getService<MyService>('myService');
const data = await myService.getData();
```

## Configuration

### Environment Variables
Create `.env` file in website directory:
```env
VITE_WEBHOOK_ID=your-webhook-id
VITE_API_BASE_URL=http://localhost:8080
```

### Runtime Configuration
```typescript
import { configService } from '@services/config.service';

// Get configuration
const webhookUrl = configService.getWebhookUrl();
const isDebug = configService.isDebugMode();

// Update configuration
configService.updateConfig({
  features: {
    enableDebugMode: true
  }
});
```

## Testing

### Unit Tests
```bash
npm run test          # Run tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Writing Tests
```typescript
// tests/unit/MyService.test.ts
import { describe, it, expect } from 'vitest';
import { MyService } from '@services/myservice/MyService';

describe('MyService', () => {
  it('should return data', async () => {
    const service = new MyService();
    const data = await service.getData();
    expect(data).toBe('data');
  });
});
```

## Build Optimization

The Vite build configuration includes:
- Code splitting for optimal loading
- Tree shaking to remove unused code
- Minification with Terser
- Source maps for debugging
- Separate chunks for vendor libraries

## Migration Notes

### Breaking Changes
1. **Global Functions**: All global functions are now encapsulated in modules
2. **Event Handlers**: Inline `onclick` handlers replaced with Alpine.js `@click`
3. **Configuration**: `CONFIG` global replaced with `configService`

### Backward Compatibility
- The `window.app` global is maintained for backward compatibility
- HTML structure remains unchanged
- CSS classes and IDs are preserved
- All webhook endpoints remain the same

### Gradual Migration Path
1. Existing functionality works without changes
2. New features should be added as TypeScript modules
3. Legacy code can be gradually refactored
4. Types can be added incrementally

## Troubleshooting

### Common Issues

1. **Module not loading**
   - Ensure module is registered in `main.ts`
   - Check browser console for errors
   - Verify module implements all required methods

2. **TypeScript errors**
   - Run `npm run type-check` to see all errors
   - Check that all imports use correct paths
   - Ensure types are properly exported/imported

3. **Build failures**
   - Clear `node_modules` and reinstall
   - Delete `dist` folder and rebuild
   - Check for circular dependencies

## Best Practices

1. **Type Everything**: Avoid `any` types
2. **Small Modules**: Keep modules focused on single responsibility
3. **Use Services**: Share logic via services, not global variables
4. **Event Communication**: Use EventBus for cross-module communication
5. **Error Handling**: Always handle errors gracefully
6. **Documentation**: Document public APIs with JSDoc

## Future Enhancements

The TypeScript migration sets the foundation for:
- Component library with Storybook
- Automated testing with Playwright
- CI/CD pipeline
- Progressive Web App features
- WebSocket real-time updates
- Advanced state management

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Alpine.js Documentation](https://alpinejs.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)