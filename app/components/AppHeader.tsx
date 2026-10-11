"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Menu, PanelsTopLeft, Rocket, User, X } from "lucide-react";
import { SignOut } from "../login/SignOutButton";
import type { Session } from "next-auth";

export default function AppHeader({ user }: { user?: NonNullable<Session["user"]> }) {
  const session = useSession();
  const activeUser = user ?? session.data?.user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-[#0b0d10] w-full mt-0 flex flex-row fixed z-100 justify-between align-middle items-center gap-2 py-4 px-[10%] max-lg:px-5">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10">
        <Link href={"/"}>
          <div className="flex items-center text-white gap-2 cursor-pointer font-bold uppercase text-lg">
            <div className='flex flex-row text-2xl align-middle items-center'>
              <h1>LUNI</h1>
              <Rocket width={20} className="text-bold text-[#b8f36b]" />
            </div>
            <h1 className='flex flex-row text-2xl align-middle items-center'>BUILDER</h1>
          </div>
        </Link>
        <nav aria-label="Main navigation" className="text-white flex-row gap-4 hidden xl:flex">
          <Link href="/builder" className="text-white">FAQ</Link>
          <Link href="/builder" className="text-white">Pricing</Link>
          <Link href="/builder" className="text-white">Templates</Link>
          <Link href="/builder" className="text-white">Services</Link>
          <Link href="/builder" className="text-white">Documentation</Link>
          {activeUser && <Link href="/dashboard" className="text-white">My Websites</Link>}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {activeUser ? (
            <>
              <span className="header-user max-w-45 truncate">{activeUser.name || activeUser.email}</span>
              <SignOut />
            </>
          ) : (
            <li><Link href="/login" className="flex flex-row text-white border justify-center border-white/20 rounded-full px-3 py-1 items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <User size={16} />
              Sign In
            </Link>
            </li>
          )}
        </div>

        <div className="flex items-center gap-2 xl:hidden">
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
          {!activeUser && (
            <li><Link href="/login" className="header-mobile-account">
              <User size={16} />
              Sign In
            </Link>
            </li>
          )}
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