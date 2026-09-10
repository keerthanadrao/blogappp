import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
      allowDangerousEmailAccountLinking: true,
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
        const rawEmail = credentials.email.trim();

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { email: rawEmail },
            ],
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

  pages: {
    signIn: '/login',
    error: '/signup',
  },

  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider && account.provider !== "credentials") {
        if (!user?.email) {
          return false;
        }

        const email = user.email.trim().toLowerCase();
        const rawEmail = user.email.trim();
        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { email: rawEmail },
            ],
          },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || profile?.name || email.split("@")[0],
              password_hash: "", // OAuth registered user
              role: "READER",
              image: user.image || profile?.picture || profile?.avatar_url || null,
            },
          });
        } else if (user.image && !dbUser.image) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { image: user.image },
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
        const email = token.email.toLowerCase();
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { email: token.email },
            ],
          },
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