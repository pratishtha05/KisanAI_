"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bot, Send, AlertTriangle, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { streamAdvice, type AdvisorResult } from "@/lib/advisorStream";

type Phase = "idle" | "waiting" | "streaming" | "done" | "error";

export default function FarmAdvisor() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [liveText, setLiveText] = useState("");
  const [response, setResponse] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Stop any in-flight answer when leaving the page (frees the model for others).
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || phase === "waiting" || phase === "streaming") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAsked(q);
    setPhase("waiting");
    setStatus("");
    setLiveText("");
    setResponse(null);
    setError("");

    await streamAdvice(
      { query: q, language },
      {
        onStatus: setStatus,
        onToken: (t) => { setPhase("streaming"); setLiveText((prev) => prev + t); },
        onResult: (r) => { setResponse(r); setPhase("done"); },
        onError: (m) => { setError(m); setPhase("error"); },
      },
      controller.signal
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setLiveText("");
  };

  const reset = () => {
    setPhase("idle"); setResponse(null); setQuery(""); setLiveText(""); setError("");
  };

  const busy = phase === "waiting" || phase === "streaming";

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Bot className="text-green-600" /> Ask KisanAI
        </h1>
        <p className="text-gray-600">Have a question about your farm? Ask in simple language.</p>
      </div>

      {phase === "idle" && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Suggested Questions</h2>
          <div className="flex flex-col gap-2">
            {[
              "When should I grow wheat?",
              "Give me some schemes for agriculture.",
              "Give me some fertilization tips.",
              "How to deal with pests?"
            ].map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); ask(q); }}
                className="text-left p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase !== "idle" && (
        <Card className="p-4 bg-gray-50 mb-4">
          <div className="text-sm text-gray-500 mb-1">You asked:</div>
          <div className="font-medium text-gray-800">{asked}</div>
        </Card>
      )}

      {phase === "waiting" && (
        <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4 py-12 text-center">
          <div className="animate-spin text-green-500"><Bot size={32} /></div>
          {status === "loading"
            ? "KisanAI is waking up. The first answer can take a minute..."
            : "KisanAI is preparing your advice..."}
          <Button variant="ghost" size="sm" onClick={stop}>Cancel</Button>
        </div>
      )}

      {phase === "streaming" && (
        <Card className="p-6 bg-green-50 border-green-200 mb-4">
          <h3 className="font-bold text-green-900 text-lg mb-3 flex items-center gap-2">
            <Bot size={20} className="animate-pulse" /> KisanAI is writing...
          </h3>
          <p className="text-green-800 text-sm leading-relaxed whitespace-pre-wrap">
            {liveText}<span className="inline-block w-2 h-4 bg-green-600 ml-0.5 align-middle animate-pulse" />
          </p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={stop}>Stop</Button>
        </Card>
      )}

      {phase === "error" && (
        <Card className="p-6 bg-red-50 border-red-200 mb-4">
          <div className="flex gap-3 text-red-800">
            <AlertTriangle size={20} className="shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">KisanAI could not answer</span>
              {error}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => ask(asked)}>Try again</Button>
            <Button size="sm" variant="outline" onClick={reset}>Ask something else</Button>
          </div>
        </Card>
      )}

      {phase === "done" && response && (
        <div className="flex-1 space-y-4 mb-8">
          <Card className="p-6 bg-green-50 border-green-200">
            <h3 className="font-bold text-green-900 text-lg mb-2 flex items-center gap-2">
              <Bot size={20} /> My recommendation
            </h3>
            <p className="text-green-800 font-medium text-lg mb-4">{response.recommendation}</p>

            {response.reason && (
              <div className="mb-4">
                <div className="text-sm font-bold text-green-900 uppercase mb-1">Why?</div>
                <p className="text-green-800 text-sm leading-relaxed">{response.reason}</p>
              </div>
            )}

            {response.actions.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-green-900 uppercase mb-2">What to do</div>
                <ul className="list-disc pl-5 text-sm text-green-800 space-y-1">
                  {response.actions.map((act, i) => <li key={i}>{act}</li>)}
                </ul>
              </div>
            )}

            {response.watch_out && (
              <div className="mt-6 pt-4 border-t border-green-200 flex gap-3 text-amber-800 bg-amber-50/50 p-3 rounded-lg">
                <AlertTriangle size={20} className="shrink-0" />
                <div className="text-sm">
                  <span className="font-bold block mb-1">Keep an eye on</span>
                  {response.watch_out}
                </div>
              </div>
            )}

            {response.sources && response.sources.length > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-green-700">
                <BookOpen size={14} className="shrink-0 mt-0.5" />
                <span>Based on: {response.sources.join(", ")}</span>
              </div>
            )}
          </Card>

          {response.generated_by === "local-llm" && (
            <p className="text-xs text-gray-500 px-1">
              AI-generated advice. For pesticide or fertilizer doses, please confirm with your local agriculture officer or KVK.
            </p>
          )}

          <Button variant="outline" className="w-full" onClick={reset}>Ask Another Question</Button>
        </div>
      )}

      {phase === "idle" && (
        <div className="mt-auto pt-4 relative">
          <input
            type="text"
            className="w-full p-4 pr-12 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            placeholder="Ask anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(query)}
            disabled={busy}
          />
          <button
            className="absolute right-2 top-6 p-2 text-green-600 hover:bg-green-50 rounded-xl disabled:opacity-40"
            onClick={() => ask(query)}
            disabled={!query.trim() || busy}
            aria-label="Send"
          >
            <Send size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
