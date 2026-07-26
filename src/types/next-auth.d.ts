import "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    isGodfather?: boolean;
    /** Read-only admin tier (S47): sees everything, writes nothing. */
    isViewer?: boolean;
    tokenVersion?: number;
  }
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      isGodfather: boolean;
      isViewer: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    isGodfather?: boolean;
    isViewer?: boolean;
    accountId?: string;
    tokenVersion?: number;
  }
}
