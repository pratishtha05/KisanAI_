import api from "@/lib/api";

// ── Types (mirror app/modules/schemes/schemas.py) ────────────────────────────
export type Verdict = "eligible" | "likely" | "need_info" | "not_eligible";
export type Tier = "apply_now" | "consider" | "need_info" | "not_eligible" | "unavailable" | "other_state";

export interface Eligibility {
  status: Verdict;
  label: string;
  passed: number;
  failed: number;
  unknown: number;
  total: number;
}

export interface DeadlineInfo {
  status: "rolling" | "ongoing" | "check_locally" | "open" | "closing_soon" | "opens_later" | "closed";
  label: string;
  text: string;
  closes_on: string | null;
  days_left: number | null;
  opens_on: string | null;
  days_until_open: number | null;
  approximate: boolean;
  season: string | null;
}

export interface MissingInfo {
  field: string;
  label: string;
  kind: "farm" | "profile" | "question";
}

export interface SchemeSummary {
  id: string;
  name: string;
  short_name: string;
  level: "central" | "state";
  states: string[];
  category: string;
  summary: string;
  benefit_headline: string;
  availability: "active" | "limited" | "closed";
  status_note: string;
  eligibility: Eligibility;
  deadline: DeadlineInfo;
  tier: Tier;
  score: number;
  plan_ahead: boolean;
  why: string[];
  blockers: string[];
  missing_info: MissingInfo[];
  in_your_state: boolean;
}

export interface RuleResult {
  id: string;
  label: string;
  kind: "eligibility" | "prerequisite";
  result: "pass" | "fail" | "unknown";
  message: string;
  ask: MissingInfo | null;
}

export interface ActionItem {
  id: string;
  label: string;
  state: "todo" | "check";
  message: string;
  ask: MissingInfo | null;
}

export interface SchemeDocument { name: string; required: boolean; note: string }
export interface Link { label: string; url: string }

export interface SchemeDetail extends SchemeSummary {
  benefits: { headline?: string; details?: string[] };
  eligibility_summary: string[];
  rules: RuleResult[];
  verify: string[];
  action_items: ActionItem[];
  benefit_tiers: string[];
  documents: SchemeDocument[];
  how_to_apply: { steps: string[]; online: Link[]; offline: string[] };
  helpline: { label: string; number: string }[];
  official_url: string | null;
  sources: string[];
  last_verified: string;
  caveats: string[];
  disclaimer: string;
}

export interface TopPick {
  id: string;
  name: string;
  full_name: string;
  benefit: string;
  verdict: string;
  why: string[];
  next_step: string;
  deadline: string | null;
  caution: string | null;
}

export interface Analysis {
  headline: string;
  top_picks: TopPick[];
  upcoming_deadlines: { id: string; name: string; label: string; days_left: number | null; status: string }[];
  do_first: { label: string; message: string; for: string }[];
  unlock: (MissingInfo & { unlocks: string[] })[];
  counts: Record<string, number>;
  notes: string[];
}

export interface Recommendations {
  analysis: Analysis;
  recommended: SchemeSummary[];
  need_info: SchemeSummary[];
  not_eligible: SchemeSummary[];
  profile: {
    answered: number;
    total: number;
    completeness: number;
    context: { state: string | null; district: string | null; crops: string[]; land_acres: number | null; land_class: string | null; land_source: string | null };
  };
  warnings: string[];
  disclaimer: string;
  dataset: { count: number; oldest_verified: string };
}

export type AnswerValue = string | number | boolean;
export type Answers = Record<string, AnswerValue>;

export interface QuestionOption { value: string | boolean; label: string }
export interface Question {
  key: string;
  section: string;
  type: "bool" | "choice" | "number";
  label: string;
  help?: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
}

export interface AnswersResponse {
  answers: Answers;
  questions: Question[];
  sections: { id: string; title: string }[];
  encryption_available: boolean;
  problem: string | null;
  completeness: number;
}

// ── API calls ────────────────────────────────────────────────────────────────
export async function fetchRecommendations(): Promise<Recommendations> {
  return (await api.get<Recommendations>("/schemes/recommendations")).data;
}

export async function searchSchemes(q: string, signal?: AbortSignal): Promise<SchemeSummary[]> {
  return (await api.get<{ results: SchemeSummary[] }>("/schemes/search", { params: { q }, signal })).data.results;
}

export async function fetchScheme(id: string): Promise<SchemeDetail> {
  return (await api.get<SchemeDetail>(`/schemes/${encodeURIComponent(id)}`)).data;
}

export async function fetchAnswers(): Promise<AnswersResponse> {
  return (await api.get<AnswersResponse>("/schemes/me/answers")).data;
}

export async function saveAnswers(answers: Answers): Promise<AnswersResponse> {
  return (await api.put<AnswersResponse>("/schemes/me/answers", answers)).data;
}

export async function clearAnswers(): Promise<void> {
  await api.delete("/schemes/me/answers");
}

/** Turn an axios/FastAPI error into a sentence a farmer can read. */
export function describeError(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } } };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail && typeof (detail as { message: unknown }).message === "string") {
    return (detail as { message: string }).message;
  }
  if (e?.response?.status === 422) return "Some answers were not valid. Please check them and try again.";
  return fallback;
}

export function isAbort(err: unknown): boolean {
  const e = err as { code?: string; name?: string };
  return e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";
}
