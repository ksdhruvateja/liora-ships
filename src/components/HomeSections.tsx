"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/* ---------- Stat counters ---------- */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.6, ease, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

export function Stats() {
  const items: { n: number; suffix?: string; label: string }[] = [
    { n: 50, label: "states covered" },
    { n: 1, label: "simple checkout" },
    { n: 24, suffix: "/7", label: "tracking access" },
    { n: 0, label: "carrier accounts needed" },
  ];
  return (
    <section className="grid grid-cols-2 gap-y-12 text-center lg:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease, delay: i * 0.08 }}
        >
          <p className="bg-gradient-to-b from-ink to-ocean-500 bg-clip-text text-6xl font-bold tracking-[-0.05em] text-transparent sm:text-7xl">
            <Counter to={item.n} suffix={item.suffix} />
          </p>
          <p className="mt-2 text-base text-muted">{item.label}</p>
        </motion.div>
      ))}
    </section>
  );
}

/* ---------- Saved-address feature demo ---------- */
const DEMO_EMAIL = "alex@studio.com";

export function SavedAddressDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"typing" | "popup" | "filled">("typing");

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const timers: number[] = [];
    const run = () => {
      setPhase("typing");
      setTyped(0);
      for (let i = 1; i <= DEMO_EMAIL.length; i++) {
        timers.push(window.setTimeout(() => !cancelled && setTyped(i), 400 + i * 85));
      }
      const afterType = 400 + DEMO_EMAIL.length * 85;
      timers.push(window.setTimeout(() => !cancelled && setPhase("popup"), afterType + 500));
      timers.push(window.setTimeout(() => !cancelled && setPhase("filled"), afterType + 2600));
      timers.push(window.setTimeout(() => !cancelled && run(), afterType + 5600));
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [inView]);

  const filled = phase === "filled";

  return (
    <section ref={ref} className="grid items-center gap-12 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease }}
      >
        <p className="text-lg font-semibold text-ocean-500">Saved addresses</p>
        <h2 className="mt-2 text-5xl font-bold tracking-[-0.04em] sm:text-6xl">
          Type your email.
          <br />
          <span className="text-muted/60">We’ll do the rest.</span>
        </h2>
        <div className="mt-8">
          <Link href="/quote" className="group inline-flex items-center gap-1 text-lg font-medium text-ocean-500 hover:underline">
            Try it on a quote <span className="transition-transform group-hover:translate-x-1">›</span>
          </Link>
        </div>
      </motion.div>

      <div className="relative" aria-hidden="true">
        <div className="surface relative overflow-hidden p-6 sm:p-8">
          <p className="text-xs font-semibold text-muted">Email</p>
          <div className="mt-1.5 flex h-12 items-center rounded-xl border border-ocean-500 bg-white px-4 text-ink ring-4 ring-ocean-500/15">
            {DEMO_EMAIL.slice(0, typed)}
            {phase === "typing" ? <span className="ml-0.5 h-5 w-px animate-pulse bg-ink" /> : null}
            {phase !== "typing" ? <span className="ml-auto text-emerald-600">✓</span> : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["From", "Alex Kim", "88 Mission St, San Francisco"],
              ["To", "Jordan Diaz", "21 Lake Shore Dr, Chicago"],
            ].map(([k, name, line]) => (
              <div key={k} className="rounded-2xl border border-ink/10 bg-paper p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{k}</p>
                <AnimatePresence mode="wait">
                  {filled ? (
                    <motion.div key="f" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <p className="mt-2 font-bold text-ink">{name}</p>
                      <p className="text-sm text-muted">{line}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 space-y-2">
                      <div className="h-3 w-3/4 rounded-full bg-ink/10" />
                      <div className="h-3 w-1/2 rounded-full bg-ink/10" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {phase === "popup" ? (
              <motion.div
                className="absolute inset-0 grid place-items-center bg-ocean-900/40 p-6 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-lift"
                  initial={{ y: 40, rotateX: 25, scale: 0.9 }}
                  animate={{ y: 0, rotateX: 0, scale: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  style={{ transformPerspective: 900 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-ocean-500">Welcome back</p>
                  <p className="mt-1 text-lg font-bold text-ink">2 saved addresses</p>
                  <div className="mt-3 space-y-2">
                    {["Alex Kim · San Francisco", "Jordan Diaz · Chicago"].map((row, i) => (
                      <motion.div
                        key={row}
                        className="flex items-center gap-2 rounded-xl border border-ocean-200 bg-ocean-50 px-3 py-2 text-sm font-semibold text-ink"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.12 }}
                      >
                        <span className="h-3 w-3 rounded-full border-[3px] border-ocean-500" />
                        {row}
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    className="mt-4 rounded-full bg-ink py-2.5 text-center text-sm font-bold text-white"
                    animate={{ scale: [1, 1, 0.94, 1] }}
                    transition={{ duration: 1.8, times: [0, 0.75, 0.85, 1] }}
                  >
                    Use selected
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const faqs = [
  ["When is my label created?", "Right after your payment succeeds. Never before."],
  ["Where can I ship?", "Anywhere in the United States, from any US address."],
  ["Can I cancel a label?", "Yes. If it hasn’t been used, cancel it from your confirmation page and get your money back."],
  ["How do saved addresses work?", "After you ship once, enter the same email and your From and To addresses pop up."],
  ["Where do I get my label?", "On your confirmation page, and we email you a copy."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl">
      <motion.h2
        className="text-center text-5xl font-bold tracking-[-0.04em] sm:text-6xl"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease }}
      >
        Questions? Answered.
      </motion.h2>
      <div className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
        {faqs.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left text-xl font-semibold text-ink sm:text-2xl"
                aria-expanded={isOpen}
              >
                {q}
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl ${isOpen ? "bg-ink text-white" : "bg-ink/5 text-ink"}`}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 text-lg text-muted">{a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
