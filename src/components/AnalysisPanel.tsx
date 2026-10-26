import { useMemo } from 'react';
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Copy,
  Download,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type {
  EngineLine,
  EngineStatusSnapshot,
  GameStateInfo,
  MoveFeedback,
  EngineSearchResult,
} from '../types';
import {
  formatEvaluationLabel,
  formatScore,
  getPhase,
  getPlyCount,
  lineScore,
  pvToSan,
} from '../utils/chess';
import {
  Badge,
  Button,
  Panel,
  SectionHeading,
  Stat,
  cx,
} from './ui';

function lineWhiteScore(line: EngineLine, sideToMove: 'w' | 'b'): number {
  const raw = lineScore(line);
  return sideToMove === 'w' ? raw : -raw;
}

function lineWhiteMate(line: EngineLine, sideToMove: 'w' | 'b'): number | undefined {
  if (line.mate === undefined) return undefined;
  return sideToMove === 'w' ? line.mate : -line.mate;
}

function formatNodes(value?: number): string {
  if (!value) return '—';
  if (value > 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value > 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function EvalSparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 72;
  const padding = 5;
  const points = useMemo(() => {
    const source = values.length > 1 ? values.slice(-30) : [0, values[0] ?? 0];
    const clamped = source.map((value) => Math.max(-600, Math.min(600, value)));
    return clamped.map((value, index) => {
      const x = padding + (index / Math.max(1, clamped.length - 1)) * (width - padding * 2);
      const y = height / 2 - (value / 600) * (height / 2 - padding);
      return { x, y };
    });
  }, [values]);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const area = `${path} L${points[points.length - 1]?.x ?? width},${height / 2} L${points[0]?.x ?? 0},${height / 2} Z`;
  const last = values[values.length - 1] ?? 0;
  const stroke = last >= 0 ? '#f1f5f9' : '#334155';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y={height / 2 - 0.5} width={width} height="1" fill="rgba(148,175,214,0.14)" />
      <path d={area} fill={last >= 0 ? 'rgba(241,245,249,0.08)' : 'rgba(15,23,42,0.22)'} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {points.length > 0 ? (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.4" fill="#e9b949" />
      ) : null}
    </svg>
  );
}

const FEEDBACK_STYLES: Record<
  MoveFeedback['tone'],
  { border: string; background: string; icon: typeof CheckCircle2 }
> = {
  positive: {
    border: 'border-emerald-300/25',
    background: 'bg-emerald-300/7',
    icon: CheckCircle2,
  },
  neutral: {
    border: 'border-sky-300/20',
    background: 'bg-sky-300/6',
    icon: BrainCircuit,
  },
  warning: {
    border: 'border-amber-300/25',
    background: 'bg-amber-300/7',
    icon: Lightbulb,
  },
  danger: {
    border: 'border-rose-300/30',
    background: 'bg-rose-300/7',
    icon: TriangleAlert,
  },
};

