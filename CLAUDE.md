# Data Compose Project

## Project Overview

Data Compose is a web application that integrates with n8n (a workflow automation tool) to process and transform data. The application consists of a web frontend that communicates with n8n via webhooks, along with a PostgreSQL database for data storage.

## Architecture

The project is structured as a Docker-based application with three main services:

1. **NGINX Web Server**: Serves the web frontend and proxies requests to the n8n service
2. **n8n Workflow Engine**: Handles automation workflows and webhook processing
3. **PostgreSQL Database**: Stores data for n8n and application state

## Directory Structure

```
data_compose/
├── CLAUDE.md                  # Project documentation
├── README.md                  # Public-facing documentation
├── docker-compose.yml         # Main Docker configuration
├── docker-compose.swarm.yml   # Docker Swarm configuration (for scaling)
├── .env                       # Environment variables (gitignored)
├── .env.example               # Template for environment configuration
├── nginx/
│   └── conf.d/                # NGINX configuration
│       └── default.conf       # Unified NGINX config
├── website/                   # Frontend web assets (Single Page Application)
│   ├── css/
│   │   ├── app.css           # Unified CSS framework with design system
│   │   └── styles.css        # Legacy CSS (preserved but unused)
│   ├── js/                   # JavaScript modules
│   │   ├── app.js            # Extensible application framework
│   │   └── config.js         # Frontend configuration (webhook URLs)
│   ├── favicon.ico           # Website favicon
│   └── index.html            # Single entry point with all functionality
├── workflow_json/             # n8n workflow exports
│   └── web_UI_basic          # Basic web UI workflow
└── n8n/                      # n8n configuration and extensions
    ├── custom-nodes/         # Custom nodes for n8n
    │   ├── n8n-nodes-deepseek/  # DeepSeek AI integration node
    │   │   ├── dist/            # Compiled TypeScript output
    │   │   ├── nodes/           # TypeScript source files
    │   │   │   └── Dsr1/        # DeepSeek R1 node
    │   │   │       └── Dsr1.node.ts  # Node implementation
    │   │   ├── gulpfile.js      # Build configuration
    │   │   ├── index.js         # Module entry point
    │   │   ├── index.ts         # TypeScript entry point
    │   │   ├── package.json     # Node dependencies
    │   │   ├── package-lock.json # Locked dependencies
    │   │   └── tsconfig.json    # TypeScript configuration
    │   └── n8n-nodes-haystack/  # Haystack integration (built and functional)
    ├── docker-compose.yml     # n8n-specific Docker config
    └── local-files/           # Persistent local files for n8n
```

## Configuration

### Docker Configuration

The application uses Docker Compose for container orchestration:

- `docker-compose.yml`: Main configuration file that defines three services:
  - `web`: NGINX web server (port 8080)
  - `db`: PostgreSQL database
  - `n8n`: n8n workflow automation (port 5678)

### Environment Variables

Sensitive configuration is stored in the `.env` file:

```
DB_USER=your_db_user
DB_PASSWORD=your_secure_password_here
DB_NAME=your_db_name
N8N_ENCRYPTION_KEY=your_secure_encryption_key_here
```

### NGINX Configuration

The NGINX server (`nginx/conf.d/default.conf`) is configured to:

1. Serve static web content from `/usr/share/nginx/html`
2. Proxy requests to n8n at `/n8n/`
3. Proxy webhook requests to n8n at `/webhook/`

## Web Frontend

The web frontend is now a Single Page Application (SPA) with seamless navigation:

1. **Home Section**: Welcome page with system testing and feature overview
2. **AI Chat Section**: Real-time chat interface with DeepSeek R1 via webhooks
3. **Workflows Section**: n8n workflow management and monitoring

### Frontend Configuration

Frontend configuration is managed in `website/js/config.js` which defines:

