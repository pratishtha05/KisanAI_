"use client";
import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/lib/LanguageContext";
import type { SchemeSummary } from "@/lib/schemes";
import { DeadlineChip, LimitedChip, VerdictBadge } from "./StatusBadge";

export function SchemeCard({ scheme }: { scheme: SchemeSummary }) {
  const { t } = useLanguage();
  const { eligibility: el } = scheme;
  const showDeadline = !["rolling", "ongoing"].includes(scheme.deadline.status);

  return (
    <Link href={`/app/schemes/${scheme.id}`} className="group block focus-visible:outline-none">
      <Card className="p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-green-500 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 md:text-lg">{scheme.short_name}</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{scheme.name}</p>
          </div>
          <ChevronRight className="mt-1 shrink-0 text-gray-300 transition-colors group-hover:text-green-600" size={20} aria-hidden />
        </div>

        <p className="mt-2 text-sm font-semibold text-green-800">{scheme.benefit_headline}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <VerdictBadge status={el.status} label={t(`schemes.verdict.${el.status}`, el.label)} />
          {scheme.plan_ahead && (
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {t("schemes.plan_ahead", "Plan ahead")}
            </span>
          )}
          {scheme.availability !== "active" && <LimitedChip note={scheme.status_note} />}
          {showDeadline && <DeadlineChip deadline={scheme.deadline} />}
          {scheme.level === "state" && (
            <span className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
              {scheme.states.join(", ")}
            </span>
          )}
        </div>

        {el.status === "not_eligible" && scheme.blockers.length > 0 && (
          <p className="mt-3 text-sm text-red-700">{scheme.blockers[0]}</p>
        )}
        {el.status !== "not_eligible" && scheme.why.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            {scheme.why.slice(0, 2).map((w) => (
              <li key={w} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
        {(el.status === "need_info" || el.status === "likely") && scheme.missing_info.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700">
            <HelpCircle size={15} aria-hidden />
            {t("schemes.answer_n", "Answer {n} to confirm").replace(
              "{n}",
              scheme.missing_info.length === 1 ? "1 question" : `${scheme.missing_info.length} questions`
            )}
          </p>
        )}
      </Card>
    </Link>
  );
}
