import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  FileText,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { LoadPositionResult } from '../hooks/useLondonGame';
import type { GameStateInfo, MoveRecord, PlayerColor } from '../types';
import { copyText, downloadText } from '../utils/chess';
import {
  Badge,
  Button,
  Panel,
  SectionHeading,
  Stat,
  cx,
} from './ui';
import { MoveList } from './MoveList';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ReviewSidebar({
  moves,
  fen,
  pgn,
  status,
  sessionColor,
  reviewMode,
  activeMoveIndex,
  onSelectMove,
  onReturnLive,
  onLoadPosition,
}: {
  moves: MoveRecord[];
  fen: string;
  pgn: string;
  status: GameStateInfo;
  sessionColor: PlayerColor;
  reviewMode: boolean;
  activeMoveIndex: number | null;
  onSelectMove: (index: number) => void;
  onReturnLive: () => void;
  onLoadPosition: (input: string) => LoadPositionResult;
}) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const summary = useMemo(() => {
    const playerMoves = moves.filter((move) => move.color === sessionColor);
    const graded = playerMoves.filter((move) => move.feedback?.cpLoss !== undefined);
    const averageLoss =
      graded.reduce((sum, move) => sum + Math.max(0, move.feedback?.cpLoss ?? 0), 0) /
      Math.max(1, graded.length);
    return {
      total: moves.length,
      player: playerMoves.length,
      book: playerMoves.filter((move) => move.isBook).length,
      blunders: playerMoves.filter((move) => move.feedback?.grade === 'blunder').length,
      mistakes: playerMoves.filter((move) => move.feedback?.grade === 'mistake').length,
      accuracy: graded.length ? clamp(100 - averageLoss / 8, 0, 100) : null,
    };
  }, [moves, sessionColor]);

  const handleLoad = () => {
    const result = onLoadPosition(input);
    setMessage({ text: result.ok ? 'Position imported successfully.' : result.message, ok: result.ok });
    if (result.ok) setInput('');
  };

  const handleCopy = async (value: string, label: string) => {
    const ok = await copyText(value);
    setMessage({ text: ok ? `${label} copied to clipboard.` : `Could not copy ${label}.`, ok });
  };

  return (
    <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <Panel className="p-3.5">
        <SectionHeading
          icon={Activity}
          title="Game review"
          subtitle={status.over ? `${status.title} · ${status.detail}` : status.detail}
          action={<Badge tone={status.over ? 'gold' : 'mint'}>{status.over ? 'Finished' : 'Live'}</Badge>}
        />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Moves" value={summary.total} hint={`${summary.player} by you`} />
          <Stat
            label="Accuracy"
            value={summary.accuracy === null ? '—' : `${summary.accuracy.toFixed(0)}%`}
            hint={summary.accuracy === null ? 'Needs graded moves' : 'Estimated from centipawn loss'}
          />
          <Stat label="Book moves" value={summary.book} hint="London theory" />
          <Stat
            label="Errors"
            value={summary.blunders + summary.mistakes}
            hint={`${summary.blunders} blunders · ${summary.mistakes} mistakes`}
          />
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading
          icon={FileText}
          title="Move history"
          subtitle="Click a move to inspect that position."
          action={
            reviewMode ? (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReturnLive}>
                Live
              </Button>
            ) : null
          }
        />
        <MoveList
          moves={moves}
          activeMoveIndex={activeMoveIndex}
          onSelectMove={onSelectMove}
          showLan
          compact={false}
        />
        {reviewMode ? (
          <button
            type="button"
            onClick={onReturnLive}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-300/6 py-2 text-[0.7rem] font-bold text-amber-100 hover:bg-amber-300/10"
          >
            Return to live position <ArrowUpRight className="h-3 w-3" />
          </button>
        ) : null}
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading icon={Upload} title="Import FEN / PGN" subtitle="Parse a position or a complete game with chess.js." />
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder="Paste a FEN or PGN here…"
          className="input-surface scrollbar-thin resize-none px-3 py-2 font-mono text-[0.68rem] leading-snug"
        />
        <Button variant="primary" size="sm" icon={ClipboardPaste} className="mt-2 w-full" onClick={handleLoad}>
          Load position
        </Button>
        {message ? (
          <div
            className={cx(
              'mt-2 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-[0.67rem]',
              message.ok
                ? 'border-emerald-300/20 bg-emerald-300/6 text-emerald-200'
                : 'border-rose-300/20 bg-rose-300/6 text-rose-200',
            )}
          >
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{message.text}</span>
          </div>
        ) : null}
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading icon={Download} title="Export & share" subtitle="Copy or save the current game state." />
        <div className="rounded-xl border border-white/7 bg-black/20 p-2.5">
          <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">FEN</div>
          <div className="break-all font-mono text-[0.62rem] leading-relaxed text-slate-400">{fen}</div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" icon={Copy} onClick={() => void handleCopy(fen, 'FEN')}>
            Copy FEN
          </Button>
          <Button variant="secondary" size="sm" icon={Copy} onClick={() => void handleCopy(pgn, 'PGN')}>
            Copy PGN
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          className="mt-2 w-full"
          onClick={() => downloadText('london-lab-game.pgn', pgn || fen, 'application/x-chess-pgn')}
        >
          Download PGN
        </Button>
      </Panel>
    </div>
  );
}
