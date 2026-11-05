import { AlertTriangle, CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeadlineInfo, Verdict } from "@/lib/schemes";

const VERDICT_STYLE: Record<Verdict, { cls: string; Icon: typeof CheckCircle2 }> = {
  eligible: { cls: "bg-green-100 text-green-800 border-green-200", Icon: CheckCircle2 },
  likely: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  need_info: { cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: HelpCircle },
  not_eligible: { cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
};

export function VerdictBadge({ status, label, className }: { status: Verdict; label: string; className?: string }) {
  const { cls, Icon } = VERDICT_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", cls, className)}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

export function DeadlineChip({ deadline }: { deadline: DeadlineInfo }) {
  const urgent = deadline.status === "closing_soon";
  const open = deadline.status === "open";
  const quiet = ["rolling", "ongoing", "check_locally"].includes(deadline.status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        urgent && "border-red-200 bg-red-50 text-red-700",
        open && "border-amber-200 bg-amber-50 text-amber-800",
        quiet && "border-gray-200 bg-gray-50 text-gray-600",
        !urgent && !open && !quiet && "border-blue-100 bg-blue-50 text-blue-700"
      )}
    >
      <Clock size={13} aria-hidden />
      {deadline.label}
    </span>
  );
}

export function LimitedChip({ note }: { note?: string }) {
  return (
    <span title={note} className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">
      <AlertTriangle size={13} aria-hidden />
      Limited availability
    </span>
  );
}
