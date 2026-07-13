import { cn } from "@/lib/utils";

/**
 * The fixture snapshot of apexroofingma.com (03 §5 mock behavior) — a static
 * rendering per version, served by /p/[token] for both the in-app iframe and
 * the link Sarah texts. Version story: v11 launch · v12 new hours (Mon–Sat)
 * · v13 Miller photos in the Gallery · v14+ the Copper gutters section.
 * Deliberately its own look (the client's site, not the app): light, amber accent.
 */

const NAV = [
  { title: "Home", path: "/" },
  { title: "Services", path: "/services" },
  { title: "Roof Replacement", path: "/roof-replacement" },
  { title: "Roof Repair", path: "/roof-repair" },
  { title: "Gallery", path: "/gallery" },
  { title: "Reviews", path: "/reviews" },
  { title: "Contact", path: "/contact" },
];

function Photo({ label, className, isNew }: { label: string; className?: string; isNew?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] items-end overflow-hidden rounded-lg bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500 p-2.5",
        className,
      )}
    >
      {isNew && (
        <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
          New
        </span>
      )}
      <span className="text-[11px] font-medium text-white/90 drop-shadow">{label}</span>
    </div>
  );
}

function Cta({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-block rounded-md bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
    >
      Get a free estimate
    </a>
  );
}

function ServiceCard({ title, blurb, isNew }: { title: string; blurb: string; isNew?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-5", isNew && "border-amber-400 ring-1 ring-amber-200")}>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        {isNew && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">New</span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{blurb}</p>
    </div>
  );
}

