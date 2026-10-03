import api from "@/lib/api";

export interface AdvisorResult {
  recommendation: string;
  reason: string;
  actions: string[];
  watch_out?: string | null;
  confidence: number;
  sources?: string[];
  generated_by?: string;
}

export interface AdvisorRequest {
  query: string;
  language?: string;
  farm_id?: number;
}

export interface AdvisorHandlers {
  /** "loading" = model still starting up, "thinking" = searching knowledge base / about to write */
  onStatus?: (state: string) => void;
  onToken?: (text: string) => void;
  onResult: (result: AdvisorResult) => void;
  onError: (message: string) => void;
}

/**
 * Streams an answer from POST /farm-advisor/stream (Server-Sent Events).
 * Uses fetch (axios cannot stream in the browser) with the same base URL and
 * bearer token as the rest of the app. Pass an AbortSignal to cancel.
 */
export async function streamAdvice(body: AdvisorRequest, h: AdvisorHandlers, signal?: AbortSignal) {
  const base = api.defaults.baseURL || "http://localhost:8000/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  let finished = false;
  try {
    const res = await fetch(`${base}/farm-advisor/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (res.status === 401) return h.onError("Your session has expired. Please log in again.");
    if (!res.ok || !res.body) {
      let detail = "";
      try { detail = (await res.json()).detail; } catch { /* not json */ }
      return h.onError(detail || "KisanAI is unavailable right now. Please try again.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const dispatch = (raw: string) => {
      let event = "message";
      const dataLines: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) return;
      const data = JSON.parse(dataLines.join("\n"));
      if (event === "status") h.onStatus?.(data.state);
      else if (event === "token") h.onToken?.(data.text);
      else if (event === "result") { finished = true; h.onResult(data as AdvisorResult); }
      else if (event === "error") { finished = true; h.onError(data.message); }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        dispatch(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (!finished) h.onError("The connection closed before the answer was complete. Please try again.");
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return; // user cancelled / left the page
    h.onError("Could not reach KisanAI. Check your connection and try again.");
  }
}
