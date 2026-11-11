"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { LogoMark } from "@/components/Logo";


function ServiceBadges() {
  const icons = [
    // truck
    <path key="t" d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0-.01M17 18a1.5 1.5 0 1 0 0-.01" />,
    // plane
    <path key="p" d="M2 13l20-7-7 16-3-7-10-2z" />,
    // box
    <path key="b" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5" />,
  ];
  const tints = ["bg-ink text-white", "bg-ocean-500 text-white", "bg-lime-400 text-ink"];
  return (
    <div className="flex -space-x-2">
      {icons.map((icon, i) => (
        <span key={i} className={`grid h-9 w-9 place-items-center rounded-full ring-[3px] ring-[#f6f3ff] ${tints[i]}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
            {icon}
          </svg>
        </span>
      ))}
    </div>
  );
}

function TrackCard() {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = value.trim();
        if (t) router.push(`/track/${encodeURIComponent(t)}`);
      }}
      className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/45 p-5 shadow-[0_30px_60px_-30px_rgba(12,26,51,0.45)] backdrop-blur-2xl sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold leading-tight tracking-tight text-ink">
            Where’s your
            <br />
            parcel right now?
          </p>
          <p className="mt-1.5 text-sm text-muted">Live scans from pickup to doorstep.</p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white to-ocean-100 shadow-inner">
          <LogoMark className="h-10 w-10" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white/85 p-1.5 pl-5 shadow-sm">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tracking number"
          aria-label="Tracking number"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white"
          aria-label="Track"
        >
          →
        </motion.button>
      </div>
    </form>
  );
}

/** Framed, editorial hero: giant wordmark with a 3D Liora hexagon breaking through it. */
export function HeroShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const wordY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    // Full-bleed, full-screen opener: pulled up over the page padding so it fills the first screen.
    <section ref={ref} className="full-bleed relative -mt-10 sm:-mt-14">
      <div className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(120%_90%_at_85%_60%,#c9d6ff_0%,#e4e2fb_38%,#f7f4ee_75%)] lg:h-[100svh] lg:min-h-[640px]">
        {/* soft color blooms */}
        <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-ocean-400/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-lime-300/30 blur-[90px]" />

        <div className="relative flex min-h-[100svh] flex-col justify-center gap-8 px-6 pb-12 pt-28 sm:px-10 lg:absolute lg:inset-0 lg:mx-auto lg:block lg:min-h-0 lg:max-w-7xl lg:p-0">
          {/* top-left: services */}
          <div className="rise lg:absolute lg:left-12 lg:top-28">
            <ServiceBadges />
            <p className="mt-3 max-w-[15rem] text-sm leading-snug text-ink/70">
              Ground, air and express — <span className="font-semibold text-ink">every major US carrier</span> in one
              checkout.
            </p>
          </div>

          {/* top-right caption */}
          <p className="rise rise-1 hidden text-right text-sm font-medium uppercase leading-snug tracking-[0.12em] text-ink/70 lg:absolute lg:right-12 lg:top-32 lg:block">
            Shipping,
            <br />
            beautifully simple.
          </p>

          {/* giant wordmark */}
          <div className="relative flex items-center justify-center py-6 sm:py-10 lg:absolute lg:inset-x-0 lg:top-[25%] lg:py-0">
            <motion.h1
              style={{ y: wordY }}
              className="select-none bg-gradient-to-r from-ink via-[#1d3a8a] to-ocean-500 bg-clip-text text-center text-[27vw] font-black leading-[0.8] tracking-[-0.06em] text-transparent lg:text-[clamp(10rem,19vw,19rem)]"
            >
              <span className="sr-only">Liora — ship anything, anywhere.</span>
              <span aria-hidden="true">LIORA</span>
            </motion.h1>
          </div>

          {/* right-middle caption */}
          <p className="rise rise-2 hidden text-sm leading-relaxed text-ink/70 lg:absolute lg:bottom-[34%] lg:right-12 lg:block lg:text-right">
            Live rates.
            <br />
            One checkout.
            <br />
            Labels in minutes.
          </p>

          {/* bottom-left: headline + actions */}
          <div className="relative z-10 lg:absolute lg:bottom-12 lg:left-12 lg:max-w-md">
            <h2 className="rise rise-1 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
              Shipping, the way
              <br />
              it <em className="font-normal italic text-ocean-500">should be.</em>
            </h2>
            <p className="rise rise-2 mt-4 max-w-sm text-base leading-relaxed text-ink/70">
              Compare live US rates, pay once, and print your label in minutes — no carrier accounts, no extra steps.
            </p>
            <div className="rise rise-3 mt-7 flex flex-wrap items-center gap-3">
              <motion.a
                href="/quote"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(12,26,51,0.8)]"
              >
                Get a quote
              </motion.a>
              <Link
                href="/#how"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/80 px-6 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
              >
                See how it works
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* bottom-right: glass tracking card */}
          <div className="rise rise-3 relative z-10 lg:absolute lg:bottom-12 lg:right-12 lg:w-[23rem]">
            <TrackCard />
          </div>

          {/* scroll cue */}
          <div className="rise rise-3 pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex" aria-hidden="true">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ink/50">Scroll</span>
            <span className="relative h-10 w-px overflow-hidden bg-ink/15">
              <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-ink/60" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
