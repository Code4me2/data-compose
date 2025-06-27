/**
 * Global functions for backward compatibility
 * These are temporarily exposed to window to support existing HTML onclick handlers
 * Will be removed once all inline handlers are migrated to Alpine.js
 */

import { getApp } from '@core/App';

// Test connection function
window.testConnection = async function(): Promise<void> {
  const app = getApp();
  const module = app.getModules().get('home');
  if (module && 'testConnection' in module) {
    await (module as any).testConnection();
  }
};

// Send message function for chat
window.sendMessage = async function(): Promise<void> {
  const app = getApp();
  const module = app.getModules().get('chat');
  if (module && 'sendMessage' in module) {
    await (module as any).sendMessage();
  }
};

// Hierarchical summarization functions
window.startHierarchicalSummarization = async function(): Promise<void> {
  console.log('startHierarchicalSummarization called - should be handled by Alpine component');
};

window.toggleHistoryDrawer = function(): void {
  const drawer = document.getElementById('history-drawer');
  if (drawer) {
    drawer.classList.toggle('open');
  }
};

window.selectHistoryItem = function(batchId: string): void {
  console.log('selectHistoryItem called with:', batchId);
};

window.toggleQuickJump = function(): void {
  console.log('toggleQuickJump called - to be implemented');
};

window.quickJumpToNode = function(nodeId: string): void {
  console.log('quickJumpToNode called with:', nodeId);
};

window.toggleLineStyle = function(): void {
  console.log('toggleLineStyle called - to be implemented');
};

window.toggleKeyboardHelp = function(): void {
  const helpContent = document.querySelector('.help-content');
  if (helpContent) {
    helpContent.classList.toggle('hidden');
  }
};

// Declare global functions on Window interface
declare global {
  interface Window {
    testConnection: () => Promise<void>;
    sendMessage: () => Promise<void>;
    startHierarchicalSummarization: () => Promise<void>;
    toggleHistoryDrawer: () => void;
    selectHistoryItem: (batchId: string) => void;
    toggleQuickJump: () => void;
    quickJumpToNode: (nodeId: string) => void;
    toggleLineStyle: () => void;
    toggleKeyboardHelp: () => void;
  }
}