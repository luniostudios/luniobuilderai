"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppHeader({ user }: { user: NonNullable<Session["user"]> }) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl leading-none">LUNIO Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-45 truncate text-sm text-muted-foreground sm:block">
            {user.name || user.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}