"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { MotionAnchor } from "@/components/motion/Pressable";

const links = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/#quote", label: "Get a rate" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-paper/95 backdrop-blur-md">
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Logo />
        </motion.div>

        <div className="hidden items-center gap-8 md:flex">
          <nav className="flex items-center gap-6 text-sm font-medium text-muted">
            {links.map((link) => {
              const active = link.href === "/" && pathname === "/";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative pb-1 hover:text-ink ${active ? "text-ink" : ""}`}
                >
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-violet-500"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <MotionAnchor href="/#quote" className="btn-primary">
            Get a quote
            <span className="btn-arrow">→</span>
          </MotionAnchor>
        </div>

        <motion.button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((value) => !value)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.nav
            key="mobile-nav"
            className="wrap overflow-hidden md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="flex flex-col gap-1 pb-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <MotionAnchor href="/#quote" className="btn-primary mt-1 w-full" onClick={() => setOpen(false)}>
                Get a quote
                <span className="btn-arrow">→</span>
              </MotionAnchor>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
