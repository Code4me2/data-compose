# Data Compose Website

## Overview

The Data Compose website is a modern Single Page Application (SPA) that provides a web interface for interacting with n8n workflows and AI-powered document processing. Built with vanilla JavaScript for simplicity and performance, it features a modular architecture that's easy to extend and maintain.

## Architecture

### Technology Stack
- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with custom properties (CSS variables)
- **Visualization**: D3.js for hierarchical tree rendering
- **Icons**: Font Awesome 5
- **Build Tools**: None required - runs directly in browser

### Design Principles
1. **Simplicity First**: No build tools or compilation required
2. **Extensibility**: Easy to add new sections and features
3. **Performance**: Minimal dependencies, fast load times
4. **Maintainability**: Clear separation of concerns, well-documented code

### File Structure
```
website/
├── README.md              # This file
├── index.html             # Single HTML entry point
├── css/
│   ├── app.css           # Main stylesheet with design system
│   └── styles.css        # Legacy styles (preserved, unused)
├── js/
│   ├── app.js            # Main application logic
│   └── config.js         # Configuration (webhook URLs)
└── favicon.ico           # Site favicon
```

## Features

### 1. AI Chat Interface
- Real-time chat with DeepSeek R1 AI model
- Webhook-based communication with n8n
- Message history and status indicators
- Keyboard shortcuts (Enter to send)

### 2. Hierarchical Document Visualization
- **Panel View**: Sliding panels showing document hierarchy levels
- **Tree View**: D3.js-powered interactive tree visualization
- Dual visualization modes with smooth transitions
- Support for multi-level document hierarchies

### 3. Workflow Management
- Integration with n8n workflow engine
- Real-time workflow status monitoring
- Direct links to n8n interface

### 4. System Testing
- Built-in connection testing
- Health check endpoints
- Debug information display

## Hierarchical Visualization

### Data Structure
The visualization expects hierarchical data in this format:
```javascript
{
  batchId: "unique-batch-id",
  levels: [
    { level: 0, count: 4, label: "Source Documents" },
    { level: 1, count: 2, label: "Intermediate Summaries" },
    { level: 2, count: 1, label: "Final Summary" }
  ],
  documents: {
    0: [{ id: 1, content: "...", child_ids: [5] }],
    1: [{ id: 5, summary: "...", parent_id: 1, child_ids: [7] }],
    2: [{ id: 7, summary: "...", parent_id: 5 }]
  }
}
```

### Visualization Modes

#### Panel View (Default)
- Horizontal sliding panels for each hierarchy level
- Smooth transitions between levels
- Breadcrumb navigation
- Card-based document display

#### Tree View (D3.js)
- Interactive node-link diagram
- Horizontal tree layout (left-to-right)
- Zoom and pan capabilities
- Custom node rendering with text bubbles
- Collapsible nodes for large hierarchies

### Switching Between Views
Users can toggle between Panel and Tree views using the view mode selector in the UI. The application maintains state between switches.

## Configuration

### Webhook Configuration
Edit `js/config.js` to set your webhook endpoints:
```javascript
const CONFIG = {
  WEBHOOK_ID: "your-webhook-id",
  WEBHOOK_URL: `${window.location.protocol}//${window.location.host}/webhook/your-webhook-id`
};
```

### Styling Customization
The design system uses CSS custom properties for easy theming:
```css
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --success-color: #27ae60;
  /* ... more variables in app.css */
}
```

## Usage

### Adding New Sections
The application framework makes it easy to add new sections:

```javascript
window.app.addSection('sectionId', 'Section Title', 'fas fa-icon', 
  '<h2>Section Content</h2><p>Your HTML here</p>',
  {
    onShow: () => {
      // Called when section is shown
      console.log('Section activated');
    },
    onHide: () => {
      // Called when section is hidden
      console.log('Section deactivated');
    }
  }
);
```

### Programmatic Navigation
```javascript
// Navigate to a specific section
window.app.showSection('chat');

// Get current section
const current = window.app.currentSection;
```

### Visualization API

#### Show Hierarchy Visualization
```javascript
// Display hierarchy for a specific batch
showHierarchyVisualization('batch-123');

// Switch visualization modes
setVisualizationMode('tree'); // or 'panel'

// Navigate to specific level (panel view)
navigateToLevel(2);

// Expand/collapse nodes (tree view)
toggleNode(nodeId);
```

## Development

### Local Development
1. No build process required
2. Open `index.html` in a browser
3. For webhook testing, serve via a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

### Best Practices
1. **Modularity**: Keep functions focused and single-purpose
2. **Documentation**: Comment complex logic and data structures
3. **Error Handling**: Graceful degradation for missing data
4. **Accessibility**: ARIA labels and keyboard navigation
5. **Performance**: Lazy loading for visualization data

### Testing
- Use browser DevTools for debugging
- Test with mock data using `createMockHierarchy()`
- Verify webhook endpoints with network inspector
- Test responsive design at various screen sizes

## Browser Compatibility
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Performance Considerations
- D3.js is loaded only when tree view is activated
- Mock data for development/testing
- Efficient DOM updates using requestAnimationFrame
- CSS transitions for smooth animations

## Future Enhancements
- [ ] Export visualization as SVG/PNG
- [ ] Search within document hierarchy
- [ ] Collaborative annotations
- [ ] Real-time updates via WebSocket
- [ ] Dark mode theme
- [ ] Keyboard shortcuts for navigation

## Troubleshooting

### Common Issues
1. **Webhook connection fails**: Check CORS settings and webhook URL
2. **Visualization not loading**: Verify data format matches expected structure
3. **Performance issues**: Limit tree depth or implement virtual scrolling
4. **Style conflicts**: Check for CSS specificity issues

### Debug Mode
Enable debug logging in console:
```javascript
window.DEBUG = true;
```

## Contributing
1. Follow existing code style
2. Document new features in this README
3. Test across browsers before submitting
4. Keep dependencies minimal

## License
Part of the Data Compose project. See main project LICENSE file.