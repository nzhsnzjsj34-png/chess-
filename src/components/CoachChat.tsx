import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bot,
  Circle,
  MessageSquareText,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ChatMessage, CoachContext } from '../types';
import {
  formatScore,
  getPhase,
  mateForWhite,
  scoreForWhite,
} from '../utils/chess';
import { Badge, Button, Panel, RichText, SectionHeading, cx } from './ui';

const QUICK_PROMPTS = [
  "What's the plan here?",
  'Why was the last move played?',
  'How do I meet ...c5?',
  'Explain the Ne5 attack.',
];

export function CoachChat({
  messages,
  isTyping,
  context,
  agentStyle,
  onSend,
  onClear,
  className,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  context: CoachContext;
  agentStyle: string;
  onSend: (text: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiConnected = Boolean(import.meta.env.VITE_COACH_API_URL);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const chips = useMemo(() => {
    const result = [
      { label: 'Phase', value: getPhase(context.fen) },
      { label: 'Mode', value: context.openingMode === 'off' ? 'Free' : 'London book' },
    ];
    if (context.lastMoveSan) result.push({ label: 'Last', value: context.lastMoveSan });
    if (context.evaluation?.lines.length) {
      const whiteCp = scoreForWhite(context.evaluation);
      const mate = mateForWhite(context.evaluation);
      result.push({ label: 'Eval', value: formatScore(whiteCp, mate) });
    }
    return result;
  }, [context]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || isTyping) return;
    onSend(value);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(draft);
    }
  };

  return (
    <Panel className={cx('flex min-h-0 flex-col', className)}>
      <div className="p-3.5 pb-2">
        <SectionHeading
          icon={MessageSquareText}
          title="AI chess coach"
          subtitle={apiConnected ? 'Connected to your coach proxy.' : 'Local, context-aware coach simulation.'}
          action={
            <Button variant="ghost" size="sm" icon={Trash2} onClick={onClear} title="Clear conversation" />
          }
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={apiConnected ? 'mint' : 'gold'}>
            <Circle className={cx('h-1.5 w-1.5 fill-current', apiConnected ? 'text-emerald-300' : 'text-amber-300')} />
            {apiConnected ? 'API ready' : 'Local coach'}
          </Badge>
          <Badge tone="violet">{agentStyle}</Badge>
          {chips.map((chip) => (
            <Badge key={chip.label} tone="neutral">
              {chip.label}: <span className="capitalize text-slate-200">{chip.value}</span>
            </Badge>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-[210px] flex-1 space-y-2.5 overflow-y-auto px-3.5 py-2"
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cx('flex items-end gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {message.role === 'coach' ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Bot className="h-3.8 w-3.8" />
              </div>
            ) : null}
            <div className={cx('max-w-[85%]', message.role === 'user' ? 'text-right' : 'text-left')}>
              <div className={cx('chat-bubble', message.role)}>
                {message.pending ? (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="ml-1">Thinking</span>
                  </span>
                ) : (
                  <RichText text={message.text} />
                )}
              </div>
              <div className="mt-1 px-1 text-[0.6rem] text-slate-600">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            {message.role === 'user' ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-300/10 text-[0.62rem] font-black text-sky-200">
                YOU
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="border-t border-white/6 p-3 pt-2.5">
        <div className="scrollbar-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-[0.66rem] font-semibold text-slate-300 transition hover:border-amber-300/30 hover:bg-amber-300/8 hover:text-amber-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Ask about the plan, a move, or this position…"
            className="input-surface scrollbar-thin max-h-28 min-h-[2.8rem] resize-none px-3 py-2 text-[0.76rem] leading-snug"
          />
          <Button
            variant="primary"
            size="md"
            icon={isTyping ? Sparkles : Send}
            onClick={() => submit(draft)}
            disabled={!draft.trim() || isTyping}
            className="h-[2.8rem] px-3"
            title="Send message"
          />
        </div>
        <p className="mt-1.5 text-center text-[0.6rem] text-slate-600">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </Panel>
  );
}
