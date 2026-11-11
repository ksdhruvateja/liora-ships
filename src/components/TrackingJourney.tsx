"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { LogoMark } from "@/components/Logo";

/**
 * "Watch it move." — a sticky, scroll-driven tracking story.
 * Scrolling draws a route across a dotted map, moves a parcel along it, lights up
 * each city, and updates a phone-style tracking notification beside it.
 */

const ease = [0.16, 1, 0.3, 1] as const;

// Route through four hubs on a 1000×560 canvas (roughly SF → Denver → Chicago → NYC).
const ROUTE = "M90,330 C190,230 300,350 390,290 S560,170 650,225 S830,260 910,190";
const CITIES = [
  { name: "San Francisco", x: 90, y: 330, at: 0 },
  { name: "Denver", x: 390, y: 290, at: 0.36 },
  { name: "Chicago", x: 650, y: 225, at: 0.68 },
  { name: "New York", x: 910, y: 190, at: 1 },
];

const STEPS = [
  { at: 0.0, title: "Label created", place: "San Francisco, CA", time: "Mon · 9:41 AM" },
  { at: 0.12, title: "Picked up", place: "San Francisco, CA", time: "Mon · 2:15 PM" },
  { at: 0.36, title: "In transit", place: "Denver, CO", time: "Tue · 6:30 AM" },
  { at: 0.68, title: "Arrived at hub", place: "Chicago, IL", time: "Wed · 11:08 PM" },
  { at: 0.9, title: "Out for delivery", place: "New York, NY", time: "Thu · 7:02 AM" },
  { at: 0.995, title: "Delivered", place: "Front door, New York", time: "Thu · 1:18 PM" },
];

function stepIndex(p: number) {
  let i = 0;
  STEPS.forEach((s, idx) => {
    if (p >= s.at) i = idx;
  });
  return i;
}

