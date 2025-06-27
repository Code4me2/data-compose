# Visualization Module Implementation Guide

## Overview
This guide details how to implement the full D3.js hierarchical visualization in TypeScript, building upon the stub module already created.

## Key Components to Implement

### 1. TreeView Class
The main D3.js visualization component:

```typescript
// TreeView.ts
import * as d3 from 'd3';
import type { HierarchyData, TreeNode, TreeLink } from '@types/visualization.types';

export class TreeView {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private tree: d3.TreeLayout<HierarchyDocument>;
  private root: TreeNode | null = null;
  
  constructor(
    private container: HTMLElement,
    private config: TreeViewConfig
  ) {
    this.initializeSvg();
    this.initializeZoom();
    this.initializeTree();
  }
  
  private initializeSvg(): void {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');
      
    this.g = this.svg.append('g');
  }
  
  private initializeZoom(): void {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([this.config.minZoom, this.config.maxZoom])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });
      
    this.svg.call(this.zoom);
  }
  
  render(data: HierarchyData): void {
    // Convert flat hierarchy to D3 hierarchy
    this.root = this.buildHierarchy(data);
    
    // Calculate layout
    this.tree(this.root);
    
    // Render links and nodes
    this.renderLinks();
    this.renderNodes();
    
    // Center view on root
    this.centerNode(this.root);
  }
}
```

### 2. PanelView Class
Alternative panel-based visualization:

```typescript
// PanelView.ts
export class PanelView {
  private currentLevel = 0;
  private panels: Map<number, HTMLElement> = new Map();
  
  constructor(
    private container: HTMLElement,
    private data: HierarchyData
  ) {
    this.initializePanels();
  }
  
  private initializePanels(): void {
    // Create panel container
    const panelContainer = document.createElement('div');
    panelContainer.className = 'panel-container';
    
    // Create panels for each level
    this.data.levels.forEach((level) => {
      const panel = this.createPanel(level);
      this.panels.set(level.level, panel);
      panelContainer.appendChild(panel);
    });
    
    this.container.appendChild(panelContainer);
  }
  
  navigateToLevel(level: number): void {
    // Animate panel transitions
    this.panels.forEach((panel, panelLevel) => {
      const offset = (panelLevel - level) * 100;
      panel.style.transform = `translateX(${offset}%)`;
    });
    
    this.currentLevel = level;
    this.updateBreadcrumbs();
  }
}
```

### 3. Visualization Service
Handle data fetching and processing:

```typescript
// VisualizationService.ts
export class VisualizationService {
  constructor(private webhookUrl: string) {}
  
  async startSummarization(directoryPath: string): Promise<SummarizationResponse> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'hierarchical-summarization',
        directoryPath: `/files/uploads/${directoryPath}`
      })
    });
    
    return response.json();
  }
  
  async pollWorkflowStatus(workflowId: string): Promise<HierarchyData | null> {
    // Poll for completion
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const response = await this.checkStatus(workflowId);
      
      if (response.status === 'completed') {
        return response.data;
      } else if (response.status === 'failed') {
        throw new Error(response.error || 'Workflow failed');
      }
      
      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Workflow timeout');
  }
}
```

### 4. Enhanced Module with Alpine.js
Complete the VisualizationModule with all features:

```typescript
// VisualizationModule.ts (enhanced)
export class VisualizationModule implements AppModule {
  private visualizationService: VisualizationService;
  private treeView: TreeView | null = null;
  private panelView: PanelView | null = null;
  
  public async init(): Promise<void> {
    this.visualizationService = new VisualizationService(
      configService.getWebhookUrl()
    );
    
    // Register Alpine component with full functionality
    Alpine.data('visualizationState', () => ({
      // ... existing state ...
      
      async startSummarization() {
        if (!this.directoryName.trim()) return;
        
        this.isProcessing = true;
        this.statusMessage = 'Starting workflow...';
        
        try {
          // Start the workflow
          const response = await visualizationService.startSummarization(
            this.directoryName
          );
          
          // Poll for results
          const hierarchyData = await visualizationService.pollWorkflowStatus(
            response.workflowId
          );
          
          // Display results
          this.currentHierarchy = hierarchyData;
          this.mode = 'visualization';
          
          // Save to history
          this.saveToHistory(hierarchyData);
          
          // Render visualization
          nextTick(() => {
            renderVisualization(hierarchyData);
          });
          
        } catch (error) {
          this.statusMessage = `Error: ${error.message}`;
        } finally {
          this.isProcessing = false;
        }
      },
      
      switchVisualizationMode(mode: 'tree' | 'panel') {
        this.visualizationMode = mode;
        nextTick(() => {
          renderVisualization(this.currentHierarchy);
        });
      }
    }));
  }
  
  private renderVisualization(data: HierarchyData): void {
    const container = document.getElementById('tree-canvas');
    if (!container) return;
    
    // Clear existing visualization
    container.innerHTML = '';
    
    // Render based on mode
    const mode = Alpine.store('visualizationMode') || 'tree';
    
    if (mode === 'tree') {
      this.treeView = new TreeView(container, configService.get('visualization').treeView);
      this.treeView.render(data);
    } else {
      this.panelView = new PanelView(container, data);
    }
  }
}
```

