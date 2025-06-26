# Hardcoded Paths and Path Configuration Vulnerabilities Report

## Executive Summary

This report documents all hardcoded paths and path configuration vulnerabilities found in the lawyer-chat codebase. The application is configured to support a base path via `BASE_PATH` environment variable in `next.config.ts`, but several components contain hardcoded paths that will break when deployed with a base path like `/legal-chat`.

## Critical Issues

### 1. Hardcoded Image Source in Main Page
**File:** `src/app/page.tsx`
**Line:** 482
```tsx
src="/legal-chat/logo.png"
```
**Issue:** This hardcodes the `/legal-chat` base path, which will break if the app is deployed without a base path or with a different base path.
**Fix:** Use Next.js's `Image` component or construct the path dynamically using the base path.

### 2. Hardcoded Image Source in TaskBar
**File:** `src/components/TaskBar.tsx`
**Line:** 119
```tsx
src="/logo.png"
```
**Issue:** This assumes the app is served from root, will break with base path `/legal-chat`.
**Fix:** Should be `/legal-chat/logo.png` or use dynamic base path.

### 3. Hardcoded Image Sources in Auth Pages
**File:** `src/app/auth/signin/page.tsx`
**Line:** 83
```tsx
src="/logo.png"
```

**File:** `src/app/auth/register/page.tsx`
**Line:** 144 (similar pattern)
```tsx
src="/logo.png"
```
**Issue:** Same as above - assumes root deployment.

### 4. API Fetch Calls Without Base Path
Multiple files make fetch calls to `/api/*` endpoints without considering the base path:

- `src/app/page.tsx`: Lines 184, 200, 221, 303
- `src/components/TaskBar.tsx`: Line 46
- `src/app/auth/register/page.tsx`: Line 38
- `src/app/admin/page.tsx`: Lines 65, 100
- `public/test-chat.html`: Line 33

**Example:**
```typescript
const response = await fetch('/api/chats', {
  credentials: 'include'
});
```
**Issue:** These will fail when app is served from `/legal-chat/api/*`.

### 5. Hardcoded Localhost References
**File:** `src/app/api/chat/route.ts`
**Line:** 77
```typescript
"1. Open n8n at http://localhost:5678"
```
**Issue:** Assumes specific port and localhost deployment.

**File:** `scripts/setup-first-admin.js`
**Lines:** 16, 21
```javascript
console.log('1. Go to: http://localhost:3001/auth/register');
console.log('6. Sign in at: http://localhost:3001/auth/signin');
```
**Issue:** Hardcoded localhost and port references.

### 6. Content Security Policy with Hardcoded Localhost
**File:** `next.config.ts`
**Line:** 45
```typescript
"connect-src 'self' http://localhost:* https://api.anthropic.com"
```
**Issue:** Allows connections to any localhost port, which may not work in production.

### 7. Middleware Path Matching
**File:** `src/middleware.ts`
**Lines:** 17, 83
```typescript
if (!request.nextUrl.pathname.startsWith('/api')) {
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};
```
**Issue:** Assumes API routes are at `/api`, won't match `/legal-chat/api` with base path.

## Moderate Issues

### 8. Router Navigation Without Base Path Consideration
Multiple files use Next.js router without considering base path:
- `src/app/auth/signin/page.tsx`: Uses `router.push(callbackUrl)` and `router.push('/')`
- `src/app/admin/page.tsx`: Uses `router.push('/')`

### 9. Window Location Reload
**File:** `src/components/TaskBar.tsx`
**Line:** 168
```typescript
onClick={() => onNewChat ? onNewChat() : window.location.reload()}
```
**Issue:** Full page reload might not preserve base path context properly.

## Recommendations

### 1. Use Next.js Built-in Base Path Support
```typescript
// For images
import { useRouter } from 'next/router';
const router = useRouter();
const logoSrc = `${router.basePath}/logo.png`;

// Or use Next.js Image component which handles base path automatically
import Image from 'next/image';
<Image src="/logo.png" alt="Logo" width={32} height={32} />
```

### 2. Create a Utility Function for API Calls
```typescript
// utils/api.ts
export function getApiUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}/api${path}`;
}

// Usage
const response = await fetch(getApiUrl('/chats'));
```

### 3. Update Middleware Configuration
```typescript
export const config = {
  matcher: [
    '/:path*/api/:api*',  // Matches with any base path
    '/api/:path*'         // Fallback for no base path
  ]
};
```

### 4. Environment-Based Configuration
Create environment variables for all external URLs:
```env
NEXT_PUBLIC_BASE_PATH=/legal-chat
NEXT_PUBLIC_API_URL=/legal-chat/api
N8N_URL=http://n8n-service:5678
```

### 5. Update CSP for Production
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const connectSrc = isDevelopment 
  ? "'self' http://localhost:* https://api.anthropic.com"
  : "'self' https://api.anthropic.com https://your-domain.com";
```

## Testing Recommendations

1. Test the application with `BASE_PATH=/legal-chat` set in environment
2. Verify all images load correctly
3. Test all API calls work with the base path
4. Ensure authentication flows work with base path
5. Test the application behind a reverse proxy with path rewriting

## Priority Actions

1. **High Priority**: Fix hardcoded `/legal-chat/logo.png` in main page - it's already wrong
2. **High Priority**: Update all `/api/*` fetch calls to support base path
3. **Medium Priority**: Fix image sources in auth pages and TaskBar
4. **Low Priority**: Update documentation and setup scripts with configurable URLs