import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import supabase from "./db";

const authOptions = {
    adapter: supabase,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: "/login" },
    callbacks: {
        async session({ session, user }) {
            if (session.user) session.user.id = user.id;
            return session;
        },
    },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);