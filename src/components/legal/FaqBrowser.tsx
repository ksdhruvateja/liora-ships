"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

export type FaqItem = { q: string; a: React.ReactNode; text: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

/** Searchable, grouped accordion for the FAQ page. */
export function FaqBrowser({ groups, supportEmail }: { groups: FaqGroup[]; supportEmail: string }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => active === "all" || g.id === active)
      .map((g) => ({
        ...g,
        items: q ? g.items.filter((i) => `${i.q} ${i.text}`.toLowerCase().includes(q)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, active]);

  return (
    <div>
      <div className="relative mx-auto max-w-2xl">
        <svg
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, e.g. “cancel” or “pickup”"
          aria-label="Search the FAQ"
          className="h-14 w-full rounded-full border border-ink/10 bg-white pl-14 pr-5 text-base text-ink shadow-soft outline-none transition focus:border-ocean-500 focus:ring-4 focus:ring-ocean-500/15"
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[{ id: "all", title: "All" }, ...groups].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === g.id ? "bg-ink text-white" : "bg-white text-ink/70 shadow-sm hover:text-ink"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {filtered.length === 0 ? (
          <p className="text-center text-lg text-muted">
            No matches. Email <a className="text-ocean-500 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>{" "}
            and we’ll help.
          </p>
        ) : null}
        {filtered.map((group) => (
          <section key={group.id} aria-labelledby={`faq-${group.id}`}>
            <h2 id={`faq-${group.id}`} className="text-2xl font-bold tracking-tight text-ink">
              {group.title}
            </h2>
            <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
              {group.items.map((item) => {
                const key = `${group.id}:${item.q}`;
                const isOpen = open === key || (query.trim().length > 1 && group.items.length <= 3);
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => setOpen(open === key ? null : key)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left text-lg font-semibold text-ink"
                    >
                      {item.q}
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg ${
                          isOpen ? "bg-ink text-white" : "bg-ink/5 text-ink"
                        }`}
                        aria-hidden="true"
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
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="legal-prose pb-6">{item.a}</div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