```javascript
const CONFIG = {
  WEBHOOK_ID: "c188c31c-1c45-4118-9ece-5b6057ab5177",  
  WEBHOOK_URL: `${window.location.protocol}//${window.location.host}/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177`
};
```

## n8n Integration

The project uses n8n for workflow automation. Key integration points:

1. **Webhook Endpoints**: The application communicates with n8n via webhooks
2. **Custom Nodes**: The project includes a custom n8n node for DeepSeek integration
3. **Workflow Storage**: Workflows are stored in the n8n data volume
4. **Workflow Exports**: Pre-configured workflows available in `workflow_json/`

### Available Workflows

#### web_UI_basic
Basic workflow that connects the web interface to the DeepSeek AI node:
- Receives webhook requests from the frontend
- Processes messages through the DeepSeek R1 node
- Returns AI responses to the chat interface
- Import via n8n interface: Menu → Import from file → Select `workflow_json/web_UI_basic`

## Recent Changes and Improvements

### Latest Session Updates

1. **Frontend Architecture Transformation**:
   - Converted multi-page site to Single Page Application (SPA)
   - Eliminated ~150 lines of duplicated CSS across files
   - Created extensible framework with section registration system
   - Implemented tab-based navigation with smooth transitions

2. **Documentation Overhaul**:
   - Created comprehensive README.md with setup instructions
   - Fixed formatting for optimal GitHub display
   - Added troubleshooting guides and development workflows
   - Documented all custom nodes and configurations

3. **Workflow Management**:
   - Added `workflow_json/` directory for workflow exports
   - Created basic web UI workflow for chat functionality
   - Documented workflow import process

### Previous Improvements

1. **Security Enhancements**:
   - Moved sensitive data to environment variables (.env file)
   - Removed hardcoded credentials and encryption keys
   - Improved NGINX proxy configuration

2. **Code Organization**:
   - Consolidated duplicate web files into single SPA
   - Created proper directory structure (css, js)
   - Standardized naming conventions

3. **Configuration Improvements**:
   - Added health checks for all services
   - Fixed CORS configuration
   - Improved docker-compose configuration

4. **Interface Improvements**:
   - Implemented responsive design
   - Created unified design system with CSS custom properties
   - Improved error handling and response display

## Future Considerations

Areas for future improvement:

1. **Security**:
   - Add HTTPS support with SSL certificates
   - Implement proper authentication

2. **Monitoring**:
   - Add logging infrastructure
   - Set up service monitoring

3. **Development**:
   - Add development environment configuration
   - Create build and testing pipelines

4. **UI Enhancement**:
   - Add more sections to the SPA (Settings, Dashboard, Help)
   - Implement advanced chat features (history, conversation management)
   - Add dark mode toggle using CSS custom properties

## Running the Application

To run the application:

1. Set up the environment file:
   ```
   # Copy the example template and edit with your secure credentials
   cp .env.example .env
   # Edit .env with your secure credentials
   ```

2. Start the services:
   ```
   docker-compose up -d
   ```

3. Access the web interface at `http://localhost:8080`
4. Access the n8n interface at `http://localhost:8080/n8n/`
5. Import the basic workflow:
   - In n8n, click menu (three dots) → Import from file
   - Select `workflow_json/web_UI_basic`
   - Activate the workflow
6. Test the chat interface in the "AI Chat" tab

# Development Session Analysis and Discoveries

## Critical Discoveries Made During Development

### 1. Container Orchestration Issues
- **n8n Crash State Problem**: The primary issue preventing n8n startup was not encryption key mismatches, but a corrupted crash state in the data volume
- **Health Check Failures**: Multiple Docker health checks were failing due to:
  - PostgreSQL health check looking for wrong database name (`vel` vs `mydb`)
  - n8n health check using `curl` command not available in container
  - Solution: Use `netstat` for simple port listening verification

### 2. Credential Management Revelations
- **"Placeholder" credentials are actually working credentials**: The values in `.env` like `"your_secure_password_here"` are the real functional passwords, not placeholders
- **Local-only security model**: System works locally with simple credentials but is intentionally not production-ready for cloud deployment
- **Environment variable interpolation**: Docker Compose correctly reads and applies `.env` values to containers

### 3. Frontend Architecture Problems
- **Broken relative path references**: HTML files had inconsistent `../` path structures causing CSS and JS loading failures
- **Mixed styling approaches**: Combination of external CSS (`styles.css`) and inline styles created conflicts
- **JavaScript dependency failures**: UI changes broke chat functionality because JS expected specific DOM elements (`.sidebar`, `.toggle-btn`)

### 4. Git Repository Security
- **False security alarm**: Initial panic about `.env` in git was incorrect - `.gitignore` worked correctly from the beginning
- **Proper secret management**: Only `.env.example` was committed; real `.env` was always protected

## Interface Improvements Needed

### Immediate Technical Fixes Required

1. **JavaScript Dependency Resolution**
   - Chat functionality breaks when sidebar elements are removed
   - Need to decouple chat.js from specific UI layout requirements
   - Implement defensive programming for missing DOM elements

