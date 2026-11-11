"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, LogoMark } from "@/components/Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/quote", label: "Quotes" },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return false;
  return pathname.startsWith(href);
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  // Home page: the full-screen hero owns the first screen; the header slides in after it.
  const isHome = pathname === "/";
  const [pastHero, setPastHero] = useState(pathname !== "/");
  const updatePastHero = (y: number) => setPastHero(y > window.innerHeight * 0.55);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 24);
    updatePastHero(value);
  });

  useEffect(() => {
    updatePastHero(window.scrollY);
    setScrolled(window.scrollY > 24);
  }, [pathname]);

  // Nav, tracking and "Get a quote" are always reachable; on the home hero only the logo
  // waits (the giant LIORA wordmark is the brand there) and slides in once you scroll.
  const logoHidden = isHome && !pastHero && !open;
  const barSolid = isHome ? pastHero : scrolled;

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeHref = links.find((link) => isActive(link.href, pathname))?.href ?? null;
  const highlight = hovered ?? activeHref;

  return (
    <>
      <motion.header
        className={`${isHome ? "fixed inset-x-0" : "sticky"} top-0 px-3 pt-3 sm:px-5 ${open ? "z-[70]" : "z-50"}`}
      >
        <motion.div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border px-3 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4 ${
            barSolid
              ? open
                ? "border-transparent bg-transparent"
                : "border-white/70 bg-white/90 shadow-[0_12px_40px_-18px_rgba(12,26,51,0.35)] backdrop-blur-xl"
              : "border-transparent bg-transparent"
          }`}
          animate={{ height: barSolid ? 60 : 72 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.div
            className={`pl-1 ${logoHidden ? "pointer-events-none" : ""}`}
            initial={false}
            animate={
              logoHidden
                ? { opacity: 0, x: -16, filter: "blur(6px)", transitionEnd: { visibility: "hidden" } }
                : { opacity: 1, x: 0, filter: "blur(0px)", visibility: "visible" }
            }
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={logoHidden ? undefined : { scale: 1.03 }}
            whileTap={logoHidden ? undefined : { scale: 0.97 }}
          >
            <Logo light={open} />
          </motion.div>

          <nav
            className="hidden items-center rounded-full border border-ink/5 bg-white/70 p-1 shadow-sm backdrop-blur md:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {links.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHovered(link.href)}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    highlight === link.href ? "text-white" : "text-ink/70 hover:text-ink"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {highlight === link.href ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 450, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {link.label}
                    {active && link.href === "/quote" ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/#track"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white text-ink transition hover:border-ocean-300 hover:text-ocean-500"
              aria-label="Track a package"
              title="Track a package"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
            </Link>
            <motion.a
              href="/quote"
              className="group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full bg-ocean-500 pl-5 pr-1.5 text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(4,70,245,0.8)]"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Get a quote</span>
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-lime-400 text-ink transition-transform group-hover:rotate-[-45deg]">
                →
              </span>
            </motion.a>
          </div>

          <motion.button
            type="button"
            className="relative z-[70] grid h-11 w-11 place-items-center rounded-full bg-ink text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="relative block h-3.5 w-5">
              <motion.span
                className="absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current"
                animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              />
              <motion.span
                className="absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current"
                animate={{ opacity: open ? 0 : 1 }}
              />
              <motion.span
                className="absolute left-0 top-3 h-0.5 w-5 rounded-full bg-current"
                animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              />
            </span>
          </motion.button>
        </motion.div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-ink px-6 pb-10 pt-24 text-white md:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.75rem)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 2.5rem) 2.75rem)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.75rem)" }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          >
            <div className="pointer-events-none absolute -bottom-20 -right-20 opacity-20">
              <LogoMark className="h-80 w-80" navy="#1d2f55" />
            </div>
            <nav className="relative flex flex-col gap-1">
              {[...links, { href: "/#track", label: "Track a package" }].map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between border-b border-white/10 py-4 text-3xl font-extrabold tracking-tight ${
                      isActive(link.href, pathname) ? "text-lime-400" : "text-white"
                    }`}
                  >
                    {link.label}
                    <span className="text-lg text-white/40">→</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.a
              href="/quote"
              onClick={() => setOpen(false)}
              className="relative mt-auto inline-flex h-14 items-center justify-center gap-2 rounded-full bg-lime-400 text-base font-bold text-ink"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Get a quote →
            </motion.a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
