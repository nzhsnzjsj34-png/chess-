import { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GraduationCap,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import type { LessonChapter, LessonFrame } from '../types';
import {
  Badge,
  Button,
  Panel,
  ProgressBar,
  SectionHeading,
  TextInput,
  cx,
} from './ui';

export function LessonSidebar({
  chapters,
  activeId,
  onSelect,
}: {
  chapters: LessonChapter[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter((chapter) =>
      [chapter.title, chapter.subtitle, chapter.family, chapter.summary]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [chapters, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Panel className="p-3.5">
        <SectionHeading
          icon={GraduationCap}
          title="Learning hub"
          subtitle="Eight guided London System chapters."
          action={<Badge tone="gold">{chapters.length} lines</Badge>}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search variations…"
            className="pl-9"
          />
        </div>
      </Panel>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {filtered.map((chapter) => {
          const active = chapter.id === activeId;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onSelect(chapter.id)}
              className={cx(
                'group relative overflow-hidden rounded-2xl border p-3 text-left transition',
                active
                  ? 'border-amber-300/35 bg-amber-300/8 shadow-lg shadow-amber-900/10'
                  : 'border-white/7 bg-white/2 hover:border-white/15 hover:bg-white/5',
              )}
            >
              <span
                className="absolute inset-y-3 left-0 w-0.5 rounded-full"
                style={{ background: chapter.accent }}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[0.82rem] font-bold text-slate-100">
                    {chapter.title}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[0.68rem] text-slate-500">
                    {chapter.subtitle}
                  </div>
                </div>
                <Badge tone={active ? 'gold' : 'neutral'}>{chapter.level}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-[0.7rem] leading-snug text-slate-400">
                {chapter.summary}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[0.64rem] font-semibold text-slate-500">{chapter.family}</span>
                <span className="text-[0.64rem] font-semibold text-slate-500">
                  {chapter.steps.length} key ideas
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">
            No chapter matches “{query}”.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LessonPanel({
  chapter,
  frames,
  frame,
  stepIndex,
  onStepSelect,
  onPractice,
}: {
  chapter: LessonChapter;
  frames: LessonFrame[];
  frame: LessonFrame;
  stepIndex: number;
  onStepSelect: (index: number) => void;
  onPractice: (frame: LessonFrame) => void;
}) {
  return (
    <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <Panel className="p-3.5">
        <SectionHeading
          icon={BookOpen}
          title={chapter.title}
          subtitle={chapter.family}
          action={<Badge tone="gold">{`${stepIndex + 1}/${frames.length}`}</Badge>}
        />
        <p className="text-[0.75rem] leading-relaxed text-slate-300">{chapter.summary}</p>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-300/15 bg-sky-300/5 p-2.5">
          <Target className="mt-0.5 h-3.8 w-3.8 shrink-0 text-sky-300" />
          <div>
            <div className="text-[0.68rem] font-bold uppercase tracking-wider text-sky-200">
              Objective
            </div>
            <div className="mt-0.5 text-[0.7rem] leading-snug text-slate-300">
              {chapter.objective}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading icon={Sparkles} title="Guided steps" subtitle="Select a key position." />
        <div className="space-y-1.5">
          {frames.map((item) => {
            const active = item.index === stepIndex;
            return (
              <button
                key={`${chapter.id}-${item.index}`}
                type="button"
                onClick={() => onStepSelect(item.index)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? 'border-amber-300/35 bg-amber-300/8'
                    : 'border-white/6 bg-white/2 hover:border-white/14 hover:bg-white/5',
                )}
              >
                <span
                  className={cx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[0.64rem] font-bold',
                    active ? 'bg-amber-300 text-slate-900' : 'bg-white/5 text-slate-500',
                  )}
                >
                  {item.index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.74rem] font-bold text-slate-200">
                    {item.step.title}
                  </span>
                  <span className="block truncate text-[0.65rem] text-slate-500">
                    {item.san ? `${item.moveNumber}${item.sideToMove === 'b' ? '.' : '...'} ${item.san}` : 'Starting idea'}
                  </span>
                </span>
                {active ? <CircleDot className="h-3.5 w-3.5 text-amber-300" /> : null}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
            <span className="font-mono text-xs font-black">{stepIndex + 1}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{frame.step.title}</div>
            <div className="font-mono text-[0.68rem] text-amber-200">
              {frame.san ? `Move ${frame.moveNumber} · ${frame.san}` : 'Initial position'}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[0.79rem] leading-relaxed text-slate-300">
          {frame.step.explanation}
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/5 p-2.5">
          <Lightbulb className="mt-0.5 h-3.8 w-3.8 shrink-0 text-amber-300" />
          <p className="text-[0.72rem] leading-snug text-amber-50/90">{frame.step.tip}</p>
        </div>
        {frame.step.highlights.length > 0 ? (
          <div className="mt-3">
            <div className="mb-1.5 text-[0.64rem] font-bold uppercase tracking-wider text-slate-500">
              Key squares
            </div>
            <div className="flex flex-wrap gap-1">
              {frame.step.highlights.map((square) => (
                <Badge key={square} tone="sky">{square}</Badge>
              ))}
            </div>
          </div>
        ) : null}
        <Button
          variant="primary"
          size="md"
          icon={Swords}
          className="mt-4 w-full"
          onClick={() => onPractice(frame)}
        >
          Practice this position
        </Button>
      </Panel>
    </div>
  );
}

export function LessonControls({
  frame,
  stepIndex,
  total,
  playing,
  onPrevious,
  onNext,
  onTogglePlay,
  onRestart,
}: {
  frame: LessonFrame;
  stepIndex: number;
  total: number;
  playing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onRestart: () => void;
}) {
  const progress = ((stepIndex + 1) / Math.max(1, total)) * 100;
  return (
    <Panel className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={onRestart}
          title="Restart lesson"
        />
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          onClick={onPrevious}
          disabled={stepIndex === 0}
          title="Previous step"
        />
        <Button
          variant={playing ? 'danger' : 'primary'}
          size="sm"
          icon={playing ? Pause : Play}
          onClick={onTogglePlay}
          disabled={!playing && stepIndex >= total - 1}
        >
          {playing ? 'Pause' : 'Play line'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          onClick={onNext}
          disabled={stepIndex >= total - 1}
          title="Next step"
        />
        <div className="ml-auto min-w-[160px] flex-1 sm:max-w-[260px]">
          <div className="mb-1 flex items-center justify-between text-[0.65rem] font-semibold text-slate-500">
            <span>Step {stepIndex + 1} / {total}</span>
            <span className="font-mono text-amber-200">{frame.san ?? 'Start'}</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>
    </Panel>
  );
}