2. **CSS Architecture Overhaul**
   - **Current Problem**: ~150 lines of identical CSS duplicated across 3 HTML files
   - **Maintenance Issue**: Color scheme changes require editing 9+ locations
   - **Solution Needed**: Extract common styles to shared stylesheet with CSS custom properties

3. **Navigation Consistency**
   - Three different navigation patterns across pages create confusing UX
   - Need unified navigation component approach
   - Consider single-page application or template system

### Long-term Architectural Considerations

1. **Component-Based Architecture**
   - Current copy-paste approach will not scale beyond 3-4 pages
   - Need shared header/navigation/footer components
   - Consider build system for component reuse

2. **State Management**
   - Chat functionality tightly coupled to specific DOM structure
   - Need abstraction layer for UI-independent functionality
   - Consider separating business logic from presentation

3. **Development Workflow**
   - No separation between development and production builds
   - Missing optimization pipeline for CSS/JS
   - Need hot-reload capability for faster iteration

## Lessons Learned for Future Agents

### Debugging Methodology Insights

1. **Fresh Perspective Technique**
   - When stuck in solution loops, step back completely and test basic assumptions
   - The "encryption key" issue was solved by testing fresh container vs. existing volume
   - Sometimes the simplest explanation (crash state) is correct

2. **Assumption Validation**
   - Never assume "placeholder" values are non-functional without testing
   - Always verify what's actually in git history rather than assuming security breaches
   - Check actual container environment variables, not just configuration files

3. **Systematic Investigation**
   - When user says "look at website folder," focus specifically on that request
   - Don't get distracted by tangential issues (security concerns) when user has specific intent
   - Test one change at a time to isolate cause-and-effect relationships

### Human-AI Collaboration Patterns

1. **Trust Building Through Transparency**
   - Admitting when stuck in loops builds credibility
   - Explaining reasoning allows human to redirect effectively
   - Acknowledging mistakes openly prevents defensive behavior

2. **User Expertise Recognition**
   - User often knows the codebase better than initial analysis reveals
   - When user suggests "check X," they usually have specific knowledge
   - Gut instincts about broken functionality are often accurate

3. **Iterative Problem Solving**
   - Break complex problems into small, verifiable steps
   - Maintain working state between experiments
   - Revert changes when they break functionality

### Testing and Validation Strategies

1. **Functional Testing Before Refactoring**
   - Always verify current working functionality before making changes
   - Document which parts work vs. which are broken
   - Maintain regression capability throughout development

2. **End-to-End Impact Assessment**
   - UI changes can break backend integrations (chat.js dependency failure)
   - Consider full user journey when making interface modifications
   - Test actual user workflows, not just visual appearance

3. **Git Workflow Management**
   - Commit working states frequently for easy rollback
   - Use meaningful commit messages that explain "why" not just "what"
   - Verify security implications before pushing to public repositories

### Code Quality Recognition

1. **Maintainability vs. Functionality Trade-offs**
   - Working code with duplication beats broken "clean" code
   - Recognize when perfectionism hinders progress
   - Balance immediate needs with long-term architecture

2. **Progressive Enhancement Philosophy**
   - Start with working solution, then improve systematically
   - Don't rebuild everything at once
   - Preserve core functionality during refactoring

### Communication Effectiveness

1. **Precise Language Importance**
   - "Fix the paths" is clearer than "fix the website"
   - Specific technical terms reduce ambiguity
   - Ask for clarification when instructions seem incomplete

2. **Problem Escalation Recognition**
   - Know when to admit being stuck rather than cycling through similar approaches
   - Accept redirection gracefully when taking wrong approach
   - Value user feedback as course correction, not criticism

This session demonstrated that successful AI-human collaboration requires technical competence, debugging methodology, honest communication, and the humility to admit mistakes and learn from redirections.

# Frontend Architecture Transformation

## The Herculean Challenge - Complete Redesign

Following the analysis of maintainability issues, a complete frontend reconstruction was undertaken to create an elegantly simple, extensible application framework while preserving 100% of existing functionality.

## New Architecture Overview

### Single Page Application Design
The frontend was completely rebuilt as a unified SPA with the following structure:

```
website/
├── index.html              # Single entry point with all sections
├── css/
│   ├── app.css            # Unified CSS framework with design system
│   └── styles.css         # Legacy CSS (preserved but unused)
├── js/
│   ├── app.js             # Extensible application framework
│   └── config.js          # Preserved webhook configuration
├── favicon.ico            # Unchanged
```

