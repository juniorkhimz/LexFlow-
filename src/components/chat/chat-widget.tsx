import * as React from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSendChatMessage, type ChatMessage } from "@/lib/queries/chat";

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const sendMessage = useSendChatMessage();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;
    setError(null);
    setDraft("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    try {
      const reply = await sendMessage.mutateAsync(nextMessages);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-lg border border-ink-200 bg-surface-raised shadow-xl md:right-6">
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass-500" />
              <span className="text-sm font-medium text-ink-900">LexFlow Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-800" aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="mt-6 text-center text-sm text-ink-400">
                Ask me about using LexFlow, drafting help, or general legal-process questions. I don't have access
                to this firm's case data.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "ml-auto bg-nav-bg text-white" : "bg-ink-50 text-ink-800",
                )}
              >
                {m.text}
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="max-w-[85%] rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-400">Thinking…</div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="flex gap-2 border-t border-ink-100 p-3">
            <textarea
              className="h-10 flex-1 resize-none rounded-md border border-ink-200 bg-surface-raised px-3 py-2 text-sm"
              placeholder="Ask a question…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button size="icon" onClick={send} disabled={!draft.trim() || sendMessage.isPending} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-nav-bg text-white shadow-lg hover:bg-nav-active md:right-6"
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  );
}
