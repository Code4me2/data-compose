import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // basePath: '/chat',  // Commented out for local development
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // Prevents clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Prevents MIME type sniffing
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()' // Disable unnecessary APIs
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
              "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' http://localhost:* https://api.anthropic.com", // API connections
              "frame-ancestors 'none'", // Prevent embedding
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ],
      },
      {
        // Stricter headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
  },
  
  // Additional security configurations
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Enable SRI for scripts (disabled for Turbopack compatibility)
  // experimental: {
  //   sri: {
  //     algorithm: 'sha256'
  //   }
  // }
};

export default nextConfig;
