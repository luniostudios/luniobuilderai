"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignIn() {
    const [isLoading, setIsLoading] = useState(false)

    const handleSignIn = async () => {
        setIsLoading(true)
        try {
            await signIn("discord", { callbackUrl: "/dashboard" })
        } catch (error) {
            console.error("Sign in error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="flex flex-row text-white border justify-center text-md border-white/20 rounded-lg px-3 py-3 items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <img width="24" height="24" src="https://img.icons8.com/fluency/48/discord-logo.png" alt="discord-logo" />
            {isLoading ? "Signing In..." : "Sign In with Discord"}
        </button>
    )
}