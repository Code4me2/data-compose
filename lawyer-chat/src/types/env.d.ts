declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Required environment variables
      BASE_PATH: string;
      DATABASE_URL: string;
      NEXTAUTH_URL: string;
      NEXTAUTH_SECRET: string;
      N8N_WEBHOOK_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
      
      // Optional environment variables
      EMAIL_SERVER?: string;
      EMAIL_FROM?: string;
      
      // NextAuth providers (optional)
      GITHUB_CLIENT_ID?: string;
      GITHUB_CLIENT_SECRET?: string;
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      
      // Additional optional configs
      NEXTAUTH_DEBUG?: string;
      VERCEL_URL?: string;
    }
  }
}

// This is required to make this file a module
export {};