export function AnalysisPanel({
  fen,
  analysis,
  evalHistory,
  whiteScore,
  whiteMate,
  feedback,
  status,
  engineStatus,
  analyzing,
  onAnalyze,
  onCopyFen,
  onExportPgn,
  compact = false,
}: {
  fen: string;
  analysis: EngineSearchResult | null;
  evalHistory: number[];
  whiteScore: number;
  whiteMate?: number;
  feedback: MoveFeedback | null;
  status: GameStateInfo;
  engineStatus: EngineStatusSnapshot;
  analyzing: boolean;
  onAnalyze: () => void;
  onCopyFen: () => void;
  onExportPgn: () => void;
  compact?: boolean;
}) {
  const lines = analysis?.lines.slice(0, compact ? 2 : 4) ?? [];
  const score = formatScore(whiteScore, whiteMate);
  const scoreLabel = formatEvaluationLabel(whiteScore, whiteMate);
  const phase = getPhase(fen);
  const feedbackStyle = feedback ? FEEDBACK_STYLES[feedback.tone] : null;
  const FeedbackIcon = feedbackStyle?.icon ?? Sparkles;

  return (
    <div className={cx('flex min-h-0 flex-col gap-3', compact ? '' : 'h-full')}>
      <Panel className="p-3.5">
        <SectionHeading
          icon={Activity}
          title="Live analysis"
          subtitle={engineStatus.detail}
          action={
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onAnalyze}>
              {analyzing ? 'Working' : 'Analyze'}
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Evaluation" value={score} hint={scoreLabel} />
          <Stat
            label="Search"
            value={analysis ? `Depth ${analysis.depth}` : '—'}
            hint={analysis?.fallback ? 'Static fallback' : `MultiPV ${analysis?.lines.length ?? 0}`}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[0.67rem] text-slate-500">
          <span className="capitalize">{phase} · ply {getPlyCount(fen)}</span>
          <span className={cx('flex items-center gap-1', analyzing ? 'text-amber-200' : 'text-emerald-200')}>
            {analyzing ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {analyzing ? 'Searching…' : 'Up to date'}
          </span>
        </div>
      </Panel>

      {feedback ? (
        <Panel className="p-3.5" soft>
          <div className={cx('rounded-xl border p-3', feedbackStyle?.border, feedbackStyle?.background)}>
            <div className="flex items-start gap-2">
              <FeedbackIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-white">{feedback.title}</span>
                  {feedback.cpLoss !== undefined ? (
                    <Badge tone={feedback.cpLoss > 100 ? 'rose' : 'gold'}>
                      {feedback.cpLoss >= 0 ? `−${feedback.cpLoss} cp` : `+${Math.abs(feedback.cpLoss)} cp`}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[0.73rem] leading-snug text-slate-300">{feedback.message}</p>
                {feedback.bestMoveSan ? (
                  <p className="mt-1.5 text-[0.68rem] text-slate-500">
                    Engine preference: <span className="font-mono text-amber-200">{feedback.bestMoveSan}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel className="p-3.5">
        <SectionHeading
          icon={BrainCircuit}
          title="Principal variations"
          subtitle="Stockfish lines translated into SAN."
          action={
            <Badge tone={status.inCheck ? 'rose' : 'mint'}>
              {status.inCheck ? 'Check' : status.title}
            </Badge>
          }
        />
        <div className="space-y-1.5">
          {lines.length > 0 ? (
            lines.map((line) => {
              const whiteCp = lineWhiteScore(line, analysis?.sideToMove ?? 'w');
              const mate = lineWhiteMate(line, analysis?.sideToMove ?? 'w');
              const san = pvToSan(fen, line.pv.slice(0, 8));
              return (
                <div
                  key={`${line.multipv}-${line.bestMove ?? 'line'}`}
                  className="rounded-xl border border-white/7 bg-black/15 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/6 font-mono text-[0.62rem] font-bold text-slate-400">
                      {line.multipv}
                    </span>
                    <span className={cx('font-mono text-[0.7rem] font-bold', whiteCp >= 0 ? 'text-slate-100' : 'text-slate-400')}>
                      {formatScore(whiteCp, mate)}
                    </span>
                    <span className="ml-auto font-mono text-[0.62rem] text-slate-500">
                      d{line.depth} · {formatNodes(line.nodes)}
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono text-[0.7rem] leading-relaxed text-slate-300">
                    {san.length > 0 ? san.join(' ') : 'No principal variation yet.'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-[0.72rem] text-slate-500">
              Start a game or press Analyze to see Stockfish’s top lines.
            </div>
          )}
        </div>
      </Panel>

      {!compact ? (
        <Panel className="p-3.5">
          <SectionHeading icon={Sparkles} title="Evaluation trend" subtitle="White’s score after each move." />
          <div className="rounded-xl border border-white/7 bg-black/15 p-2">
            <EvalSparkline values={evalHistory} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.65rem] text-slate-500">
            <span>Black advantage</span>
            <span>White advantage</span>
          </div>
        </Panel>
      ) : null}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" icon={Copy} onClick={onCopyFen}>
          Copy FEN
        </Button>
        <Button variant="secondary" size="sm" icon={Download} onClick={onExportPgn}>
          Save PGN
        </Button>
      </div>
    </div>
  );
}
