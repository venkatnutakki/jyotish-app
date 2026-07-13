// "Chat" tab — a running conversation with the AI about this chart. Each turn
// the model receives the full chart dossier (positions, houses, yogas, strengths,
// daśā timeline) plus the classical citations relevant to the question, so it can
// deep-dive and answer from the classics. Needs an AI key; without one it gives a
// one-shot classical answer per message.

"use client";
import { useEffect, useRef, useState } from "react";
import type { BirthData } from "@/lib/astro/types";
import { SAMPLE_QUESTIONS } from "@/lib/astro/question";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({ birth }: { birth: BirthData }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // New chart → new conversation.
  useEffect(() => {
    setMessages([]);
    setErr(null);
    setNote(null);
  }, [birth]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setErr(null);
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth, messages: next, stream: true }),
      });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("text/plain") && r.body) {
        // Streaming reply: grow the assistant bubble as chunks arrive.
        setLoading(false);
        setNote(null);
        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let got = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          if (chunk) {
            got = true;
            setMessages((m) => {
              const copy = m.slice();
              copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + chunk };
              return copy;
            });
          }
        }
        if (!got) throw new Error("empty");
        return;
      }
      // Non-streaming path (offline build / classical fallback): original JSON.
      const j = await r.json();
      if (j.error || !j.reply) throw new Error(j.error || "empty");
      setMessages((m) => [...m, { role: "assistant", content: j.reply }]);
      setNote(j.note ?? null);
    } catch {
      // Never surface raw server/JSON errors in the transcript.
      setErr("Couldn't get a reply just now — please check your connection and try again.");
      // roll the failed turn back so they can retry
      setMessages(next.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-amber-50">Chat with the Chart</h2>
        <p className="text-sm text-amber-100/50">
          Ask anything and keep the conversation going. The AI reads your full
          chart — positions, houses, yogas, strengths and the running daśā — and
          reasons from the classical texts.
        </p>
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-amber-100/40">
              Start by asking about any area of life — career, marriage, health,
              wealth, timing of events…
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLE_QUESTIONS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-amber-100/60 hover:border-amber-300/30 hover:text-amber-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-amber-400/20 px-4 py-2.5 text-sm text-amber-50"
                  : "max-w-[92%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed text-amber-50/90"
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-amber-100/50">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce [animation-delay:150ms]">·</span>
                <span className="animate-bounce [animation-delay:300ms]">·</span>
              </span>{" "}
              consulting the classics…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      {note && !err && <p className="mt-2 text-[11px] text-amber-100/40">{note}</p>}

      {/* Composer */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about this chart…"
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/40 focus:outline-none"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setErr(null); setNote(null); }}
            title="Clear conversation"
            className="rounded-xl border border-white/15 px-3 py-2.5 text-sm text-amber-100/50 hover:text-amber-100"
          >
            ⟲
          </button>
        )}
      </div>
    </div>
  );
}
