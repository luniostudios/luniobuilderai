"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignOut } from "../login/SignOutButton";
import type { Session } from "next-auth";

export default function AppHeader({ user }: { user?: NonNullable<Session["user"]> }) {
  const session = useSession();
  const activeUser = user ?? session.data?.user;

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-2xl leading-none">LUNIO Builder</Link>
        </div>
        <div className="flex items-center gap-2">
          {activeUser ? (
            <>
              <span className="hidden max-w-45 truncate text-sm text-muted-foreground sm:block">
                {activeUser.name || activeUser.email}
              </span>
              <SignOut />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[0.8rem] font-medium transition hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}