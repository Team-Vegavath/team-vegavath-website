import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = ((credentials?.username as string) ?? "").toLowerCase().trim();
        const password = (credentials?.password as string) ?? "";
        if (!username || !password) return null;

        // Try DB accounts first (multi-admin, S27)
        try {
          const rows = await sql`
            SELECT id, username, display_name, password_hash, role
            FROM admin_accounts WHERE username = ${username}
          `;
          if (rows.length > 0) {
            const account = rows[0] as {
              id: string; username: string; display_name: string;
              password_hash: string; role: string;
            };
            const valid = await bcrypt.compare(password, account.password_hash)
              .catch(() => false);
            if (!valid) return null;
            // Separate query so login still works before migration 012
            // adds the token_version column.
            let tokenVersion = 0;
            try {
              const tv = await sql`
                SELECT token_version FROM admin_accounts WHERE id = ${account.id}
              `;
              tokenVersion = (tv[0] as { token_version: number } | undefined)
                ?.token_version ?? 0;
            } catch {
              // Column missing - default 0 matches the migration default
            }
            return {
              id: account.id,
              name: account.display_name,
              email: account.username,
              isAdmin: true,
              isGodfather: account.role === "godfather",
              tokenVersion,
            };
          }
        } catch {
          // DB table doesn't exist yet - fall through to env
        }

        // Env godfather fallback - cannot be deleted or overridden
        const envUser = process.env.ADMIN_USERNAME ?? "";
        const envHash = process.env.ADMIN_PASSWORD_HASH ?? "";
        if (!envUser || !envHash) return null;
        if (username !== envUser.toLowerCase()) return null;

        // bcrypt.compare throws on a malformed hash (e.g. bad env value);
        // treat any comparison failure as invalid credentials, not a crash.
        const valid = await bcrypt.compare(password, envHash).catch(() => false);
        if (!valid) return null;

        return {
          id: "godfather",
          name: process.env.ADMIN_DISPLAY_NAME ?? "Vegavath Admin",
          email: envUser,
          isAdmin: true,
          isGodfather: true,
        };
      },
    }),
  ],
  pages: {
    signIn: "/admin",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = true;
        token.isGodfather = user.isGodfather ?? false;
        token.accountId = user.id;
        token.tokenVersion =
          (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }
      // On refresh, validate token_version for DB accounts - a password
      // reset bumps it, killing every live JWT for that account.
      if (!user && token.isAdmin && token.accountId && token.accountId !== "godfather") {
        try {
          const rows = await sql`
            SELECT token_version FROM admin_accounts
            WHERE id = ${token.accountId as string}
          `;
          const current = (rows[0] as { token_version: number } | undefined)
            ?.token_version;
          if (current === undefined || current !== (token.tokenVersion as number)) {
            return null; // Force re-login - password was reset or account deleted
          }
        } catch {
          // Column/table not yet migrated or DB error - allow through,
          // never lock everyone out on infrastructure failure
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = token.isAdmin as boolean;
      session.user.isGodfather = (token.isGodfather as boolean | undefined) ?? false;
      return session;
    },
  },
});
