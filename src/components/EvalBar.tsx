import { LoaderCircle } from 'lucide-react';
import { evaluationPercent, formatEvaluationLabel, formatScore } from '../utils/chess';
import { cx } from './ui';

export function EvalBar({
  whiteScore,
  whiteMate,
  orientation,
  analyzing,
  className,
  compact = false,
}: {
  whiteScore: number;
  whiteMate?: number;
  orientation: 'white' | 'black';
  analyzing?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const percent = evaluationPercent(whiteScore, whiteMate);
  const whiteAtTop = orientation === 'white';
  const score = formatScore(whiteScore, whiteMate);
  const label = formatEvaluationLabel(whiteScore, whiteMate);

  return (
    <div
      className={cx('flex items-stretch gap-1.5', className)}
      title={`${label} (${score})`}
      aria-label={`Evaluation: ${label}, ${score}`}
    >
      <div className={cx('flex flex-col items-center justify-between', compact ? 'py-0' : 'py-1')}>
        <span className="font-mono text-[0.62rem] font-bold text-slate-100">
          {whiteAtTop ? 'W' : 'B'}
        </span>
        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          <div className="eval-bar h-full" style={{ width: compact ? '0.72rem' : '1rem' }}>
            <div
              className={cx('eval-fill', whiteAtTop ? 'white-top' : 'white-bottom')}
              style={{ height: `${percent}%` }}
            />
            <div
              className="absolute left-1/2 z-10 h-0.5 w-3 -translate-x-1/2 bg-slate-950/50"
              style={{ top: `${100 - percent}%` }}
            />
          </div>
        </div>
        <span className="font-mono text-[0.62rem] font-bold text-slate-500">
          {whiteAtTop ? 'B' : 'W'}
        </span>
      </div>
      {!compact ? (
        <div className="flex w-11 flex-col items-center justify-center">
          <div
            className={cx(
              'rounded-lg border px-1 py-2 text-center font-mono text-[0.65rem] font-bold',
              whiteScore > 20
                ? 'border-slate-100/20 bg-slate-100/10 text-slate-100'
                : whiteScore < -20
                  ? 'border-slate-900/40 bg-slate-950/20 text-slate-400'
                  : 'border-white/10 bg-white/5 text-slate-300',
            )}
          >
            {analyzing ? (
              <LoaderCircle className="mx-auto h-3.5 w-3.5 animate-spin text-amber-300" />
            ) : (
              score
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
