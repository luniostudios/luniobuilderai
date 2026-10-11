import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord"
import supabase from "./db";
import Resend from "next-auth/providers/resend"

const authOptions = {
    adapter: supabase,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID as string,
            clientSecret: process.env.AUTH_GITHUB_SECRET as string,
        }),
        Discord({
            clientId: process.env.AUTH_DISCORD_ID as string,
            clientSecret: process.env.AUTH_DISCORD_SECRET as string,
        }),
        Resend({
            // If your environment variable is named differently than default
            apiKey: process.env.AUTH_RESEND_KEY,
            from: process.env.EMAIL_FROM,

            async generateVerificationToken() {
                return crypto.randomUUID()
            },

            normalizeIdentifier(identifier: string): string {
                let [local, domain] = identifier.toLowerCase().trim().split("@")
                domain = domain.split(",")[0]
                if (identifier.split("@").length > 2) {
                    throw new Error("Only one email allowed")
                }
                return `${local}@${domain}`
            },
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