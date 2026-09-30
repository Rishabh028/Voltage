import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import jwt from "jsonwebtoken";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || "mock-client-id",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "mock-client-secret",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // Generate an API token for the control-plane using the shared secret
        (session as any).apiToken = jwt.sign(
          { userId: token.id },
          process.env.JWT_SECRET || "secret"
        );
      }
      return session;
    },
  },
});
