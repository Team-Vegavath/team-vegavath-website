"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/crew", label: "Team" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/join", label: "Join Us" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#EF5D08]/20 bg-[#121212]/80 backdrop-blur-md">
      <nav className="flex w-full items-center justify-between" style={{ height: "80px", paddingLeft: "6rem", paddingRight: "6rem" }}>
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <Image
            src="https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png"
            alt="Vegavath"
            width={48}
            height={48}
            className="object-contain" style={{ height: "72px", width: "72px" }}
          />
          <span className="font-black uppercase tracking-wider text-[#EF5D08]" style={{ fontSize: "2rem" }}>
            VEGAVATH
          </span>
        </Link>

        <ul className="hidden md:flex items-center" style={{ gap: "2.5rem" }}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                style={{ fontSize: "1.1rem" }}
                className={`font-semibold tracking-wide transition-colors duration-200 hover:text-[#EF5D08] ${
                  pathname === href ? "text-[#EF5D08]" : "text-[#9a9a9a]"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="flex flex-col gap-1.5 p-2 text-white md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="block h-0.5 w-6 bg-current" />
          <span className="block h-0.5 w-6 bg-current" />
          <span className="block h-0.5 w-6 bg-current" />
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-[#EF5D08]/20 bg-[#121212]/95 px-4 pb-6 md:hidden">
          <ul className="flex flex-col gap-4 pt-4">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block text-sm font-semibold tracking-wide transition-colors hover:text-[#EF5D08] ${
                    pathname === href ? "text-[#EF5D08]" : "text-[#EBEBEB]"
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}