"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Bot, Send, Square, AlertTriangle, BookOpen, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { streamAdvice, type AdvisorResult } from "@/lib/advisorStream";
import {
  clearHistory,
  deleteMessage,
  dayKey,
  dayLabel,
  fetchHistory,
  parseServerDate,
  timeLabel,
  type HistoryMessage,
} from "@/lib/chatHistory";

type Phase = "idle" | "waiting" | "streaming" | "error";
// `local` = shown on screen but not yet confirmed by the server (no real id yet).
type ChatItem = HistoryMessage & { local?: boolean };

const PAGE_SIZE = 30;
const SUGGESTIONS = [
  "When should I grow wheat?",
  "Give me some schemes for agriculture.",
  "Give me some fertilization tips.",
  "How to deal with pests?",
];

export default function FarmAdvisor() {
  const { language } = useLanguage();

  // ── saved thread ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<ChatItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // ── the answer being written right now ────────────────────────────────────
  const [query, setQuery] = useState("");
  const [lastAsked, setLastAsked] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const localId = useRef(-1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const anchor = useRef<{ h: number; t: number } | null>(null);

  const busy = phase === "waiting" || phase === "streaming";

  useEffect(() => {
    alive.current = true;
    // Stop any in-flight answer when leaving the page (frees the model for others).
    return () => {
      alive.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ── load saved chat ───────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setHistoryError("");
    try {
      const page = await fetchHistory({ limit: PAGE_SIZE });
      if (!alive.current) return;
      stickToBottom.current = true;
      setItems((prev) => [...page.messages, ...prev.filter((m) => m.local)]);
      setHasMore(page.has_more);
      setNextBefore(page.next_before_id);
    } catch (e) {
      if (alive.current) setHistoryError(e instanceof Error ? e.message : "Could not load your saved chat.");
    } finally {
      if (alive.current) setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadOlder = async () => {
    if (!hasMore || nextBefore == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchHistory({ limit: PAGE_SIZE, beforeId: nextBefore });
      if (!alive.current) return;
      const el = scrollerRef.current;
      if (el) anchor.current = { h: el.scrollHeight, t: el.scrollTop }; // keep the reader's place
      setItems((prev) => [...page.messages, ...prev]);
      setHasMore(page.has_more);
      setNextBefore(page.next_before_id);
    } catch {
      if (alive.current) setNotice("Could not load older messages. Check your connection and scroll up to try again.");
    } finally {
      if (alive.current) setLoadingOlder(false);
    }
  };

  // After an answer, swap our on-screen copies for the saved ones so each bubble has a real id.
  const syncTail = async () => {
    try {
      const page = await fetchHistory({ limit: 2 });
      if (!alive.current) return;
      setItems((prev) => {
        const lastKnown = Math.max(0, ...prev.filter((m) => !m.local).map((m) => m.id));
        const fresh = page.messages.filter((m) => m.id > lastKnown);
        // Only swap if the server really saved this exchange; otherwise keep what is on screen.
        if (fresh.length >= 2 && fresh.some((m) => m.role === "assistant")) {
          return [...prev.filter((m) => !m.local), ...fresh];
        }
        return prev;
      });
    } catch {
      /* keep the on-screen copies */
    }
  };

  // ── scrolling: stay at the bottom for new messages, hold position when older ones load ──
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (anchor.current) {
      el.scrollTop = anchor.current.t + (el.scrollHeight - anchor.current.h);
      anchor.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [items, liveText, phase, loadingInitial]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && hasMore && !loadingOlder && !loadingInitial) void loadOlder();
  };

  // ── asking ────────────────────────────────────────────────────────────────
  const addLocal = (m: Omit<ChatItem, "id" | "created_at" | "local">) =>
    setItems((prev) => [
      ...prev,
      { ...m, id: localId.current--, created_at: new Date().toISOString(), local: true },
    ]);

  const ask = async (text: string, isRetry = false) => {
    const q = text.trim();
    if (!q || busy) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    stickToBottom.current = true;
    if (!isRetry) addLocal({ role: "user", text: q });
    setQuery("");
    setLastAsked(q);
    setPhase("waiting");
    setStatus("");
    setLiveText("");
    setError("");

    await streamAdvice(
      { query: q, language },
      {
        onStatus: setStatus,
        onToken: (t) => {
          setPhase("streaming");
          setLiveText((prev) => prev + t);
        },
        onResult: (r: AdvisorResult) => {
          addLocal({ role: "assistant", advice: r });
          setLiveText("");
          setPhase("idle");
          void syncTail();
        },
        onError: (m) => {
          if (controller.signal.aborted) return;
          setError(m);
          setLiveText("");
          setPhase("error");
        },
      },
      controller.signal
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setLiveText("");
  };

  // ── deleting ──────────────────────────────────────────────────────────────
  const removeMessage = async (m: ChatItem) => {
    if (m.local) return;
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    try {
      await deleteMessage(m.id);
    } catch {
      setItems(snapshot);
      setNotice("Could not delete that message. Check your connection and try again.");
    }
  };

  const doClear = async () => {
    setConfirmClear(false);
    try {
      await clearHistory();
      setItems([]);
      setHasMore(false);
      setNextBefore(null);
    } catch {
      setNotice("Could not clear the chat. Check your connection and try again.");
    }
  };

  const showEmpty = !loadingInitial && items.length === 0 && phase === "idle";
  let prevDay = "";

  return (
    <div className="p-4 md:p-8 flex flex-col h-full min-h-0">
      {/* header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <Bot className="text-green-600" /> Ask KisanAI
          </h1>
          <p className="text-gray-600">Have a question about your farm? Ask in simple language.</p>
        </div>
        {items.length > 0 && !confirmClear && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} className="mr-1" /> Clear chat
          </Button>
        )}
      </div>

      {confirmClear && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span className="flex-1">Delete all saved messages? This cannot be undone.</span>
          <Button size="sm" onClick={doClear}>Delete all</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>Keep chat</Button>
        </div>
      )}

      {notice && (
        <button
          type="button"
          onClick={() => setNotice("")}
          role="status"
          className="mb-3 w-full text-left rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {notice} <span className="underline">Dismiss</span>
        </button>
      )}

      {/* thread */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Chat with KisanAI"
        className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3 md:p-4"
      >
        {loadingInitial && (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-500 text-sm">
            <div className="animate-spin text-green-500"><Bot size={28} /></div>
            Loading your chat...
          </div>
        )}

        {!loadingInitial && historyError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Your saved chat could not be loaded</span>
              {historyError}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => void loadInitial()}>Try again</Button>
              </div>
            </div>
          </div>
        )}

        {hasMore && !loadingInitial && (
          <div className="mb-3 text-center">
            <Button size="sm" variant="ghost" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="text-green-600 mb-3"><Bot size={36} /></div>
            <p className="font-medium text-gray-800 mb-1">Ask your first question</p>
            <p className="text-sm text-gray-500 mb-5">Your questions and answers are saved here, so you can read them again later.</p>
            <div className="flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void ask(q)}
                  className="text-left p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 transition-colors text-gray-700 text-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {items.map((m) => {
            const when = parseServerDate(m.created_at);
            const key = dayKey(when);
            const showDay = key !== prevDay;
            prevDay = key;
            return (
              <div key={m.id} className="flex flex-col gap-2">
                {showDay && (
                  <div className="my-2 self-center rounded-full bg-white border border-gray-200 px-3 py-1 text-xs text-gray-500">
                    {dayLabel(when)}
                  </div>
                )}
                {m.role === "user" ? (
                  <UserBubble item={m} time={timeLabel(when)} onDelete={() => void removeMessage(m)} />
                ) : (
                  <AdvisorBubble item={m} time={timeLabel(when)} onDelete={() => void removeMessage(m)} />
                )}
              </div>
            );
          })}

          {phase === "waiting" && (
            <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <div className="flex items-center gap-1 mb-1" aria-hidden="true">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              {status === "loading"
                ? "KisanAI is waking up. The first answer can take a minute..."
                : "KisanAI is preparing your advice..."}
              <div><Button variant="ghost" size="sm" className="mt-2" onClick={stop}>Cancel</Button></div>
            </div>
          )}

          {phase === "streaming" && (
            <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-green-800 text-sm leading-relaxed whitespace-pre-wrap">
                {liveText}
                <span className="inline-block w-2 h-4 bg-green-600 ml-0.5 align-middle animate-pulse" />
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={stop}>Stop</Button>
            </div>
          )}

          {phase === "error" && (
            <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <div className="flex gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">KisanAI could not answer</span>
                  {error}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => void ask(lastAsked, true)}>Try again</Button>
                <Button size="sm" variant="outline" onClick={() => setPhase("idle")}>Dismiss</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* composer: always visible, like a chat app */}
      <div className="pt-3 relative">
        <input
          type="text"
          className="w-full p-4 pr-14 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm disabled:bg-gray-100"
          placeholder={busy ? "KisanAI is answering..." : "Ask anything..."}
          aria-label="Your question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void ask(query)}
          disabled={busy}
        />
        {busy ? (
          <button
            className="absolute right-2 top-5 p-2 text-red-600 hover:bg-red-50 rounded-xl"
            onClick={stop}
            aria-label="Stop answering"
          >
            <Square size={20} />
          </button>
        ) : (
          <button
            className="absolute right-2 top-5 p-2 text-green-600 hover:bg-green-50 rounded-xl disabled:opacity-40"
            onClick={() => void ask(query)}
            disabled={!query.trim()}
            aria-label="Send"
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────── bubbles ───────────────────────────────

function DeleteButton({ item, onDelete }: { item: ChatItem; onDelete: () => void }) {
  if (item.local) return null; // not saved yet: nothing to delete on the server
  return (
    <button
      onClick={onDelete}
      aria-label="Delete this message"
      className="p-0.5 text-gray-400 hover:text-red-600 focus:text-red-600"
    >
      <Trash2 size={13} />
    </button>
  );
}

function UserBubble({ item, time, onDelete }: { item: ChatItem; time: string; onDelete: () => void }) {
  return (
    <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-green-600 px-4 py-2 text-white">
      {item.unreadable ? (
        <p className="text-sm italic text-green-100">This message cannot be shown.</p>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
      )}
      <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-green-100">
        <span>{time}</span>
        <span className="[&_button]:text-green-200 [&_button:hover]:text-white"><DeleteButton item={item} onDelete={onDelete} /></span>
      </div>
    </div>
  );
}

function AdvisorBubble({ item, time, onDelete }: { item: ChatItem; time: string; onDelete: () => void }) {
  const a = item.advice;
  if (item.unreadable || !a) {
    return (
      <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-2">
        <p className="text-sm italic text-gray-500">This message cannot be shown.</p>
        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-gray-400">
          <span>{time}</span>
          <DeleteButton item={item} onDelete={onDelete} />
        </div>
      </div>
    );
  }

  const actions = a.actions ?? [];
  const watch = (a.watch_out ?? "").trim();
  const showWatch = watch && !/^none\.?$/i.test(watch);

  return (
    <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-green-900 mb-1">
        <Bot size={14} /> KisanAI
      </div>
      <p className="text-green-900 font-medium leading-snug mb-3">{a.recommendation}</p>

      {a.reason && (
        <div className="mb-3">
          <div className="text-sm font-bold text-green-900 mb-0.5">Why?</div>
          <p className="text-green-800 text-sm leading-relaxed">{a.reason}</p>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-bold text-green-900 mb-1">What to do</div>
          <ul className="list-disc pl-5 text-sm text-green-800 space-y-1">
            {actions.map((act, i) => <li key={i}>{act}</li>)}
          </ul>
        </div>
      )}

      {showWatch && (
        <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 border border-amber-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold block mb-0.5">Keep an eye on</span>
            {watch}
          </div>
        </div>
      )}

      {a.sources && a.sources.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-green-700">
          <BookOpen size={14} className="shrink-0 mt-0.5" />
          <span>Based on: {a.sources.join(", ")}</span>
        </div>
      )}

      {a.generated_by === "local-llm" && (
        <p className="mt-2 text-xs text-gray-500">
          AI-generated advice. For pesticide or fertilizer doses, please confirm with your local agriculture officer or KVK.
        </p>
      )}

      <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-green-700">
        <span>{time}</span>
        <DeleteButton item={item} onDelete={onDelete} />
      </div>
    </div>
  );
}