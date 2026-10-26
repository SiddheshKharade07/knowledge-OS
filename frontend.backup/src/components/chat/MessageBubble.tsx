import { AlertTriangle, RotateCcw, Sparkles, User } from 'lucide-react';
import type { Citation } from '../../api/types';
import { cn } from '../../lib/cn';
import { CitationChips } from './CitationChips';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  error?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
  pending?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, pending = false, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3 animate-fade-in-up', isUser && 'flex-row-reverse')}>
      <div
        aria-hidden="true"
        className={cn(
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          isUser
            ? 'border-white/10 bg-white/[0.06] text-slate-300'
            : 'border-indigo-400/30 bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 text-indigo-200',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className={cn('max-w-[85%] min-w-0', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block max-w-full rounded-xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'bg-indigo-500/90 text-white shadow-lg shadow-indigo-950/40'
              : message.error
                ? 'border border-rose-400/30 bg-rose-500/10 text-rose-200'
                : 'border border-white/10 bg-white/[0.04] text-slate-200',
          )}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
              Thinking…
            </span>
          ) : (
            message.content
          )}
        </div>

        {message.error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary mt-2 !border-rose-300/30 !py-1 !text-xs !text-rose-200 hover:!bg-rose-500/10"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Retry question
          </button>
        )}

        {!isUser && !message.error && !pending && message.citations && (
          <CitationChips citations={message.citations} />
        )}

        {message.error && (
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-300/70">
            <AlertTriangle aria-hidden="true" className="h-3 w-3" />
            The request failed — nothing was fabricated.
          </p>
        )}
      </div>
    </div>
  );
}
