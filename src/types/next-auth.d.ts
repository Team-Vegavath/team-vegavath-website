import "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    isGodfather?: boolean;
    tokenVersion?: number;
  }
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      isGodfather: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    isGodfather?: boolean;
    accountId?: string;
    tokenVersion?: number;
  }
}