export function TrackingJourney() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Map the sticky scroll to journey progress, leaving a little hold at both ends.
  const raw = useTransform(scrollYProgress, [0.06, 0.88], [0, 1], { clamp: true });
  const progress = useSpring(raw, { stiffness: 90, damping: 24, restDelta: 0.0005 });

  const [p, setP] = useState(reduce ? 1 : 0);
  const [pt, setPt] = useState({ x: CITIES[0].x, y: CITIES[0].y, angle: 0 });
  const [total, setTotal] = useState(0);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setTotal(length);
    // Reduced motion: show the finished journey (parcel delivered in New York), no animation.
    if (reduce) {
      const end = path.getPointAtLength(length);
      setPt({ x: end.x, y: end.y, angle: 0 });
    }
  }, [reduce]);

  useMotionValueEvent(progress, "change", (v) => {
    const value = reduce ? 1 : Math.min(1, Math.max(0, v));
    setP(value);
    const path = pathRef.current;
    if (!path || !total) return;
    const len = value * total;
    const a = path.getPointAtLength(len);
    const b = path.getPointAtLength(Math.min(total, len + 1));
    setPt({ x: a.x, y: a.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  });

  const active = reduce ? STEPS.length - 1 : stepIndex(p);
  const step = STEPS[active];
  const delivered = active === STEPS.length - 1;
  const dash = total ? total * (1 - (reduce ? 1 : p)) : 0;

  return (
    <section ref={sectionRef} className="full-bleed relative h-[320vh] bg-[#050b18] text-white" aria-label="Live tracking demo">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {/* ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-ocean-500/20 blur-[120px]" />

        <div className="wrap relative">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
          >
            <p className="text-base font-semibold text-lime-400 sm:text-lg">Live tracking</p>
            <h2 className="mt-1 text-4xl font-bold tracking-[-0.04em] sm:mt-2 sm:text-7xl">Watch it move.</h2>
            <p className="mt-2 text-base text-white/55 sm:mt-3 sm:text-lg">Every scan, the moment it happens.</p>
          </motion.div>

          <div className="mt-5 grid items-center gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
            {/* ---------- Map ---------- */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <svg viewBox="0 0 1000 560" className="block h-auto w-full" role="img" aria-label={`Parcel route, currently: ${step.title}`}>
                <defs>
                  <pattern id="tj-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.6" fill="rgba(160,190,255,0.22)" />
                  </pattern>
                  <radialGradient id="tj-fade" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                  <mask id="tj-mask">
                    <rect width="1000" height="560" fill="url(#tj-fade)" />
                  </mask>
                  <linearGradient id="tj-route" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#3d6bff" />
                    <stop offset="100%" stopColor="#a8ec3a" />
                  </linearGradient>
                  <filter id="tj-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect width="1000" height="560" fill="url(#tj-dots)" mask="url(#tj-mask)" />

                {/* faint full route */}
                <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />

                {/* drawn route */}
                <path
                  ref={pathRef}
                  d={ROUTE}
                  fill="none"
                  stroke="url(#tj-route)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#tj-glow)"
                  style={{ strokeDasharray: total || 1, strokeDashoffset: total ? dash : 1 }}
                />

                {/* cities */}
                {CITIES.map((c) => {
                  const reached = (reduce ? 1 : p) >= c.at - 0.001;
                  return (
                    <g key={c.name}>
                      {reached ? (
                        <circle cx={c.x} cy={c.y} r="18" fill="none" stroke="#a8ec3a" strokeOpacity="0.35" className="tj-ping" />
                      ) : null}
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r="7"
                        fill={reached ? "#a8ec3a" : "#0c1a33"}
                        stroke={reached ? "#a8ec3a" : "rgba(255,255,255,0.35)"}
                        strokeWidth="2"
                        style={{ transition: "fill .4s, stroke .4s" }}
                      />
                      <text
                        x={c.x}
                        y={c.y + 36}
                        textAnchor="middle"
                        fontSize="18"
                        fontWeight="600"
                        fill={reached ? "#ffffff" : "rgba(255,255,255,0.4)"}
                        style={{ transition: "fill .4s" }}
                      >
                        {c.name}
                      </text>
                    </g>
                  );
                })}

                {/* parcel */}
                <g transform={`translate(${pt.x} ${pt.y})`}>
                  <circle r="30" fill="#a8ec3a" opacity="0.18" className={delivered ? "" : "tj-pulse"} />
                  <g transform={`rotate(${delivered ? 0 : pt.angle * 0.15})`}>
                    <rect x="-17" y="-17" width="34" height="34" rx="9" fill="#ffffff" />
                    <path d="M-9 -4 L0 -9 L9 -4 L9 6 L0 11 L-9 6 Z" fill="none" stroke="#0c1a33" strokeWidth="2.2" strokeLinejoin="round" />
                    <path d="M-9 -4 L0 1 L9 -4 M0 1 L0 11" fill="none" stroke="#0c1a33" strokeWidth="2.2" strokeLinejoin="round" />
                  </g>
                </g>
              </svg>

              {/* progress bar */}
              <div className="absolute inset-x-6 bottom-5 flex items-center gap-3 text-xs font-semibold text-white/50">
                <span>SF</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ocean-400 to-lime-400"
                    style={{ width: `${Math.round((reduce ? 1 : p) * 100)}%` }}
                  />
                </div>
                <span>NYC</span>
              </div>
            </div>

            {/* ---------- Phone ---------- */}
            <div className="mx-auto w-full max-w-[20rem] lg:max-w-none">
              <div className="rounded-[2.75rem] border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.04] p-2.5 shadow-[0_40px_80px_-30px_rgba(4,70,245,0.7)] backdrop-blur-xl">
                <div className="relative overflow-hidden rounded-[2.25rem] bg-[#0a1428] px-5 pb-5 pt-3 sm:pb-6 sm:pt-4">
                  <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-black sm:mb-4 sm:h-6 sm:w-24" aria-hidden="true" />

                  <div className="flex items-center gap-2">
                    <LogoMark className="h-6 w-6" navy="#1d2f55" />
                    <p className="text-sm font-semibold text-white/80">Liora · FZ7K29QX</p>
                  </div>

                  {/* notification */}
                  <div className="relative mt-4 h-[5.25rem]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={active}
                        className={`absolute inset-0 rounded-2xl p-4 ${delivered ? "bg-lime-400 text-ink" : "bg-white/10 text-white"}`}
                        initial={{ opacity: 0, y: 24, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -24, scale: 0.94 }}
                        transition={{ duration: 0.45, ease }}
                      >
                        <p className={`text-xs font-semibold ${delivered ? "text-ink/70" : "text-white/50"}`}>{step.time}</p>
                        <p className="mt-0.5 text-xl font-bold tracking-tight">
                          {delivered ? "Delivered ✓" : step.title}
                        </p>
                        <p className={`text-sm ${delivered ? "text-ink/70" : "text-white/60"}`}>{step.place}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* timeline */}
                  <ol className="mt-5 hidden space-y-3 sm:block" aria-label="Tracking history">
                    {STEPS.map((s, i) => {
                      const done = i <= active;
                      return (
                        <li key={s.title} className="flex items-center gap-3">
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors duration-500 ${
                              done ? "bg-lime-400 text-ink" : "border border-white/20 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className={`text-sm transition-colors duration-500 ${done ? "text-white" : "text-white/35"}`}>
                            {s.title}
                          </span>
                          {i === active && !delivered ? (
                            <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-lime-400" aria-hidden="true" />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              <div className="mt-4 flex justify-center sm:mt-6 lg:justify-start">
                <Link
                  href="/#track"
                  className="group inline-flex items-center gap-1 text-lg font-medium text-lime-400 hover:underline"
                >
                  Track a real parcel <span className="transition-transform group-hover:translate-x-1">›</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
