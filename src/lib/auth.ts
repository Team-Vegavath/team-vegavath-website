import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username as string;
        const password = credentials.password as string;

        const enteredUsername = username.toLowerCase();
        const storedUsername = (process.env.ADMIN_USERNAME ?? "").toLowerCase();
        if (enteredUsername !== storedUsername) return null;

        const hash = process.env.ADMIN_PASSWORD_HASH;
        if (!hash) return null;

        // bcrypt.compare throws on a malformed hash (e.g. bad env value);
        // treat any comparison failure as invalid credentials, not a crash.
        let valid = false;
        try {
          valid = await bcrypt.compare(password, hash);
        } catch {
          return null;
        }
        if (!valid) return null;

        return {
          id: "admin",
          name: username,
          email: null,
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
      if (user) token.isAdmin = true;
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = token.isAdmin as boolean;
      return session;
    },
  },
});