### Core Design Principles Applied

1. **Occam's Razor**: Simplest solution that preserves all functionality
2. **Zero Code Duplication**: Eliminated ~150 lines of repeated CSS across files
3. **Extensibility First**: Built for easy addition of new sections and features
4. **Defensive Programming**: Graceful handling of missing DOM elements
5. **Progressive Enhancement**: Works with JavaScript disabled for basic navigation

## Technical Implementation

### CSS Framework (`css/app.css`)
- **Design System**: CSS custom properties for consistent theming
- **Component-Based**: Reusable classes for buttons, cards, layout elements
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Accessibility**: Proper contrast ratios and keyboard navigation support

### JavaScript Architecture (`js/app.js`)
- **Class-Based Design**: `DataComposeApp` class managing application state
- **Section Registration System**: Modular approach for adding new functionality
- **Preserved Functionality**: All original webhook, chat, and n8n integrations intact
- **Event Management**: Centralized navigation and interaction handling

### HTML Structure (`index.html`)
- **Semantic Markup**: Proper use of HTML5 semantic elements
- **Accessible Navigation**: ARIA-compliant tab-based interface
- **Content Sections**: Each major feature as a toggleable section
- **Progressive Loading**: Sections load content only when activated

## Functionality Preservation Verification

### Original Features Maintained
✅ **Chat System**: Webhook URL preserved exactly (`c188c31c-1c45-4118-9ece-5b6057ab5177`)  
✅ **Message Handling**: Enter key support, status updates, error handling  
✅ **n8n Integration**: Health check endpoint (`/n8n/healthz`) and workflows API  
✅ **Connection Testing**: System status verification functionality  
✅ **Workflows Management**: Integration with `/n8n/rest/workflows` and interface links  

### Enhanced User Experience
- **Seamless Navigation**: Tab-like switching between sections without page reloads
- **Consistent Design**: Unified visual language across all functionality
- **Improved Performance**: Single page load, smooth CSS transitions
- **Better Mobile Support**: Responsive design optimized for all screen sizes

## Extensibility Features

### Easy Section Addition
New sections can be added programmatically:

```javascript
window.app.addSection('settings', 'Settings', 'fas fa-cog', 
    '<h2>Settings</h2><p>Configuration options...</p>',
    { onShow: () => initializeSettings() }
);
```

### Theme Customization
Colors and fonts can be changed globally via CSS custom properties:

```css
:root {
    --primary-color: #2c3e50;
    --secondary-color: #3498db;
    /* Change these to retheme entire application */
}
```

### Modular JavaScript
The section registration system allows for independent feature development:

```javascript
app.registerSection('newFeature', {
    onShow: () => loadNewFeature(),
    onHide: () => cleanupNewFeature()
});
```

## Architecture Benefits Achieved

### Maintainability Improvements
- **Single Source of Truth**: One CSS file for all styling
- **Centralized Navigation**: One navigation system for all sections
- **Consistent Patterns**: Reusable components and standard interactions
- **Clear Separation**: Distinct layers for presentation, behavior, and data

### Development Efficiency Gains
- **Faster Iteration**: Changes to one section don't affect others
- **Easier Testing**: Isolated section logic with clear interfaces
- **Simpler Deployment**: Single HTML file with organized assets
- **Better Version Control**: Logical file organization for collaborative development

### Performance Optimizations
- **Reduced HTTP Requests**: Consolidated CSS and JavaScript files
- **Faster Page Loads**: Single initial load with lazy section activation
- **Smooth Interactions**: CSS-based transitions and animations
- **Optimized Caching**: Static assets with proper cache headers

## Future Development Roadmap

### Immediate Enhancements Possible
1. **Settings Section**: User preferences and configuration management
2. **Dashboard Section**: Workflow analytics and system monitoring
3. **Help Section**: Documentation and troubleshooting guides
4. **Advanced Chat Features**: Chat history, conversation management

### Long-term Architectural Considerations
1. **Build System Integration**: Webpack/Vite for optimization and hot reload
2. **Component Library**: Reusable UI components for consistent development
3. **State Management**: Centralized application state for complex interactions
4. **API Abstraction**: Service layer for all backend communications

## Lessons from the Transformation

