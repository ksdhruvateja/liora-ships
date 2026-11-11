import Link from "next/link";
import { POLICIES_UPDATED, legalPages } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

/** Shared layout for policy pages: title, sticky table of contents, readable prose. */
export function LegalDoc({
  current,
  title,
  intro,
  sections,
}: {
  current: string;
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-ink/10 pb-10 pt-4">
        <p className="text-lg font-semibold text-ocean-500">Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">{title}</h1>
        <div className="mt-4 max-w-2xl text-lg text-muted">{intro}</div>
        <p className="mt-4 text-sm text-muted">Last updated {POLICIES_UPDATED}</p>
      </header>

      <div className="grid gap-12 pt-10 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Policies" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible">
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                aria-current={page.href === current ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition lg:rounded-xl ${
                  page.href === current ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {page.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="On this page" className="mt-8 hidden lg:block">
            <p className="px-4 text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
            <ol className="mt-2 space-y-1 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-4 py-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="legal-prose max-w-3xl">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28 border-b border-ink/5 pb-10 pt-2 last:border-0">
              <h2>
                <span className="mr-2 text-ocean-500">{i + 1}.</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
