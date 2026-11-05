import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role?: Role;
    profileCompleted?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      profileCompleted: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    profileCompleted?: boolean;
  }
}