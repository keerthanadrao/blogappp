import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || "mock-linkedin-client-id",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "mock-linkedin-client-secret",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || "mock-github-client-id",
      clientSecret: process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || "mock-github-client-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider && account.provider !== "credentials") {
        if (!user?.email) {
          return false;
        }

        const email = user.email.trim().toLowerCase();
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || profile?.name || email.split("@")[0],
              password_hash: "", // OAuth registered user
              role: "READER",
            },
          });
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
        return true;
      }

      return true;
    },

    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      } else if (token.email && (!token.id || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  // @ts-ignore
  trustHost: true,

  secret: process.env.NEXTAUTH_SECRET || "default_super_secret_for_development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };