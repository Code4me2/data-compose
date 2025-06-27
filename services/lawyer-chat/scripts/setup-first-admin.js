const bcrypt = require('bcryptjs');

// This script creates a simple admin setup for testing
// Run with: node scripts/setup-first-admin.js

async function createAdminInstructions() {
  // Generate a secure password
  const password = 'AdminPass123!';
  const hashedPassword = await bcrypt.hash(password, 12);
  
  console.log('\n🔐 First Admin Account Setup Instructions\n');
  console.log('Since the database connection is having issues, here are two ways to create your admin account:\n');
  
  console.log('📌 Option 1: Use the Registration Flow (Recommended)');
  console.log('----------------------------------------');
  console.log('1. Go to: http://localhost:3001/auth/register');
  console.log('2. Register with your RJLF email (e.g., yourname@reichmanjorgensen.com)');
  console.log('3. Use a secure password (e.g., AdminPass123!)');
  console.log('4. After registration, check the console for the verification link');
  console.log('5. Click the verification link to activate your account');
  console.log('6. Sign in at: http://localhost:3001/auth/signin');
  console.log('7. To make yourself admin, we\'ll need to update your role in the database\n');
  
  console.log('📌 Option 2: Direct Database Insert (If DB is accessible)');
  console.log('----------------------------------------');
  console.log('Run this SQL in your database:\n');
  
  const adminEmail = 'admin@reichmanjorgensen.com';
  
  console.log(`INSERT INTO "User" (
  id, 
  email, 
  name, 
  password, 
  role, 
  emailVerified, 
  createdAt, 
  updatedAt,
  failedLoginAttempts
) VALUES (
  'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  '${adminEmail}',
  'Admin User',
  '${hashedPassword}',
  'admin',
  NOW(),
  NOW(),
  NOW(),
  0
);`);
  
  console.log(`\nThen login with:`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${password}`);
  
  console.log('\n📌 Option 3: Quick Test Mode');
  console.log('----------------------------------------');
  console.log('For immediate testing, I\'ll create a temporary in-memory admin:');
  console.log('1. Let me update the auth configuration to include a test admin...\n');
}

createAdminInstructions();