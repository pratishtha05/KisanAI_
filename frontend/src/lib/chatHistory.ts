import axios from "axios";
import api from "@/lib/api";
import type { AdvisorResult } from "@/lib/advisorStream";

const BASE = "/farm-advisor";

export type HistoryMessage = {
  id: number;
  role: "user" | "assistant";
  created_at: string;
  text?: string | null;          // role === "user"
  advice?: AdvisorResult | null; // role === "assistant"
  unreadable?: boolean;          // saved, but could not be decrypted
};

export type HistoryPage = {
  messages: HistoryMessage[];    // oldest -> newest
  has_more: boolean;
  next_before_id: number | null;
};

function toError(e: unknown, fallback: string): Error {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 401) return new Error("Your session has expired. Please log in again.");
    const detail = e.response?.data?.detail;
    if (typeof detail === "string" && detail) return new Error(detail);
  }
  return new Error(fallback);
}

export async function fetchHistory(opts: { limit?: number; beforeId?: number | null; signal?: AbortSignal } = {}): Promise<HistoryPage> {
  try {
    const res = await api.get<HistoryPage>(`${BASE}/history`, {
      params: { limit: opts.limit ?? 30, before_id: opts.beforeId ?? undefined },
      signal: opts.signal,
    });
    return res.data;
  } catch (e) {
    throw toError(e, "Could not load your saved chat. Check your connection and try again.");
  }
}

export async function deleteMessage(id: number): Promise<void> {
  try {
    await api.delete(`${BASE}/history/${id}`);
  } catch (e) {
    throw toError(e, "Could not delete that message.");
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await api.delete(`${BASE}/history`);
  } catch (e) {
    throw toError(e, "Could not clear the chat.");
  }
}

// ─── dates ───────────────────────────────────────────────────────────────────
// The server stores UTC but sends "2026-10-03T11:09:00" with no "Z". JavaScript would
// read that as LOCAL time and show every message hours off, so mark it as UTC.
export function parseServerDate(iso: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayLabel(d: Date, now: Date = new Date()): string {
  if (dayKey(d) === dayKey(now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export const timeLabel = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });