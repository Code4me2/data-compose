/**
 * Visualization type definitions for hierarchical data display
 */

import type { HierarchyDocument } from './api.types';

// D3.js hierarchy types
export interface TreeNode extends d3.HierarchyNode<HierarchyDocument> {
  x: number;
  y: number;
  level: number;
  expanded?: boolean;
}

export interface TreeLink extends d3.HierarchyLink<HierarchyDocument> {
  source: TreeNode;
  target: TreeNode;
}

// Visualization modes
export type VisualizationMode = 'panel' | 'tree';

// Navigation types
export interface NavigationState {
  currentLevel: number;
  currentNodeId: number | null;
  breadcrumbs: BreadcrumbItem[];
  activePath: number[];
}

export interface BreadcrumbItem {
  id: number;
  label: string;
  level: number;
}

// Panel view types
export interface PanelState {
  activePanel: number;
  panelPositions: number[];
  isTransitioning: boolean;
}

// Tree view configuration
export interface TreeViewConfig {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  animationDuration: number;
  maxZoom: number;
  minZoom: number;
}

// Search functionality
export interface SearchResult {
  nodeId: number;
  content: string;
  matchedText: string;
  level: number;
  path: number[];
}

// Animation state
export interface AnimationState {
  isAnimating: boolean;
  pendingTransitions: Set<string>;
}

// Minimap types
export interface MinimapConfig {
  width: number;
  height: number;
  nodeSize: number;
  visible: boolean;
}

// Export functionality
export interface ExportOptions {
  format: 'svg' | 'png' | 'json';
  includeStyles: boolean;
  scale: number;
}

// Theme configuration
export interface VisualizationTheme {
  levelColors: {
    [level: number]: {
      background: string;
      border: string;
      text: string;
    };
  };
  linkColor: string;
  highlightColor: string;
  font: {
    family: string;
    size: number;
    weight: number;
  };
}