### What Worked Well
- **Incremental Approach**: Preserved functionality while rebuilding architecture
- **Design System First**: CSS custom properties enabled consistent theming
- **Extensibility Planning**: Built framework that scales beyond current needs
- **Testing Throughout**: Verified each step maintained existing functionality

### Key Success Factors
- **Clear Requirements**: Preserved exact functionality while improving maintainability
- **Simple Solutions**: Applied Occam's Razor to avoid over-engineering
- **User-Focused Design**: Maintained familiar navigation patterns
- **Future-Proofing**: Built architecture that accommodates growth

The transformation successfully converted a collection of scattered, duplicated files into a cohesive, maintainable, and extensible application framework while preserving every aspect of the original functionality. The new architecture embodies the principle that the best solutions are both powerful and simple.

# Lawyer-Chat Integration

## Overview
The lawyer-chat application has been successfully integrated into data-compose as a containerized service. It's accessible at http://localhost:8080/chat and fully integrated with n8n webhooks.

### Key Configuration Points
1. **BasePath Deployment**: The application is served at `/chat` subpath
2. **API Endpoints**: All API calls use `/chat/api/*` paths
3. **Asset Paths**: All static assets (images, CSS, JS) use `/chat/*` paths
4. **Authentication**: NextAuth configured with `/chat/api/auth` basePath
5. **Webhook Integration**: Connected to n8n via internal Docker networking

### Environment Variables
The lawyer-chat service requires these environment variables in `.env`:
- `NEXTAUTH_SECRET`: Secret for NextAuth session encryption
- `N8N_API_KEY` and `N8N_API_SECRET`: For webhook authentication (if configured)
- Email configuration variables for notifications (optional)

### Docker Configuration
- **Service Name**: lawyer-chat
- **Internal Port**: 3000
- **External Access**: Via nginx proxy at `/chat`
- **Networks**: Connected to both frontend and backend networks
- **Health Check**: Tests `/chat/api/csrf` endpoint

### n8n Webhook
- **Webhook ID**: `c188c31c-1c45-4118-9ece-5b6057ab5177`
- **Workflow Name**: Basic_workflow
- **Internal URL**: `http://n8n:5678/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177`

# Hierarchical Summarization Navigation

## Overview
The Hierarchical Summarization feature provides an advanced visualization and navigation system for exploring document hierarchies with multiple levels of summarization.

## Navigation Features

