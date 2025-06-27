#!/usr/bin/env node

/**
 * Script to update remaining console.log statements to use the logger utility
 * This script identifies patterns and suggests replacements
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  // Main app page
  {
    file: 'src/app/page.tsx',
    replacements: [
      {
        old: "console.error('Error fetching chat history:', error);",
        new: "logger.error('Error fetching chat history', error);"
      },
      {
        old: "console.error('Error creating chat:', error);",
        new: "logger.error('Error creating chat', error);"
      },
      {
        old: "console.error('Error fetching chat:', error);",
        new: "logger.error('Error fetching chat', error, { chatId });"
      },
      {
        old: "console.error('Error saving message:', error);",
        new: "logger.error('Error saving message', error, { chatId: currentChatId, role, content: content.substring(0, 50) });"
      },
      {
        old: "console.error('Error parsing SSE data:', e);",
        new: "logger.error('Error parsing SSE data', e, { line });"
      },
      {
        old: "console.error('Error sending message:', error);",
        new: "logger.error('Error sending message', error);"
      }
    ],
    imports: "import { createLogger } from '@/utils/logger';\n\nconst logger = createLogger('chat-ui');"
  },
  
  // TaskBar component
  {
    file: 'src/components/TaskBar.tsx',
    replacements: [
      {
        old: "console.error('Error fetching chat history:', error);",
        new: "logger.error('Error fetching chat history', error);"
      }
    ],
    imports: "import { createLogger } from '@/utils/logger';\n\nconst logger = createLogger('taskbar');"
  },
  
  // Auth pages
  {
    file: 'src/app/auth/register/page.tsx',
    replacements: [
      {
        old: "console.error('Registration error:', error);",
        new: "logger.error('Registration error', error);"
      }
    ],
    imports: "import { createLogger } from '@/utils/logger';\n\nconst logger = createLogger('register-page');"
  },
  
  // API routes
  {
    file: 'src/app/api/auth/register/route.ts',
    replacements: [
      {
        old: "console.error('Registration error:', error);",
        new: "logger.error('Registration error', error, { email: body.email });"
      }
    ],
    imports: "import { createLogger } from '@/utils/logger';\n\nconst logger = createLogger('register-api');"
  },
  
  // CSRF store
  {
    file: 'src/store/csrf.ts',
    replacements: [
      {
        old: "console.error('Failed to fetch CSRF token');",
        new: "// Silently fail - error will be handled by retry logic"
      },
      {
        old: "console.error('Error fetching CSRF token:', error);",
        new: "// Silently fail - error will be handled by retry logic"
      }
    ],
    imports: ""
  }
];

console.log('Console.log replacement suggestions:\n');

filesToUpdate.forEach(({ file, replacements, imports }) => {
  console.log(`\nFile: ${file}`);
  console.log('─'.repeat(50));
  
  if (imports) {
    console.log('Add import at top of file:');
    console.log(imports);
    console.log('');
  }
  
  replacements.forEach(({ old, new: newCode }, index) => {
    console.log(`${index + 1}. Replace:`);
    console.log(`   OLD: ${old}`);
    console.log(`   NEW: ${newCode}`);
    console.log('');
  });
});

console.log('\nNote: These are suggestions. Please review each change carefully.');
console.log('Some console statements in auth error handling might be appropriate to keep.');
console.log('Consider the context of each usage before making changes.');