export function SitePreview({ version, path, hrefFor }: { version: number; path: string; hrefFor: (path: string) => string }) {
  const hours = version >= 12 ? "Mon–Sat · 7am–6pm" : "Mon–Fri · 8am–5pm";
  const page = NAV.find((p) => p.path === path) ?? NAV[0];

  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900">
      {/* site header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <a href={hrefFor("/")} className="flex items-center gap-2">
            <span aria-hidden className="text-lg text-amber-600">▲</span>
            <span className="text-sm font-bold uppercase tracking-widest">Apex Roofing</span>
          </a>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-zinc-600">
            {NAV.filter((p) => p.path !== "/").map((p) => (
              <a key={p.path} href={hrefFor(p.path)} className={cn("hover:text-zinc-900", p.path === page.path && "text-amber-700")}>
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-14">
        {page.path === "/" && (
          <>
            <section className="py-12 text-center sm:py-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Boston Metro West</p>
              <h1 className="mx-auto mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
                Roofs done right, the first time.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600">
                Replacements, repairs, and gutters across Newton, Brookline, and Waltham — free estimates, honest prices.
              </p>
              <div className="mt-5">
                <Cta href={hrefFor("/contact")} />
              </div>
              <p className="mt-3 text-xs text-zinc-500">★★★★★ 4.9 on Google · Licensed &amp; insured · Text back in 60 seconds</p>
            </section>
            <Photo label={version >= 13 ? "Miller residence — Newton" : "Recent work — Newton"} className="aspect-[5/2]" />
            <section className="grid gap-4 py-10 sm:grid-cols-3">
              <ServiceCard title="Roof Replacement" blurb="Architectural shingles, done in days — not weeks." />
              <ServiceCard title="Roof Repair" blurb="Leaks, flashing, storm damage. Fixed fast." />
              <ServiceCard title="Gutters" blurb="Seamless installs and repairs that protect your foundation." />
            </section>
          </>
        )}

        {page.path === "/services" && (
          <section className="py-10">
            <h1 className="text-2xl font-bold tracking-tight">Services</h1>
            <p className="mt-2 max-w-lg text-sm text-zinc-600">
              Everything above your gutters — and the gutters too. Every job starts with a free on-site estimate.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ServiceCard title="Roof Replacement" blurb="Full tear-off and architectural shingles with a 30-year warranty." />
              <ServiceCard title="Roof Repair" blurb="Leaks, missing shingles, storm damage — most repairs done in one visit." />
              <ServiceCard title="Storm Damage" blurb="Insurance-ready inspections and documentation after wind and hail." />
              <ServiceCard title="Flashing & Chimney" blurb="Re-flashing and sealing where most leaks actually start." />
              <ServiceCard title="Seamless Gutters" blurb="Custom-run aluminum gutters, fitted on site." />
              {version >= 14 && (
                <ServiceCard
                  title="Copper Gutters"
                  blurb="We install and repair copper gutters — a lifetime upgrade that looks better every year."
                  isNew
                />
              )}
            </div>
            {version >= 14 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Photo label="Copper gutter install" isNew />
                <Photo label="Half-round copper" isNew />
                <Photo label="Patina detail" isNew />
              </div>
            )}
          </section>
        )}

        {(page.path === "/roof-replacement" || page.path === "/roof-repair") && (
          <section className="py-10">
            <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
            <p className="mt-2 max-w-lg text-sm text-zinc-600">
              {page.path === "/roof-replacement"
                ? "A full replacement in days, not weeks — tear-off, deck inspection, ice-and-water shield, and architectural shingles."
                : "Most leaks are small problems in the wrong place. We find the source, fix it right, and show you photos of the work."}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-700">
              <li>✓ Free on-site estimate — no pressure, no games</li>
              <li>✓ The price we quote is the price you pay</li>
              <li>✓ Spotless cleanup, magnetic nail sweep included</li>
            </ul>
            <div className="mt-6">
              <Cta href={hrefFor("/contact")} />
            </div>
          </section>
        )}

        {page.path === "/gallery" && (
          <section className="py-10">
            <h1 className="text-2xl font-bold tracking-tight">Our work</h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {version >= 13 && (
                <>
                  <Photo label="Miller residence — Newton" isNew={version === 13} />
                  <Photo label="Miller — ridge detail" isNew={version === 13} />
                  <Photo label="Miller — before/after" isNew={version === 13} />
                  <Photo label="Miller — finished roof" isNew={version === 13} />
                </>
              )}
              <Photo label="Cape replacement — Waltham" />
              <Photo label="Storm repair — Brookline" />
              <Photo label="Colonial re-roof — Needham" />
              <Photo label="Gutter run — Watertown" />
            </div>
          </section>
        )}

        {page.path === "/reviews" && (
          <section className="py-10">
            <h1 className="text-2xl font-bold tracking-tight">What neighbors say</h1>
            <p className="mt-1 text-sm text-zinc-500">★★★★★ 4.9 average on Google</p>
            <div className="mt-6 space-y-4">
              {[
                ["Dana Miller — Newton", "Marcus and his crew replaced our roof in two days — spotless cleanup. Wish we'd called years ago."],
                ["Rich Calloway — Brookline", "Fast, fair, no surprises. The estimate matched the invoice to the dollar."],
                ["Tam Nguyen — Waltham", "Solid work on the flashing — showed up when they said they would."],
              ].map(([who, quote]) => (
                <blockquote key={who} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-sm text-zinc-700">“{quote}”</p>
                  <footer className="mt-2 text-xs font-medium text-zinc-500">
                    ★★★★★ <span className="ml-1">{who}</span>
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {page.path === "/contact" && (
          <section className="mx-auto max-w-md py-10">
            <h1 className="text-2xl font-bold tracking-tight">Get your free estimate</h1>
            <p className="mt-2 text-sm text-zinc-600">Tell us about the job — you'll get a text back within 60 seconds.</p>
            <div className="mt-6 space-y-3">
              {["Your name", "Phone number", "Address"].map((ph) => (
                <div key={ph} className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-400">
                  {ph}
                </div>
              ))}
              <div className="h-20 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-400">
                What's going on with the roof?
              </div>
              <label className="flex items-start gap-2 text-xs text-zinc-500">
                <span className="mt-0.5 inline-block size-3.5 shrink-0 rounded-sm border border-zinc-400" />
                It's OK to text me about my estimate (optional)
              </label>
              <div className="pt-1">
                <Cta href={hrefFor("/contact")} />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-zinc-500">
          <span>© Apex Roofing · Watertown, MA · (833) 555-0141</span>
          <span>{hours}</span>
        </div>
      </footer>
    </div>
  );
}
