import { useMemo } from 'react';
import { BookOpen, CircleHelp, Sparkles } from 'lucide-react';
import type { Grade, MoveRecord } from '../types';
import { Badge, cx } from './ui';

interface ListedMove {
  record: MoveRecord;
  index: number;
}

interface MoveRow {
  number: number;
  white?: ListedMove;
  black?: ListedMove;
}

const GRADE_MARK: Record<Grade, string> = {
  book: 'B',
  excellent: '!!',
  good: '✓',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
  unknown: '·',
};

const GRADE_TONE: Record<Grade, 'gold' | 'mint' | 'sky' | 'rose' | 'neutral'> = {
  book: 'gold',
  excellent: 'mint',
  good: 'mint',
  inaccuracy: 'sky',
  mistake: 'rose',
  blunder: 'rose',
  unknown: 'neutral',
};

function GradeIcon({ grade }: { grade: Grade }) {
  if (grade === 'book') return <BookOpen className="h-3 w-3" />;
  if (grade === 'excellent') return <Sparkles className="h-3 w-3" />;
  if (grade === 'unknown') return <CircleHelp className="h-3 w-3" />;
  return <span className="font-mono text-[0.62rem] font-black">{GRADE_MARK[grade]}</span>;
}

export function MoveList({
  moves,
  activeMoveIndex,
  onSelectMove,
  showLan = true,
  compact = false,
  className,
}: {
  moves: MoveRecord[];
  activeMoveIndex?: number | null;
  onSelectMove?: (index: number) => void;
  showLan?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const rows = useMemo(() => {
    const result: MoveRow[] = [];
    moves.forEach((record, index) => {
      let row = result[result.length - 1];
      const needsRow =
        !row ||
        row.number !== record.number ||
        (record.color === 'w' ? Boolean(row.white) : Boolean(row.black));
      if (needsRow) {
        row = { number: record.number };
        result.push(row);
      }
      if (record.color === 'w') row.white = { record, index };
      else row.black = { record, index };
    });
    return result;
  }, [moves]);

  if (moves.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-7 text-center text-xs text-slate-500">
        No moves yet. Make a move on the board to start the game.
      </div>
    );
  }

  return (
    <div className={cx('overflow-hidden rounded-xl border border-white/8', className)}>
      <div className="grid grid-cols-[2.3rem_1fr_1fr] bg-white/4 px-2 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>
      <div className={cx('scrollbar-thin divide-y divide-white/5', compact ? 'max-h-64' : 'max-h-96', 'overflow-y-auto')}>
        {rows.map((row, rowIndex) => (
          <div
            key={`${row.number}-${rowIndex}`}
            className="grid grid-cols-[2.3rem_1fr_1fr] items-stretch px-1 py-0.5"
          >
            <div className="flex items-center justify-center font-mono text-[0.68rem] text-slate-500">
              {row.number}.
            </div>
            {(['white', 'black'] as const).map((side) => {
              const entry = row[side];
              if (!entry) return <div key={side} />;
              const { record, index } = entry;
              const grade = record.feedback?.grade;
              const active = activeMoveIndex === index;
              return (
                <button
                  key={`${record.san}-${index}`}
                  type="button"
                  onClick={() => onSelectMove?.(index)}
                  title={`${record.san} · ${record.lan}${record.feedback ? ` · ${record.feedback.title}` : ''}`}
                  className={cx(
                    'group mx-0.5 flex min-w-0 items-center justify-between gap-1 rounded-lg px-1.5 py-1 text-left transition',
                    active ? 'bg-amber-300/14 ring-1 ring-amber-300/30' : 'hover:bg-white/5',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[0.75rem] font-semibold text-slate-100">
                      {record.san}
                    </span>
                    {showLan ? (
                      <span className="block truncate font-mono text-[0.6rem] text-slate-500">
                        {record.lan}
                      </span>
                    ) : null}
                  </span>
                  {grade ? (
                    <Badge tone={GRADE_TONE[grade]} className="h-5 min-w-5 justify-center px-1">
                      <GradeIcon grade={grade} />
                    </Badge>
                  ) : record.isBook ? (
                    <Badge tone="gold" className="h-5 min-w-5 justify-center px-1">
                      <BookOpen className="h-3 w-3" />
                    </Badge>
                  ) : record.isDeviation ? (
                    <Badge tone="rose" className="h-5 min-w-5 justify-center px-1">
                      ?!
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
