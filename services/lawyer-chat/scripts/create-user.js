#!/usr/bin/env node

// Script to create RJLF employee accounts
// Usage: node scripts/create-user.js

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../src/generated/prisma');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createUser() {
  console.log('\n=== Reichman Jorgensen Employee Account Creation ===\n');

  try {
    const name = await question('Enter employee name: ');
    const email = await question('Enter employee email (@reichmanjorgensen.com): ');
    const password = await question('Enter password: ');

    // Validate email domain
    if (!email.endsWith('@reichmanjorgensen.com')) {
      console.error('\n❌ Error: Email must end with @reichmanjorgensen.com');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.error('\n❌ Error: User with this email already exists');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: new Date() // Auto-verify Reichman Jorgensen employees
      }
    });

    console.log('\n✅ User created successfully!');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createUser();