## Implementation Steps

### Step 1: Install D3.js Types
```bash
npm install --save-dev @types/d3
```

### Step 2: Create Utility Functions
Create helper functions for data transformation:

```typescript
// src/modules/visualization/utils.ts
export function buildHierarchyFromFlat(data: HierarchyData): d3.HierarchyNode<HierarchyDocument> {
  // Convert flat structure to D3 hierarchy
  const nodeMap = new Map<number, any>();
  
  // First pass: create all nodes
  Object.values(data.documents).flat().forEach(doc => {
    nodeMap.set(doc.id, {
      ...doc,
      children: []
    });
  });
  
  // Second pass: build relationships
  Object.values(data.documents).flat().forEach(doc => {
    if (doc.child_ids) {
      const node = nodeMap.get(doc.id);
      doc.child_ids.forEach(childId => {
        const child = nodeMap.get(childId);
        if (child) {
          node.children.push(child);
        }
      });
    }
  });
  
  // Find root (final summary)
  const finalLevel = Math.max(...data.levels.map(l => l.level));
  const root = Object.values(data.documents[finalLevel])[0];
  
  return d3.hierarchy(nodeMap.get(root.id));
}
```

### Step 3: Add CSS for Visualization
Create visualization-specific styles:

```css
/* src/modules/visualization/visualization.css */
.tree-node {
  cursor: pointer;
  transition: all 0.3s ease;
}

.tree-node:hover {
  filter: brightness(1.1);
}

.tree-link {
  fill: none;
  stroke: #999;
  stroke-width: 2px;
}

.panel-container {
  display: flex;
  overflow: hidden;
  height: 100%;
}

.hierarchy-panel {
  min-width: 100%;
  transition: transform 0.5s ease;
  padding: 20px;
}
```

### Step 4: Add Keyboard Navigation
Implement keyboard controls:

```typescript
// KeyboardNavigation.ts
export class KeyboardNavigation {
  constructor(
    private treeView: TreeView,
    private getCurrentNode: () => TreeNode | null,
    private setCurrentNode: (node: TreeNode) => void
  ) {
    this.bindKeyboardEvents();
  }
  
  private bindKeyboardEvents(): void {
    document.addEventListener('keydown', (e) => {
      const current = this.getCurrentNode();
      if (!current) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          this.navigateToParent(current);
          break;
        case 'ArrowRight':
          this.navigateToChild(current);
          break;
        case 'ArrowUp':
          this.navigateToPreviousSibling(current);
          break;
        case 'ArrowDown':
          this.navigateToNextSibling(current);
          break;
      }
    });
  }
}
```

## Testing the Implementation

### 1. Create Mock Data Generator
```typescript
// src/modules/visualization/mockData.ts
export function generateMockHierarchy(): HierarchyData {
  return {
    batchId: 'mock-' + Date.now(),
    levels: [
      { level: 0, count: 8, label: 'Source Documents' },
      { level: 1, count: 4, label: 'Initial Summaries' },
      { level: 2, count: 2, label: 'Intermediate Summaries' },
      { level: 3, count: 1, label: 'Final Summary' }
    ],
    documents: {
      // ... generate mock documents
    }
  };
}
```

### 2. Test Without n8n
Add a development mode that uses mock data:

```typescript
if (configService.get('features').enableMockData) {
  this.currentHierarchy = generateMockHierarchy();
  this.mode = 'visualization';
}
```

## Performance Considerations

1. **Lazy Loading**: Only load D3.js when visualization is accessed
2. **Virtual Scrolling**: For large hierarchies, implement viewport culling
3. **Debounced Rendering**: Prevent excessive re-renders during zoom/pan
4. **Progressive Loading**: Load hierarchy levels on demand

## Next Steps

1. Implement the TreeView class with basic rendering
2. Add interaction handlers (click, hover, zoom)
3. Implement the panel view as an alternative
4. Add search and filter functionality
5. Implement export features (SVG, PNG, JSON)
6. Add animation transitions
7. Create comprehensive tests

This implementation guide provides a clear path to building the full visualization module while maintaining the TypeScript architecture.