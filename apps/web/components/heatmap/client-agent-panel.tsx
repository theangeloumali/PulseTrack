'use client';

import {useEffect, useRef, useState, type FormEvent, type KeyboardEvent} from 'react';
import {Loader2, Send, Sparkles, Wrench, X} from 'lucide-react';
import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import {cn} from '@workspace/ui/lib/utils';
import {Button} from '@workspace/ui/components/button';
import {Textarea} from '@workspace/ui/components/textarea';
import {useClientAgent} from '@/lib/hooks/useClientAgent';

const PREVIEW_LIMIT = 220;

function suggestedPrompts(clientName?: string): string[] {
  if (clientName) {
    return [
      'Who should I prioritize?',
      `What's left for ${clientName}?`,
      `Draft this month's invoice for ${clientName}`,
    ];
  }
  return [
    'Who should I prioritize?',
    "What's left for Acme Corp?",
    "Draft this month's invoice for Umbrella LLC",
  ];
}

/** Compact, human-skimmable summary of a tool call's current state. */
function toolPreview(part: ToolUIPart | DynamicToolUIPart): string | null {
  if (part.state === 'output-error') return part.errorText;
  if (part.state === 'output-available') {
    const json = JSON.stringify(part.output);
    if (!json) return null;
    return json.length > PREVIEW_LIMIT ? `${json.slice(0, PREVIEW_LIMIT)}…` : json;
  }
  return null;
}

function ToolChip({part}: {part: ToolUIPart | DynamicToolUIPart}) {
  const preview = toolPreview(part);
  const failed = part.state === 'output-error';
  const running = part.state === 'input-streaming' || part.state === 'input-available';
  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
        used {getToolName(part)}
      </span>
      {preview && (
        <pre
          className={cn(
            'max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/50 px-2 py-1.5 text-[11px] leading-relaxed',
            failed ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
          )}>
          {preview}
        </pre>
      )}
    </div>
  );
}

function MessageBubble({message}: {message: UIMessage}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-2 rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-foreground',
        )}>
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;
          if (isTextUIPart(part)) {
            return (
              <p key={key} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            );
          }
          if (isToolUIPart(part)) {
            return <ToolChip key={key} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

export interface ClientAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Active drill-down client; seeds context-aware suggestions + request body. */
  clientName?: string;
}

export function ClientAgentPanel({isOpen, onClose, clientName}: ClientAgentPanelProps) {
  const {messages, sendMessage, status, error} = useClientAgent({clientName});
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === 'submitted' || status === 'streaming';
  const isEmpty = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'});
  }, [messages, status]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  function submit(text: string) {
    if (busy) return;
    void sendMessage(text);
    setInput('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(input);
    }
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-50 bg-black/25 backdrop-blur-sm transition-opacity dark:bg-black/50',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Client Assistant"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Client Assistant</h2>
              {clientName && <p className="text-xs text-muted-foreground">Context: {clientName}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Ask about client priorities, open work, or billing. Try one of these:
              </p>
              <div className="w-full space-y-2">
                {suggestedPrompts(clientName).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {status === 'submitted' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              )}
              {status === 'error' && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {error?.message ?? 'Something went wrong. Please try again.'}
                </p>
              )}
            </>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask the client assistant…"
              rows={1}
              className="max-h-32 min-h-[40px] resize-none"
            />
            <Button type="submit" size="icon" disabled={busy || input.trim().length === 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
