'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function SignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[0.8rem] font-medium transition hover:bg-muted hover:text-foreground"
    >
      Sign Out
    </button>
  );
}