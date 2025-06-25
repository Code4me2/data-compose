# TypeScript Build & Visualization Implementation Plan

## 🎯 Goal
Get the TypeScript version fully functional with automated builds and complete visualization implementation.

## 📋 Phase 1: TypeScript Build Process

### Option A: Multi-Stage Docker Build (Recommended)
Create a Dockerfile that builds TypeScript during container creation:

```dockerfile
# website/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### Option B: Build Script in Docker Compose
Modify docker-compose.yml to build before serving:

```yaml
web:
  build: ./website
  ports:
    - "8080:80"
  # ... rest of config
```

### Option C: Pre-build Hook
Add a build step to package.json:

```json
"scripts": {
  "prebuild": "rm -rf dist",
  "build": "tsc && vite build",
  "postbuild": "cp -r public/* dist/",
  "serve:build": "npm run build && npx serve dist -p 8080"
}
```

## 📊 Phase 2: Visualization Module Implementation

### 1. Create Full D3.js Tree Visualization
```typescript
// src/modules/visualization/TreeView.ts
import * as d3 from 'd3';
import type { HierarchyData, TreeNode } from '@types/visualization.types';

export class TreeView {
  private svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<Element, unknown>;
  
  constructor(container: HTMLElement) {
    // Initialize D3.js tree visualization
  }
  
  render(data: HierarchyData): void {
    // Create hierarchical layout
    // Render nodes and links
    // Add interactions
  }
}
```

### 2. Create Panel View Component
```typescript
// src/modules/visualization/PanelView.ts
export class PanelView {
  constructor(container: HTMLElement) {
    // Initialize panel-based view
  }
  
  render(data: HierarchyData): void {
    // Create sliding panels
    // Add breadcrumb navigation
    // Handle transitions
  }
}
```

### 3. Create Visualization Service
```typescript
// src/modules/visualization/VisualizationService.ts
export class VisualizationService {
  async fetchHierarchy(batchId: string): Promise<HierarchyData> {
    // Fetch from API
  }
  
  async startSummarization(directory: string): Promise<string> {
    // Call webhook to start process
  }
  
  async pollStatus(workflowId: string): Promise<SummarizationStatus> {
    // Poll for completion
  }
}
```

## 🔧 Phase 3: Integration Steps

### 1. Fix Import Issues
The current modules need proper imports:
- Import Alpine.js types correctly
- Ensure all services are properly registered
- Fix any circular dependencies

### 2. Create Development Workflow
```bash
# 1. Install dependencies (if not already done)
cd website
npm install

# 2. Run type checking
npm run type-check

# 3. Fix any type errors
# 4. Run development server
npm run dev

# 5. Test all features
```

### 3. Create Hybrid Serving Strategy
For gradual migration:
```javascript
// src/modules/visualization/VisualizationModule.ts
export class VisualizationModule implements AppModule {
  async mount(container: HTMLElement): void {
    // Check if D3 should be loaded
    if (this.shouldLoadD3()) {
      await this.loadD3Library();
    }
    
    // Mount appropriate view
    if (this.useTreeView) {
      this.treeView = new TreeView(container);
    } else {
      this.panelView = new PanelView(container);
    }
  }
  
  private async loadD3Library(): Promise<void> {
    if (!window.d3) {
      await import('d3');
    }
  }
}
```

## 🚀 Phase 4: Deployment Strategy

### Step 1: Development Testing
```bash
# Run TypeScript dev server
npm run dev

# Test each module:
# - Home page loads
# - Chat functionality works
# - Workflows display
# - Visualization initializes
```

### Step 2: Build Verification
```bash
# Build the application
npm run build

# Serve the built files locally
npx serve dist -p 8080

# Verify all features work
```

### Step 3: Docker Integration
Create a seamless Docker workflow:

```yaml
# docker-compose.override.yml
services:
  web:
    volumes:
      - ./website/dist:/usr/share/nginx/html:ro
    command: >
      sh -c "cd /app && npm run build && nginx -g 'daemon off;'"
```

## 📝 Phase 5: Migration Checklist

### Pre-Migration
- [ ] All TypeScript compiles without errors
- [ ] All tests pass
- [ ] Development server runs all features
- [ ] Build process completes successfully

### During Migration
- [ ] Keep index.production.html as fallback
- [ ] Test each feature in TypeScript version
- [ ] Verify API endpoints work correctly
- [ ] Check browser console for errors

### Post-Migration
- [ ] Update Docker configuration
- [ ] Update deployment documentation
- [ ] Remove legacy JavaScript files
- [ ] Update CI/CD pipelines

## 🎨 Visualization Implementation Priority

1. **Basic Hierarchy Display** (Week 1)
   - Static tree structure
   - Node click navigation
   - Basic styling

2. **Interactive Features** (Week 2)
   - Zoom and pan
   - Collapsible nodes
   - Search functionality
   - Keyboard navigation

3. **Advanced Features** (Week 3)
   - Animation transitions
   - Minimap
   - Export functionality
   - Real-time updates

## 🔑 Key Decisions Needed

1. **Build Process**: Which option (A, B, or C) for TypeScript compilation?
2. **Visualization Library**: Stick with D3.js or consider alternatives?
3. **State Management**: Use Alpine stores or service-based state?
4. **API Integration**: Mock data first or real API from start?
5. **Testing Strategy**: Unit tests, E2E tests, or both?

## 📊 Success Metrics

- TypeScript build completes in < 30 seconds
- No runtime errors in production build
- All existing features work identically
- Visualization loads hierarchies < 2 seconds
- Development experience improved with HMR

## 🚦 Next Immediate Steps

1. **Fix TypeScript Compilation**
   ```bash
   cd website
   npm install
   npm run type-check
   # Fix any errors shown
   ```

2. **Test Basic Build**
   ```bash
   npm run build
   # Check dist/ folder contents
   ```

3. **Implement Missing Imports**
   - Add proper Alpine.js initialization
   - Fix module imports
   - Resolve type errors

4. **Create Minimal Visualization**
   - Start with static tree
   - Add basic interactions
   - Incrementally add features

This plan provides a clear path forward without modifying existing files, allowing for gradual migration and testing.