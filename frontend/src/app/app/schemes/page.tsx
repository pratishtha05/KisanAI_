"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, ChevronDown, Landmark, ListChecks, MapPin, Search, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import {
  describeError, fetchRecommendations, isAbort, searchSchemes,
  type Recommendations, type SchemeSummary,
} from "@/lib/schemes";
import { SchemeCard } from "@/components/schemes/SchemeCard";
import { AnswersPanel } from "@/components/schemes/AnswersPanel";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-gray-200/70", className)} />;
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900">
      {children}
      {count !== undefined && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-600">{count}</span>}
    </h2>
  );
}

export default function SchemesPage() {
  const { t } = useLanguage();
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);   // "" = failed without a server message
  const [reloadKey, setReloadKey] = useState(0);

  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; items: SchemeSummary[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [showNotEligible, setShowNotEligible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initial load (and "Try again"). The flag stops a late response from touching an unmounted page.
  useEffect(() => {
    let alive = true;
    fetchRecommendations()
      .then((r) => { if (alive) { setRecs(r); setError(null); } })
      .catch((e) => { if (alive) setError(describeError(e, "")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const retry = () => { setLoading(true); setError(null); setReloadKey((k) => k + 1); };
  // After the farmer saves answers: refresh quietly, without blanking the page.
  const refreshQuietly = () => { fetchRecommendations().then(setRecs).catch(() => undefined); };

  // Debounced, cancellable search. Everything shown is derived from `q` and `found`,
  // so nothing needs resetting when the box is cleared.
  const query = q.trim();
  const searching = query.length >= 2 && found?.q !== query && searchError === null;
  const results = query.length >= 2 && found?.q === query ? found.items : null;
  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await searchSchemes(query, ctrl.signal);
        setSearchError(null);
        setFound({ q: query, items });
      } catch (e) {
        if (!isAbort(e)) setSearchError(describeError(e, "Search failed. Please try again."));
      }
    }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  const openPanel = (fields: string[] = []) => {
    setHighlight(fields);
    setPanelOpen(true);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const a = recs?.analysis;
  const ctx = recs?.profile.context;

  return (
    <div className="min-h-full bg-gradient-to-b from-green-50/60 via-white to-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-xl bg-green-100 p-2 text-green-700"><Landmark size={21} aria-hidden /></div>
            <span className="text-sm font-medium text-green-700">{t("schemes.kicker", "Government schemes")}</span>
          </div>
          <h1>{t("schemes.title", "Schemes for you")}</h1>
          <p className="mt-1.5 text-sm text-gray-500 md:text-base">
            {t("schemes.subtitle", "We check your farm and details against government schemes, and tell you what to apply for, what you need, and where to go.")}
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("schemes.search_ph", "Search a scheme or topic: PM-KISAN, insurance, loan, solar pump…")}
            aria-label={t("schemes.search", "Search schemes")}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-11 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        {/* Search results */}
        {query.length >= 2 ? (
          <section aria-live="polite">
            {searching && <SkeletonBlock className="h-32" />}
            {searchError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchError}</p>}
            {results && results.length === 0 && !searching && (
              <Card className="p-6 text-center">
                <p className="font-semibold text-gray-900">{t("schemes.none", "No scheme matched your search.")}</p>
                <p className="mt-1 text-sm text-gray-500">Try a topic like “insurance”, “loan”, “pension”, “drip” or a scheme name.</p>
              </Card>
            )}
            {results && results.length > 0 && (
              <>
                <SectionTitle count={results.length}>{t("schemes.results", "Search results")}</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">{results.map((s) => <SchemeCard key={s.id} scheme={s} />)}</div>
              </>
            )}
          </section>
        ) : loading ? (
          <div className="space-y-4" aria-busy="true"><SkeletonBlock className="h-40" /><SkeletonBlock className="h-56" /><SkeletonBlock className="h-40" /></div>
        ) : error !== null ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 text-red-500" aria-hidden />
            <p className="text-gray-800">{error || t("schemes.load_error", "Could not load schemes. Please check your connection and try again.")}</p>
            <Button className="mt-4" onClick={retry}>{t("schemes.retry", "Try again")}</Button>
          </Card>
        ) : recs && a && ctx ? (
          <div className="space-y-8">
            {/* Summary */}
            <Card className="border-green-200 bg-green-50/60 p-5 md:p-6">
              <p className="text-base font-semibold leading-relaxed text-green-950 md:text-lg">{a.headline}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {ctx.state && <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700"><MapPin size={14} className="text-green-600" aria-hidden />{[ctx.district, ctx.state].filter(Boolean).join(", ")}</span>}
                {ctx.crops.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700"><Sprout size={14} className="text-green-600" aria-hidden />{ctx.crops.join(", ")}</span>}
                {ctx.land_acres !== null && <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700">{ctx.land_acres} acres{ctx.land_class ? ` · ${ctx.land_class.replace("_", "-")} farmer` : ""}</span>}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-medium text-green-900">
                  <span>{t("schemes.profile_done", "Details you have given")}</span><span>{recs.profile.completeness}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={recs.profile.completeness} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${recs.profile.completeness}%` }} />
                </div>
              </div>
              {a.notes.map((n) => <p key={n} className="mt-3 text-xs text-gray-600">{n}</p>)}
              {recs.warnings.map((w) => <p key={w} className="mt-3 flex items-center gap-2 text-sm text-amber-800"><AlertTriangle size={15} aria-hidden />{w}</p>)}
            </Card>

            {/* Top picks */}
            {a.top_picks.length > 0 && (
              <section>
                <SectionTitle>{t("schemes.best_picks", "Your best picks")}</SectionTitle>
                <div className="grid gap-3 md:grid-cols-3">
                  {a.top_picks.map((p, i) => (
                    <Link key={p.id} href={`/app/schemes/${p.id}`} className="group block focus-visible:outline-none">
                      <Card className="flex h-full flex-col p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-green-500">
                        <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{i + 1}</span>
                        <h3 className="font-bold text-gray-900">{p.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-green-800">{p.benefit}</p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                          {p.why.slice(0, 2).map((w) => <li key={w}>• {w}</li>)}
                        </ul>
                        {p.deadline && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800"><CalendarClock size={14} aria-hidden />{p.deadline}</p>}
                        <p className="mt-3 flex-1 border-t border-gray-100 pt-3 text-sm text-gray-700"><span className="font-semibold">{t("schemes.next", "Next step")}:</span> {p.next_step}</p>
                        {p.caution && <p className="mt-2 text-xs text-orange-700">{p.caution}</p>}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700">{t("schemes.view", "View details")} <ArrowRight size={14} aria-hidden /></span>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Deadlines + do first */}
            {(a.upcoming_deadlines.length > 0 || a.do_first.length > 0) && (
              <section className="grid gap-3 md:grid-cols-2">
                {a.upcoming_deadlines.length > 0 && (
                  <Card className="p-4 md:p-5">
                    <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-900"><CalendarClock size={18} className="text-amber-600" aria-hidden />{t("schemes.deadlines", "Coming up")}</h3>
                    <ul className="space-y-2 text-sm">
                      {a.upcoming_deadlines.map((d) => (
                        <li key={d.id}><Link href={`/app/schemes/${d.id}`} className="font-semibold text-green-800 hover:underline">{d.name}</Link>
                          <span className={cn("ml-2", d.status === "closing_soon" ? "font-semibold text-red-700" : "text-gray-600")}>{d.label}</span></li>
                      ))}
                    </ul>
                  </Card>
                )}
                {a.do_first.length > 0 && (
                  <Card className="p-4 md:p-5">
                    <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-900"><ListChecks size={18} className="text-green-700" aria-hidden />{t("schemes.do_first", "Do these first")}</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {a.do_first.map((d) => <li key={d.label}><span className="font-semibold">{d.label}</span><span className="text-gray-500"> (for {d.for})</span><br />{d.message}</li>)}
                    </ul>
                  </Card>
                )}
              </section>
            )}

            {/* Unlock + questions */}
            <section ref={panelRef} className="scroll-mt-20 space-y-3">
              {a.unlock.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">{t("schemes.unlock", "Answer these to confirm more schemes")}:</span>
                  {a.unlock.slice(0, 4).map((u) =>
                    u.kind === "question" ? (
                      <button key={u.field} type="button" onClick={() => openPanel([u.field])}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-left text-xs font-medium text-amber-900 hover:bg-amber-100">
                        {u.label} <span className="text-amber-700">· {u.unlocks.join(", ")}</span>
                      </button>
                    ) : (
                      <Link key={u.field} href="/app/profile" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                        {u.label} <span className="text-amber-700">· {u.unlocks.join(", ")}</span>
                      </Link>
                    )
                  )}
                </div>
              )}
              <AnswersPanel open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} highlight={highlight} onSaved={refreshQuietly} />
            </section>

            {/* Lists */}
            {recs.recommended.length > 0 && (
              <section>
                <SectionTitle count={recs.recommended.length}>{t("schemes.recommended", "Recommended for you")}</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">{recs.recommended.map((s) => <SchemeCard key={s.id} scheme={s} />)}</div>
              </section>
            )}
            {recs.need_info.length > 0 && (
              <section>
                <SectionTitle count={recs.need_info.length}>{t("schemes.need_info", "Could apply: a few details needed")}</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">{recs.need_info.map((s) => <SchemeCard key={s.id} scheme={s} />)}</div>
              </section>
            )}
            {recs.not_eligible.length > 0 && (
              <section>
                <button type="button" onClick={() => setShowNotEligible((v) => !v)} aria-expanded={showNotEligible}
                  className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900">
                  {t("schemes.not_eligible", "Not a match right now")}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-600">{recs.not_eligible.length}</span>
                  <ChevronDown className={cn("text-gray-400 transition-transform", showNotEligible && "rotate-180")} size={20} aria-hidden />
                </button>
                {showNotEligible && <div className="grid gap-3 md:grid-cols-2">{recs.not_eligible.map((s) => <SchemeCard key={s.id} scheme={s} />)}</div>}
              </section>
            )}

            <p className="border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
              {recs.disclaimer} {recs.dataset.count} schemes · oldest check {recs.dataset.oldest_verified}.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
