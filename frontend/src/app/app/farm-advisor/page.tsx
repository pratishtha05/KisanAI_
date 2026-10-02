"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bot, Send, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

export default function FarmAdvisor() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const ask = async (text: string) => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await api.post("/farm-advisor/query", { query: text });
      setResponse(res.data);
    } catch (e) {
      alert("Error contacting KisanAI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Bot className="text-green-600" /> Ask KisanAI
        </h1>
        <p className="text-gray-600">Have a question about your farm? Ask in simple language.</p>
      </div>

      {!response && !loading && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Suggested Questions</h2>
          <div className="flex flex-col gap-2">
            {[
              "Should I irrigate today?",
              "When should I fertilize?",
              "What should I do about yellow leaves?",
              "What should I do before rain?"
            ].map(q => (
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

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4 py-12">
          <div className="animate-spin text-green-500"><Bot size={32} /></div>
          KisanAI is preparing your advice...
        </div>
      )}

      {response && !loading && (
        <div className="flex-1 space-y-4 mb-8">
          <Card className="p-4 bg-gray-50">
            <div className="text-sm text-gray-500 mb-1">You asked:</div>
            <div className="font-medium text-gray-800">{query}</div>
          </Card>
          
          <Card className="p-6 bg-green-50 border-green-200">
            <h3 className="font-bold text-green-900 text-lg mb-2 flex items-center gap-2">
              <Bot size={20} /> My recommendation
            </h3>
            <p className="text-green-800 font-medium text-lg mb-4">{response.recommendation}</p>
            
            <div className="mb-4">
              <div className="text-sm font-bold text-green-900 uppercase mb-1">Why?</div>
              <p className="text-green-800 text-sm leading-relaxed">{response.reason}</p>
            </div>

            <div className="mb-4">
              <div className="text-sm font-bold text-green-900 uppercase mb-2">What to do</div>
              <ul className="list-disc pl-5 text-sm text-green-800 space-y-1">
                {response.actions.map((act: string, i: number) => <li key={i}>{act}</li>)}
              </ul>
            </div>

            {response.watch_out && (
              <div className="mt-6 pt-4 border-t border-green-200 flex gap-3 text-amber-800 bg-amber-50/50 p-3 rounded-lg">
                <AlertTriangle size={20} className="shrink-0" />
                <div className="text-sm">
                  <span className="font-bold block mb-1">Keep an eye on</span>
                  {response.watch_out}
                </div>
              </div>
            )}
          </Card>
          
          <Button variant="outline" className="w-full" onClick={() => {setResponse(null); setQuery("");}}>Ask Another Question</Button>
        </div>
      )}

      {!response && !loading && (
        <div className="mt-auto pt-4 relative">
          <input 
            type="text" 
            className="w-full p-4 pr-12 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            placeholder="Ask anything..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(query)}
          />
          <button 
            className="absolute right-2 top-6 p-2 text-green-600 hover:bg-green-50 rounded-xl"
            onClick={() => ask(query)}
            disabled={!query.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
