# Data Compose UI Migration Guide

## Overview

This guide documents the superficial UI migration of data-compose to match the lawyer-chat frontend design system while preserving all existing functionality.

## Migration Approach

The migration follows a **visual consistency only** approach:
- No changes to core business logic
- Preserved all JavaScript/TypeScript functionality
- Applied Tailwind-style CSS overrides
- Maintained existing navigation and interactions
- Added dark mode synchronization

## Implementation Details

### 1. Next.js Integration

Created a new page at `/chat/data-compose` in the lawyer-chat application:

```typescript
// services/lawyer-chat/src/app/data-compose/page.tsx
export default function DataComposePage() {
  // Uses TaskBar component for consistent navigation
  // Embeds data-compose in iframe with styling wrapper
}
```

### 2. Static File Serving

Data-compose files are served from:
```
services/lawyer-chat/public/data-compose-app/
├── css/
│   ├── app.css              # Original styles
│   ├── styles.css           # Legacy styles
│   └── tailwind-override.css # Lawyer-chat theme overrides
├── js/
│   ├── app.js               # Enhanced with dark mode sync
│   └── config.js            # Webhook configuration
├── index.html               # Original application
└── tailwind-wrapper.html    # Styled navigation wrapper
```

### 3. Visual Consistency

#### Color Scheme
```css
/* Lawyer-chat theme colors */
--lawyer-blue: #004A84;
--lawyer-gold: #C7A562;
--lawyer-gold-hover: #B59552;
--lawyer-dark-bg: #1a1b1e;
--lawyer-dark-secondary: #25262b;
```

#### Dark Mode Synchronization
- Automatically syncs with lawyer-chat's dark mode state
- Checks parent window every second
- Falls back to localStorage if cross-origin

### 4. Navigation Integration

Added settings icon to lawyer-chat header:
```tsx
{session?.user && (
  <a href="/chat/data-compose" title="Developer Dashboard">
    <Settings size={20} />
  </a>
)}
```

## Deployment

### Development
1. Make changes to data-compose files in `website/`
2. Copy files to lawyer-chat public directory:
   ```bash
   cd website && cp -r css js index.html ../services/lawyer-chat/public/data-compose-app/
   ```

### Production
1. Build process automatically includes static files
2. Nginx serves lawyer-chat which includes data-compose assets
3. Access at `http://localhost:8080/chat/data-compose`

## Features Preserved

✅ **All Core Functionality**
- Chat interface with webhook integration
- Workflow management
- Hierarchical summarization with D3.js visualization
- All keyboard shortcuts and interactions

✅ **Visual Consistency**
- Tailwind-style buttons and inputs
- Lawyer-chat color scheme
- Consistent typography and spacing
- Dark mode support

✅ **Performance**
- No additional build steps required
- Minimal CSS overhead
- Existing JavaScript unchanged

## Future Enhancements

### Short Term
- Add more Tailwind utility classes
- Improve mobile responsiveness
- Add loading states matching lawyer-chat

### Long Term
- Full React/Next.js migration
- Shared component library
- Unified state management
- TypeScript throughout

## Rollback

If issues arise, simply remove:
1. `services/lawyer-chat/src/app/data-compose/page.tsx`
2. `services/lawyer-chat/public/data-compose-app/`
3. Settings icon link in `services/lawyer-chat/src/app/page.tsx`

The original data-compose application remains unchanged in `website/`.