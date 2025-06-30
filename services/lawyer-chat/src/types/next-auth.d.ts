import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: 'user' | 'admin';
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'user' | 'admin';
  }
}