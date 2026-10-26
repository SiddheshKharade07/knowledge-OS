import { useEffect, useRef } from 'react';
import { SendHorizonal } from 'lucide-react';

interface ChatComposerProps {
  value: string;
  isPending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const MAX_QUERY_LENGTH = 2000;

export function ChatComposer({ value, isPending, onChange, onSubmit }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isPending) onSubmit();
    }
  }

  return (
    <form
      className="panel flex items-end gap-2 p-2"
      aria-label="Ask a question"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="chat-input" className="sr-only">
        Your question
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        maxLength={MAX_QUERY_LENGTH}
        placeholder="Ask about your documents…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <div className="flex flex-col items-end gap-1 pb-0.5">
        <button
          type="submit"
          disabled={isPending || value.trim().length === 0}
          className="btn-primary !rounded-lg !p-2.5"
          aria-label="Send question"
        >
          <SendHorizonal aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="pr-1 font-mono text-[10px] text-slate-600">
          {value.length}/{MAX_QUERY_LENGTH}
        </span>
      </div>
    </form>
  );
}
