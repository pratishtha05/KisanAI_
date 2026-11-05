"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Building2, CalendarClock, CheckCircle2, ExternalLink,
  FileText, HelpCircle, Info, Phone, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { describeError, fetchScheme, type MissingInfo, type RuleResult, type SchemeDetail } from "@/lib/schemes";
import { AnswersPanel } from "@/components/schemes/AnswersPanel";
import { DeadlineChip, LimitedChip, VerdictBadge } from "@/components/schemes/StatusBadge";

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4 md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 md:text-xl">{icon}{title}</h2>
      {children}
    </Card>
  );
}

const RULE_ICON = {
  pass: <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" aria-label="Met" />,
  fail: <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-label="Not met" />,
  unknown: <HelpCircle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-label="Need more information" />,
};

export default function SchemeDetailPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [scheme, setScheme] = useState<SchemeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [have, setHave] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    fetchScheme(id)
      .then((s) => { if (alive) { setScheme(s); setError(null); } })
      .catch((e) => {
        if (!alive) return;
        const notFound = (e as { response?: { status?: number } })?.response?.status === 404;
        setError({ notFound, text: notFound ? "" : describeError(e, "") });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, reloadKey]);

  const retry = () => { setLoading(true); setError(null); setReloadKey((k) => k + 1); };
  const refreshQuietly = () => { fetchScheme(id).then(setScheme).catch(() => undefined); };

  const ask = (a: MissingInfo | null) => {
    if (!a) return null;
    if (a.kind === "question") {
      return (
        <button type="button" className="mt-1 text-sm font-semibold text-green-700 underline"
          onClick={() => { setHighlight([a.field]); setPanelOpen(true); }}>
          {t("schemes.answer_this", "Answer this question")}
        </button>
      );
    }
    return <Link href="/app/profile" className="mt-1 inline-block text-sm font-semibold text-green-700 underline">{a.label}</Link>;
  };

  const renderRule = (r: RuleResult) => (
    <li key={r.id} className="flex gap-3">
      {RULE_ICON[r.result]}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{r.label}</p>
        <p className={cn("text-sm", r.result === "fail" ? "text-red-700" : r.result === "unknown" ? "text-amber-800" : "text-gray-600")}>{r.message}</p>
        {r.result === "unknown" && ask(r.ask)}
      </div>
    </li>
  );

  if (loading) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-8" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200/70" />)}</div>;
  }
  if (error || !scheme) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/app/schemes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-green-700"><ArrowLeft size={16} aria-hidden />{t("schemes.all", "All schemes")}</Link>
        <Card className="p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 text-red-500" aria-hidden />
          <p>{error?.notFound ? t("schemes.not_found", "We could not find that scheme.") : error?.text || t("schemes.load_error", "Could not load this scheme. Please try again.")}</p>
          {!error?.notFound && <Button className="mt-4" onClick={retry}>{t("schemes.retry", "Try again")}</Button>}
        </Card>
      </div>
    );
  }

  const deciding = scheme.rules.filter((r) => r.kind === "eligibility");
  const prereq = scheme.rules.filter((r) => r.kind === "prerequisite" && r.result !== "pass");
  const el = scheme.eligibility;

  return (
    <div className="min-h-full bg-gradient-to-b from-green-50/60 via-white to-white">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8 md:py-8">
        <Link href="/app/schemes" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline">
          <ArrowLeft size={16} aria-hidden />{t("schemes.all", "All schemes")}
        </Link>

        <header>
          <h1>{scheme.short_name}</h1>
          <p className="mt-1 text-sm text-gray-500">{scheme.name}</p>
          <p className="mt-3 text-base font-semibold text-green-800 md:text-lg">{scheme.benefit_headline}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <VerdictBadge status={el.status} label={t(`schemes.verdict.${el.status}`, el.label)} />
            {scheme.availability !== "active" && <LimitedChip />}
            <DeadlineChip deadline={scheme.deadline} />
          </div>
        </header>

        {scheme.status_note && (
          <p className="flex gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />{scheme.status_note}
          </p>
        )}

        {/* Personal verdict */}
        <Section title={t("schemes.am_i", "Am I eligible?")}>
          <p className="mb-4 text-sm text-gray-600">
            {el.status === "eligible" && t("schemes.v_eligible", "On the information you gave us, you meet every condition we can check. Confirm the points further down with the office.")}
            {el.status === "likely" && t("schemes.v_likely", "You meet the conditions we could check so far. A few answers are still missing.")}
            {el.status === "need_info" && t("schemes.v_need", "We cannot tell yet. Answer the questions marked below.")}
            {el.status === "not_eligible" && t("schemes.v_not", "At least one condition is not met on the information you gave us. If an answer is wrong, you can change it.")}
          </p>
          <ul className="space-y-3">{deciding.map(renderRule)}</ul>
          {scheme.benefit_tiers.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-green-50 p-3 text-sm text-green-900">
              {scheme.benefit_tiers.map((tx) => <li key={tx}>✓ {tx}</li>)}
            </ul>
          )}
          {prereq.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700">{t("schemes.before", "Get these ready first")}</h3>
              <ul className="space-y-3">{prereq.map(renderRule)}</ul>
            </div>
          )}
          <div className="mt-5">
            <Button variant="secondary" size="sm" onClick={() => { setHighlight([]); setPanelOpen((o) => !o); }}>
              {t("schemes.update_answers", "Update my answers")}
            </Button>
          </div>
        </Section>

        <AnswersPanel open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} highlight={highlight} onSaved={refreshQuietly} />

        {/* Benefits */}
        <Section title={t("schemes.benefits", "What you get")}>
          <ul className="space-y-2 text-sm text-gray-700">
            {(scheme.benefits.details ?? []).map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />{d}</li>)}
          </ul>
        </Section>

        {/* Rules in plain words */}
        <Section title={t("schemes.who", "Who can apply")} icon={<Info size={20} className="text-green-700" aria-hidden />}>
          <ul className="space-y-2 text-sm text-gray-700">
            {scheme.eligibility_summary.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />{d}</li>)}
          </ul>
        </Section>

        {/* Deadline */}
        <Section title={t("schemes.deadline", "Deadline")} icon={<CalendarClock size={20} className="text-amber-600" aria-hidden />}>
          <p className="text-base font-semibold text-gray-900">{scheme.deadline.label}</p>
          {scheme.deadline.text && <p className="mt-1 text-sm text-gray-600">{scheme.deadline.text}</p>}
          {scheme.deadline.approximate && <p className="mt-2 text-xs text-gray-500">{t("schemes.approx", "Dates marked “around” are typical dates. Your state sets its own.")}</p>}
        </Section>

        {/* Documents */}
        <Section title={t("schemes.documents", "Documents to carry")} icon={<FileText size={20} className="text-green-700" aria-hidden />}>
          <ul className="space-y-2">
            {scheme.documents.map((d) => (
              <li key={d.name}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-gray-50">
                  <input type="checkbox" checked={!!have[d.name]} onChange={(e) => setHave((h) => ({ ...h, [d.name]: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-green-600" />
                  <span className="text-sm">
                    <span className={cn("font-medium text-gray-900", have[d.name] && "text-gray-400 line-through")}>{d.name}</span>
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs", d.required ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}>{d.required ? t("schemes.required", "Required") : t("schemes.optional", "If applicable")}</span>
                    {d.note && <span className="block text-gray-500">{d.note}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Section>

        {/* How / where */}
        <Section title={t("schemes.how", "How and where to apply")} icon={<Building2 size={20} className="text-green-700" aria-hidden />}>
          <ol className="space-y-3">
            {scheme.how_to_apply.steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm text-gray-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {(scheme.how_to_apply.online.length > 0 || scheme.official_url) && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-bold text-gray-800">{t("schemes.online", "Online")}</h3>
              <div className="flex flex-wrap gap-2">
                {scheme.how_to_apply.online.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100">
                    {l.label}<ExternalLink size={14} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          )}
          {scheme.how_to_apply.offline.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-bold text-gray-800">{t("schemes.offline", "In person")}</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {scheme.how_to_apply.offline.map((o) => <li key={o} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />{o}</li>)}
              </ul>
            </div>
          )}
          {scheme.helpline.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {scheme.helpline.map((h) => (
                <a key={h.number} href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
                  <Phone size={15} className="text-green-700" aria-hidden />{h.label}: {h.number}
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* Confirm with office */}
        {(scheme.verify.length > 0 || scheme.caveats.length > 0) && (
          <Section title={t("schemes.confirm", "Confirm with the office")} icon={<AlertTriangle size={20} className="text-amber-600" aria-hidden />}>
            <ul className="space-y-2 text-sm text-gray-700">
              {[...scheme.verify, ...scheme.caveats].map((v) => <li key={v} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />{v}</li>)}
            </ul>
          </Section>
        )}

        <footer className="space-y-2 pb-4 text-xs leading-relaxed text-gray-500">
          <p>{scheme.disclaimer}</p>
          <p>
            {t("schemes.checked", "Information last checked")}: {scheme.last_verified}.{" "}
            {scheme.sources.map((s, i) => (
              <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="underline">{i === 0 ? "Source" : `Source ${i + 1}`}{i < scheme.sources.length - 1 ? ", " : ""}</a>
            ))}
          </p>
        </footer>
      </div>
    </div>
  );
}
