import { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

// Extend the User type to include role
interface ExtendedUser extends User {
  role: 'user' | 'admin';
}

// Simple authentication for RJLF employees only
const ALLOWED_EMAIL_DOMAIN = "@reichmanjorgensen.com";

// Maximum failed login attempts before lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const ipAddress = (req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown') as string;

        // Check if email is from RJLF domain
        if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
          throw new Error("Only Reichman Jorgensen employees can sign in");
        }

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user || !user.password) {
            // Log failed attempt
            await prisma.auditLog.create({
              data: {
                action: 'LOGIN_FAILED',
                email,
                ipAddress,
                success: false,
                errorMessage: 'User not found'
              }
            });
            return null;
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
          }

          // Check if email is verified
          if (!user.emailVerified) {
            throw new Error("Please verify your email before signing in");
          }

          // Verify password
          const isValidPassword = await compare(credentials.password, user.password);

          if (!isValidPassword) {
            // Increment failed attempts
            const failedAttempts = user.failedLoginAttempts + 1;
            const isLocked = failedAttempts >= MAX_LOGIN_ATTEMPTS;

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: failedAttempts,
                lockedUntil: isLocked ? new Date(Date.now() + LOCKOUT_DURATION) : null
              }
            });

            // Log failed attempt
            await prisma.auditLog.create({
              data: {
                action: 'LOGIN_FAILED',
                userId: user.id,
                email,
                ipAddress,
                success: false,
                errorMessage: 'Invalid password',
                metadata: { failedAttempts }
              }
            });

            if (isLocked) {
              throw new Error("Too many failed attempts. Account locked for 30 minutes.");
            }

            return null;
          }

          // Success - reset failed attempts and update last login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: ipAddress
            }
          });

          // Log successful login
          await prisma.auditLog.create({
            data: {
              action: 'LOGIN_SUCCESS',
              userId: user.id,
              email,
              ipAddress,
              success: true
            }
          });

          return {
            id: user.id,
            email: user.email!,
            name: user.name || user.email!,
            role: user.role
          } as ExtendedUser;
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error("Authentication failed");
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-this",
  session: { 
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.email = extendedUser.email;
        token.name = extendedUser.name;
        token.role = extendedUser.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user && token) {
        // Add user ID and role to session
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};