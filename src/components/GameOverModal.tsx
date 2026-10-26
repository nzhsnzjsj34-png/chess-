import { createPortal } from 'react-dom';
import { Activity, Crown, Handshake, RotateCcw, Sparkles, X } from 'lucide-react';
import type { GameStateInfo, MoveRecord, PlayerColor } from '../types';
import { Badge, Button, Stat, cx } from './ui';

export function GameOverModal({
  status,
  moves,
  sessionColor,
  onClose,
  onNewGame,
  onReview,
}: {
  status: GameStateInfo;
  moves: MoveRecord[];
  sessionColor: PlayerColor;
  onClose: () => void;
  onNewGame: () => void;
  onReview: () => void;
}) {
  if (!status.over) return null;

  const playerMoves = moves.filter((move) => move.color === sessionColor);
  const blunders = playerMoves.filter((move) =>
    ['blunder', 'mistake'].includes(move.feedback?.grade ?? ''),
  ).length;
  const bookMoves = playerMoves.filter((move) => move.isBook).length;
  const won = status.winner === sessionColor;
  const draw = status.winner === 'draw';
  const ResultIcon = draw ? Handshake : won ? Crown : Activity;
  const accent = draw
    ? 'from-sky-300/20 to-sky-700/5 text-sky-200 border-sky-300/25'
    : won
      ? 'from-amber-300/25 to-amber-700/5 text-amber-200 border-amber-300/30'
      : 'from-rose-300/20 to-rose-700/5 text-rose-200 border-rose-300/25';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md">
      <div className="fade-rise relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d1525] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-300/8 blur-3xl" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close result"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative text-center">
          <div className={cx('mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-gradient-to-br', accent)}>
            <ResultIcon className="h-8 w-8" />
          </div>
          <div className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.22em] text-slate-500">
            Game finished
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">{status.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{status.detail}</p>
          <div className="mt-3 flex justify-center">
            <Badge tone={draw ? 'sky' : won ? 'gold' : 'rose'}>
              <Sparkles className="h-3 w-3" />
              {draw ? 'A hard-fought draw' : won ? 'You converted the plan' : 'Review the critical moments'}
            </Badge>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Stat label="Moves" value={moves.length} />
          <Stat label="Book" value={bookMoves} hint="theory moves" />
          <Stat label="Errors" value={blunders} hint="mistakes+" />
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" icon={Activity} onClick={onReview}>
            Review game
          </Button>
          <Button variant="primary" size="lg" icon={RotateCcw} onClick={onNewGame}>
            Play again
          </Button>
        </div>
        <p className="relative mt-3 text-center text-[0.66rem] text-slate-600">
          Tip: open Review and click moves to compare your plan with Stockfish’s evaluation.
        </p>
      </div>
    </div>,
    document.body,
  );
}
