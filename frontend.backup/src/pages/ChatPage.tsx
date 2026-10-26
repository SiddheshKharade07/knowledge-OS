import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useRagQuery } from '../hooks/useRagQuery';
import { ChatComposer } from '../components/chat/ChatComposer';
import type { ChatMessage } from '../components/chat/MessageBubble';
import { MessageBubble } from '../components/chat/MessageBubble';
import { EmptyState } from '../components/ui/EmptyState';

const SUGGESTED_QUESTIONS = [
  'How many days per week can I work remotely?',
  'What is the monthly equipment budget?',
  'What happens on my first day?',
];

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const rag = useRagQuery();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function ask(query: string) {
    const trimmed = query.trim();
    if (!trimmed || rag.isPending) return;

    lastQueryRef.current = trimmed;
    const userMessage: ChatMessage = { id: nextMessageId(), role: 'user', content: trimmed };
    const pendingId = nextMessageId();
    setMessages((current) => [
      ...current,
      userMessage,
      { id: pendingId, role: 'assistant', content: '' },
    ]);
    setInput('');

    rag.mutate(
      { query: trimmed },
      {
        onSuccess: (response) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    content: response.answer,
                    citations: response.citations,
                  }
                : message,
            ),
          );
        },
        onError: (error) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    content:
                      error instanceof Error
                        ? error.message
                        : 'Unknown error while generating the answer.',
                    error: true,
                  }
                : message,
            ),
          );
        },
      },
    );
  }

  function retryLast() {
    if (lastQueryRef.current !== null) {
      setMessages((current) => {
        const withoutFailed = [...current];
        for (let i = withoutFailed.length - 1; i >= 0; i -= 1) {
          if (withoutFailed[i].role === 'user') break;
          withoutFailed.splice(i, 1);
        }
        return withoutFailed;
      });
      ask(lastQueryRef.current);
    }
  }

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Sparkles aria-hidden="true" className="h-6 w-6 text-indigo-300" />
          RAG Chat
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Grounded answers over your indexed documents, with citations back to source chunks.
        </p>
      </header>

      <div
        className="panel flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-label="Conversation"
      >
        <div aria-live="polite" aria-atomic="false" className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Ask your knowledge base anything"
              description="Answers are generated only from your ingested documents and always cite their sources."
            />
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                pending={rag.isPending && index === messages.length - 1 && message.role === 'assistant'}
                onRetry={message.error ? retryLast : undefined}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && !rag.isPending && (
          <div className="border-t border-white/10 px-5 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => ask(question)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/40 hover:bg-indigo-400/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 p-3">
          <ChatComposer value={input} isPending={rag.isPending} onChange={setInput} onSubmit={() => ask(input)} />
          <p className="mt-2 px-1 text-[11px] text-slate-600">
            Enter to send · Shift+Enter for a new line · answers include clickable citations
          </p>
        </div>
      </div>
    </div>
  );
}
