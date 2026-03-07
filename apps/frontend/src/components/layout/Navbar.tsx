"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/delegates", label: "Active Delegates" },
  { href: "/rounds", label: "Rounds" },
  { href: "/lottery", label: "Lottery" },
  { href: "/transparency", label: "Transparency" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">ENS</span>
          </div>
          <span className="font-bold text-text-primary hidden sm:inline">
            Incentives Program
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-sp-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-body-sm transition-colors",
                pathname === href
                  ? "text-primary font-bold"
                  : "text-text-body hover:text-text-primary",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-sp-3">
          <ConnectButton />

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-text-body hover:text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-white">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-r8 text-body-sm transition-colors",
                  pathname === href
                    ? "text-primary font-bold bg-primary/5"
                    : "text-text-body hover:text-text-primary hover:bg-surface",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
