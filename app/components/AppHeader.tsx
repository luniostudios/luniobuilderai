"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Menu, PanelsTopLeft, X } from "lucide-react";
import { SignOut } from "../login/SignOutButton";
import type { Session } from "next-auth";

export default function AppHeader({ user }: { user?: NonNullable<Session["user"]> }) {
  const session = useSession();
  const activeUser = user ?? session.data?.user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="app-header">
      <div className="relative mx-auto flex min-h-17 w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
        <Link href="/" className="brand-lockup shrink-0" aria-label="LUNIO Builder home" onClick={closeMobileMenu}>
          <span className="brand-name">LUNIO Builder</span>
        </Link>
        <nav aria-label="Main navigation" className="header-nav hidden xl:flex">
          <Link href="/builder" className="header-nav-link">FAQ</Link>
          <Link href="/builder" className="header-nav-link">Pricing</Link>
          <Link href="/builder" className="header-nav-link">Templates</Link>
          <Link href="/builder" className="header-nav-link">Services</Link>
          <Link href="/builder" className="header-nav-link">Documentation</Link>
          {activeUser && <Link href="/dashboard" className="header-nav-link">My Websites</Link>}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {activeUser ? (
            <>
              <span className="header-user max-w-45 truncate">{activeUser.name || activeUser.email}</span>
              <SignOut />
            </>
          ) : (
            <Link href="/login" className="inline-flex h-7 items-center rounded-md border border-border px-2.5 py-4 text-[0.8rem] font-medium transition hover:bg-muted hover:text-foreground">
              Sign in <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          {!activeUser && (
            <Link href="/login" className="inline-flex h-7 items-center rounded-md border border-border px-2.5 py-4 text-[0.8rem] font-medium transition hover:bg-muted hover:text-foreground">
              Sign in <ArrowUpRight size={14} />
            </Link>
          )}
          <button
            type="button"
            className="header-menu-toggle"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        <div
          id="mobile-main-navigation"
          className={`header-mobile-menu xl:hidden ${mobileMenuOpen ? "is-open" : ""}`}
          hidden={!mobileMenuOpen}
        >
          <nav aria-label="Mobile navigation" className="header-mobile-links">
            <Link href="/builder" onClick={closeMobileMenu}>FAQ</Link>
            <Link href="/builder" onClick={closeMobileMenu}>Pricing</Link>
            <Link href="/builder" onClick={closeMobileMenu}>Templates</Link>
            <Link href="/builder" onClick={closeMobileMenu}>Services</Link>
            <Link href="/builder" onClick={closeMobileMenu}>Documentation</Link>
            {activeUser && <Link href="/dashboard" onClick={closeMobileMenu}>My Websites</Link>}
          </nav>
          {activeUser && (
            <div className="header-mobile-account">
              <span className="header-mobile-user">{activeUser.name || activeUser.email}</span>
              <SignOut />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}