"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import {
  clearAnswers, describeError, fetchAnswers, saveAnswers,
  type AnswerValue, type Answers, type AnswersResponse, type Question,
} from "@/lib/schemes";

interface Props {
  /** Called after answers are saved or erased so the page can refresh its matches. */
  onSaved: () => void;
  /** Question keys to draw attention to (the ones that would unlock the most schemes). */
  highlight?: string[];
  open: boolean;
  onToggle: () => void;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
        active ? "border-green-600 bg-green-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

function QuestionField({ q, value, onChange, highlighted }: {
  q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue | undefined) => void; highlighted: boolean;
}) {
  return (
    <div id={`q-${q.key}`} className={cn("rounded-xl p-3", highlighted && "bg-amber-50 ring-1 ring-amber-200")}>
      <label className="block text-sm font-medium text-gray-900">{q.label}</label>
      {q.help && <p className="mt-0.5 text-xs text-gray-500">{q.help}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {q.type === "number" ? (
          <input
            type="number"
            inputMode="decimal"
            min={q.min}
            max={q.max}
            value={value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            className="h-10 w-40 rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        ) : (
          q.options?.map((o) => (
            <Pill
              key={String(o.value)}
              active={value === o.value}
              onClick={() => onChange(value === o.value ? undefined : (o.value as AnswerValue))}
            >
              {o.label}
            </Pill>
          ))
        )}
      </div>
    </div>
  );
}

export function AnswersPanel({ onSaved, highlight = [], open, onToggle }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<AnswersResponse | null>(null);
  const [draft, setDraft] = useState<Answers>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  // Fetch when first opened (and on Retry). Cancel-flagged so a late reply can't set state after unmount.
  useEffect(() => {
    if (!open || data) return;
    let alive = true;
    fetchAnswers()
      .then((res) => { if (alive) { setData(res); setDraft(res.answers); setLoadError(null); } })
      .catch((e) => { if (alive) setLoadError(describeError(e, "Could not load your saved answers.")); });
    return () => { alive = false; };
  }, [open, data, reloadKey]);

  const retryLoad = () => { setLoadError(null); setReloadKey((k) => k + 1); };

  // Jump to the first highlighted question when opened from a "Answer this" link.
  useEffect(() => {
    if (open && data && highlight.length) {
      document.getElementById(`q-${highlight[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [open, data, highlight]);

  const setAnswer = (key: string, v: AnswerValue | undefined) => {
    setMessage(null);
    setDraft((d) => {
      const next = { ...d };
      if (v === undefined) delete next[key];
      else next[key] = v;
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveAnswers(draft);
      setData(res);
      setDraft(res.answers);
      setMessage({ kind: "ok", text: t("schemes.saved", "Saved. Your matches have been updated.") });
      onSaved();
    } catch (e) {
      setMessage({ kind: "error", text: describeError(e, "Could not save your answers. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  const onErase = async () => {
    if (!window.confirm(t("schemes.confirm_erase", "Erase everything you told us for scheme matching?"))) return;
    setSaving(true);
    try {
      await clearAnswers();
      setDraft({});
      setData((d) => (d ? { ...d, answers: {}, completeness: 0 } : d));
      setMessage({ kind: "ok", text: t("schemes.erased", "Your answers were erased.") });
      onSaved();
    } catch (e) {
      setMessage({ kind: "error", text: describeError(e, "Could not erase your answers.") });
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = Object.keys(draft).length;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left md:p-5"
      >
        <div>
          <p className="font-bold text-gray-900">{t("schemes.improve", "Improve your matches")}</p>
          <p className="text-sm text-gray-500">
            {t("schemes.improve_sub", "Answer a few optional questions so we can check eligibility exactly.")}
          </p>
        </div>
        <ChevronDown className={cn("shrink-0 text-gray-400 transition-transform", open && "rotate-180")} size={22} aria-hidden />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 md:p-5">
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-900">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {t(
                "schemes.privacy",
                "Every question is optional. If you skip one, we treat it as “not sure”, never as “no”. Your answers are stored encrypted and used only to check scheme eligibility."
              )}
            </span>
          </p>

          {loadError && (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={16} aria-hidden /> {loadError}
              <button className="ml-auto font-semibold underline" onClick={retryLoad}>Retry</button>
            </p>
          )}
          {data && !data.encryption_available && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              Saving answers is turned off because server encryption is not configured. Ask the administrator to set CHAT_ENCRYPTION_KEY.
            </p>
          )}
          {data?.problem && (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={16} aria-hidden /> {data.problem}
            </p>
          )}

          {!data && !loadError && <p className="py-6 text-center text-sm text-gray-500">Loading…</p>}

          {data && (
            <div className="space-y-6">
              {data.sections.map((section) => {
                const qs = data.questions.filter((q) => q.section === section.id);
                if (!qs.length) return null;
                return (
                  <section key={section.id}>
                    <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-green-800">{section.title}</h4>
                    <div className="space-y-1">
                      {qs.map((q) => (
                        <QuestionField
                          key={q.key}
                          q={q}
                          value={draft[q.key]}
                          onChange={(v) => setAnswer(q.key, v)}
                          highlighted={highlight.includes(q.key)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              <div aria-live="polite">
                {message && (
                  <p className={cn("mb-3 flex items-center gap-2 rounded-xl p-3 text-sm",
                    message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>
                    {message.kind === "ok" ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
                    {message.text}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void onSave()} disabled={saving || !data.encryption_available}>
                  {saving ? t("schemes.saving", "Saving…") : t("schemes.save", "Save and update my matches")}
                </Button>
                <span className="text-sm text-gray-500">{answeredCount} / {data.questions.length} answered</span>
                {(Object.keys(data.answers).length > 0) && (
                  <button type="button" onClick={() => void onErase()} disabled={saving}
                    className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                    <Trash2 size={15} aria-hidden /> {t("schemes.erase", "Erase my answers")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