### Visual Hierarchy
- **Level-based Color Coding**: Each hierarchy level has distinct colors:
  - Level 0 (Source Documents): Light blue (#e3f2fd)
  - Level 1 (Initial Summaries): Light green (#e8f5e9)
  - Level 2 (Intermediate Summaries): Light orange (#fff3e0)
  - Level 3 (Final Summary): Light purple (#f3e5f5)
- **Dynamic Node Sizing**: Higher-level summaries appear larger for visual emphasis
- **Active Path Highlighting**: Shows the relationship path between nodes

### Navigation Methods

1. **Arrow Navigation**
   - Left/Right arrows: Navigate between hierarchy levels (parent/child relationships)
   - Up/Down arrows: Navigate between siblings at the same level
   - Hover tooltips show preview of target nodes

2. **Keyboard Shortcuts**
   - `←` Navigate to parent level (toward final summary)
   - `→` Navigate to child level (toward source documents)
   - `↑` Previous sibling at same level
   - `↓` Next sibling at same level
   - `Home` Jump directly to final summary
   - `End` Jump to first source document
   - `Ctrl+/` Open search dialog

3. **Breadcrumb Navigation**
   - Shows current path from final summary to current node
   - Click any breadcrumb to jump directly to that node
   - Color-coded breadcrumbs match level colors

4. **Quick Jump Dropdown**
   - Access via compass icon in top-right
   - Nodes organized by hierarchy levels
   - Shows preview of each node's content
   - Searchable dropdown for quick access

5. **Search Functionality**
   - Full-text search across all nodes
   - Highlighted matches in visualization
   - Context preview showing surrounding text
   - Click search results to navigate directly

### Additional Features
- **Minimap**: Interactive overview showing entire hierarchy with current viewport
- **Zoom/Pan**: Mouse wheel zoom, click and drag to pan
- **URL Bookmarking**: Direct links to specific nodes via URL hash
- **Progressive Loading**: Handles large hierarchies efficiently
- **Responsive Design**: Adapts to different screen sizes

## Technical Implementation Notes

### Navigation Bug Fix
Fixed critical navigation logic where left/right arrow directions were reversed. The navigation now correctly:
- Left arrow navigates to parent nodes (higher level, toward final summary)
- Right arrow navigates to child nodes (lower level, toward source documents)

### Performance Optimizations
- Debounced zoom/pan operations for smoother interaction
- Smart viewport culling for large hierarchies
- Efficient path highlighting using D3.js selections

### CSS Architecture
All hierarchy levels use CSS custom properties for easy theming and consistency across the visualization.

# DeepSeek Custom Node Details

## Node Architecture

The custom DeepSeek node (`n8n-nodes-deepseek`) provides AI integration capabilities:

### Features
- **Two Operations**: Generate Text and Chat modes
- **Model**: DeepSeek-r1:1.5B via Ollama API
- **Advanced Options**: Temperature, max tokens, thinking visibility
- **Custom Endpoint**: Configurable Ollama server URL

### Technical Implementation
- **TypeScript Source**: `nodes/Dsr1/Dsr1.node.ts`
- **Build System**: TypeScript + Gulp for assets
- **API Endpoint**: `http://host.docker.internal:11434/api/generate`
- **Response Processing**: Parses `<think>` tags for reasoning visibility

### Development Commands
```bash
cd n8n/custom-nodes/n8n-nodes-deepseek
npm run dev    # Watch mode
npm run build  # Production build
npm run lint   # Code quality
```

### Known Limitations
1. Uses `/api/generate` endpoint (stateless, no conversation memory)
2. TypeScript type definitions need updating for latest n8n

### Future Improvements
1. Add streaming response support
2. Implement token usage tracking
3. Add model selection dropdown
4. Consider frontend-based conversation history management

# Haystack/Elasticsearch Integration

## Overview

The project includes a comprehensive document processing system using Elasticsearch and a Haystack-inspired implementation for AI-powered document analysis.

**Pipeline Design**: Haystack works WITH HierarchicalSummarization, not instead of it:
1. HierarchicalSummarization processes documents → PostgreSQL
2. Haystack imports from PostgreSQL → Elasticsearch for search

### Architecture

1. **Elasticsearch Service** (Port 9200)
   - Document storage with BM25 and vector search capabilities
   - Custom document analyzer
   - Hierarchical document tracking

2. **Haystack API Service** (Port 8000)
   - FastAPI-based REST API
   - Document ingestion with embedding generation
   - Hybrid search (BM25 + Vector)
   - Document hierarchy management

3. **Custom n8n Node** (`n8n-nodes-haystack`)
   - Full integration with n8n workflows
   - 8 Operations: Import from Previous Node, Search, Get Hierarchy, Health Check, Batch Hierarchy, Get Final Summary, Get Complete Tree, Get Document with Context

### Important Implementation Note

**Current Active Service**: `haystack_service.py` (NOT haystack_service_simple.py which doesn't exist)
- Uses direct Elasticsearch client (not full Haystack library)
- Running with FastAPI development server (--reload flag, not production-ready)
- **7 endpoints** implemented (missing batch_hierarchy)
- **8 operations** in the n8n node (but "Batch Hierarchy" will fail as endpoint doesn't exist)

### Key Features

1. **Document Hierarchy System**
   - 4-level hierarchy: Source → Chunks → Intermediate Summaries → Final Summaries
   - Parent-child relationship tracking
   - Metadata preservation through all levels

2. **Search Capabilities**
   - **Hybrid Search**: Combines BM25 and vector search
   - **Vector Search**: Using BAAI/bge-small-en-v1.5 embeddings
   - **BM25 Search**: Traditional keyword search with custom analyzer

3. **API Endpoints** (7 implemented)
   - `POST /import_from_node` - Import documents from n8n node
   - `POST /search` - Multi-modal search (BM25/Vector/Hybrid)
   - `POST /hierarchy` - Get document relationships
   - `GET /health` - Service health status
   - `GET /get_final_summary/{workflow_id}` - Get workflow's final summary
   - `GET /get_complete_tree/{workflow_id}` - Get full hierarchical tree
   - `GET /get_document_with_context/{document_id}` - Get document with navigation context
   - ~~`POST /batch_hierarchy`~~ - NOT IMPLEMENTED (defined in node but missing from service)

### Quick Test

```bash
# Check service health
curl http://localhost:8000/health | jq

# Import a test document (note: /ingest endpoint doesn't exist, use n8n workflow instead)
# Documents should be imported via the n8n Haystack node's "Import from Previous Node" operation

# Search documents
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test document", "top_k": 5, "use_hybrid": true}'
```

### Setup Commands

```bash
# From data_compose/ root directory
# Start all services including Haystack
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d

# Or use the convenience script
cd n8n && ./start_haystack_services.sh
```

### Documentation

- Setup guide: `n8n/HAYSTACK_SETUP.md` (consolidated and updated)
- Complete feature documentation: `n8n/haystack_readme.md`
- API Documentation: http://localhost:8000/docs
- Archived planning/development docs: `n8n/archived-docs/`

# Hierarchical Summarization Visualization

## Overview
The Hierarchical Summarization feature provides an advanced visualization and navigation system for exploring document hierarchies with multiple levels of summarization. This visualization was enhanced with smooth animations, keyboard navigation, search functionality, and real-time updates.

## Key Features Implemented

### Visual Hierarchy
- **Level-based Color Coding**: Each hierarchy level has distinct colors:
  - Level 0 (Source Documents): Light blue (#e3f2fd)
  - Level 1 (Initial Summaries): Light green (#e8f5e9)
  - Level 2 (Intermediate Summaries): Light orange (#fff3e0)
  - Level 3 (Final Summary): Light purple (#f3e5f5)
- **Dynamic Node Sizing**: Higher-level summaries appear larger for visual emphasis
- **Active Path Highlighting**: Shows the relationship path between nodes

### Navigation Methods

1. **Arrow Navigation**
   - Left/Right arrows: Navigate between hierarchy levels (parent/child relationships)
   - Up/Down arrows: Navigate between siblings at the same level
   - Hover tooltips show preview of target nodes

2. **Keyboard Shortcuts**
   - `←` Navigate to parent level (toward final summary)
   - `→` Navigate to child level (toward source documents)
   - `↑` Previous sibling at same level
   - `↓` Next sibling at same level
   - `Home` Jump directly to final summary
   - `End` Jump to first source document
   - `Ctrl+/` Open search dialog

3. **Breadcrumb Navigation**
   - Shows current path from final summary to current node
   - Click any breadcrumb to jump directly to that node
   - Color-coded breadcrumbs match level colors

4. **Quick Jump Dropdown**
   - Access via compass icon in top-right
   - Nodes organized by hierarchy levels
   - Shows preview of each node's content
   - Searchable dropdown for quick access

5. **Search Functionality**
   - Full-text search across all nodes
   - Highlighted matches in visualization
   - Context preview showing surrounding text
   - Click search results to navigate directly

### Additional Features
- **Minimap**: Interactive overview showing entire hierarchy with current viewport
- **Zoom/Pan**: Mouse wheel zoom, click and drag to pan
- **URL Bookmarking**: Direct links to specific nodes via URL hash
- **Progressive Loading**: Handles large hierarchies efficiently
- **Responsive Design**: Adapts to different screen sizes
- **Real-time Updates**: Visual indicators for processing status with 2-second polling

### History Management Features
- **New Summarization Button**: Plus (+) button below the history clock icon in the main window
  - Quickly start a new summarization without opening the history drawer
  - Clears any active history selection and returns to the form view
- **Delete History Items**: Right-click on any history item to delete
  - Shows confirmation dialog before deletion
  - Sends 'delete_summarization' action to n8n webhook
  - Automatically switches to form view if deleted item was being viewed

## Technical Implementation Details

### Navigation Bug Fix
Fixed critical navigation logic where left/right arrow directions were reversed. The navigation now correctly:
- Left arrow navigates to parent nodes (higher level, toward final summary)
- Right arrow navigates to child nodes (lower level, toward source documents)

### Performance Optimizations
- Debounced zoom/pan operations for smoother interaction
- Smart viewport culling for large hierarchies
- Efficient path highlighting using D3.js selections

### Visual Enhancements
- Smooth cubic bezier easing for node focus transitions
- Animated dashed borders for active processing nodes
- Opacity fading for non-focused nodes
- Loading overlay for initial data fetch

### CSS Architecture
All hierarchy levels use CSS custom properties for easy theming and consistency across the visualization.

## Future Enhancement Ideas
- WebSocket support for true real-time updates
- Canvas/WebGL rendering for very large hierarchies
- Node clustering for better performance
- Export visualization as image/PDF
- Collaborative viewing with shared cursors

