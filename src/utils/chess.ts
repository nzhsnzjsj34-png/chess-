import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from 'chess.js';
import type {
  EngineLine,
  EngineSearchResult,
  GameStateInfo,
  Grade,
  LessonChapter,
  LessonFrame,
  MoveFeedback,
} from '../types';

export const START_FEN = new Chess().fen();

export function createChess(fen = START_FEN): Chess {
  return new Chess(fen);
}

export function positionKey(fen: string): string {
  // Ignore half-move clock and full-move number so transpositions match.
  return fen.split(' ').slice(0, 4).join(' ');
}

export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function getPlyCount(fen: string): number {
  const parts = fen.split(' ');
  const fullMove = Number.parseInt(parts[5] ?? '1', 10) || 1;
  return (fullMove - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}

export function uciToMove(uci: string): {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
} {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

export function moveToUci(move: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = createChess(fen);
    const move = chess.move(uciToMove(uci));
    return move.san;
  } catch {
    return null;
  }
}

export function pvToSan(fen: string, pv: string[]): string[] {
  const chess = createChess(fen);
  const result: string[] = [];
  for (const uci of pv) {
    try {
      result.push(chess.move(uciToMove(uci)).san);
    } catch {
      break;
    }
  }
  return result;
}

export function lineScore(line: EngineLine | undefined): number {
  if (!line) return 0;
  if (Number.isFinite(line.mate) && line.mate !== undefined) {
    const distance = Math.abs(line.mate);
    return line.mate > 0 ? 2500 - distance * 20 : -2500 + distance * 20;
  }
  return line.scoreCp ?? 0;
}

export function scoreForWhite(result: EngineSearchResult): number {
  const raw = lineScore(result.lines[0]);
  return result.sideToMove === 'w' ? raw : -raw;
}

export function mateForWhite(result: EngineSearchResult): number | undefined {
  const raw = result.lines[0]?.mate;
  if (raw === undefined) return undefined;
  return result.sideToMove === 'w' ? raw : -raw;
}

export function formatScore(whiteCp: number, whiteMate?: number): string {
  if (whiteMate !== undefined && whiteMate !== 0) {
    return `M${Math.abs(whiteMate)}`;
  }
  const pawns = Math.abs(whiteCp) / 100;
  const sign = whiteCp > 0 ? '+' : whiteCp < 0 ? '−' : '';
  return `${sign}${pawns.toFixed(2)}`;
}

export function evaluationPercent(whiteCp: number, whiteMate?: number): number {
  if (whiteMate) return whiteMate > 0 ? 100 : 0;
  return 100 / (1 + Math.exp(-whiteCp / 350));
}

export function formatEvaluationLabel(whiteCp: number, whiteMate?: number): string {
  if (whiteMate) return whiteMate > 0 ? 'White is mating' : 'Black is mating';
  const cp = Math.abs(whiteCp);
  if (cp < 25) return 'Balanced position';
  if (cp < 70) return `${whiteCp > 0 ? 'White' : 'Black'} is slightly better`;
  if (cp < 180) return `${whiteCp > 0 ? 'White' : 'Black'} has an edge`;
  if (cp < 450) return `${whiteCp > 0 ? 'White' : 'Black'} is clearly better`;
  return `${whiteCp > 0 ? 'White' : 'Black'} is winning`;
}

function gradeFromLoss(loss: number, gain: number): { grade: Grade; title: string } {
  if (gain >= 110) return { grade: 'excellent', title: 'Excellent move' };
  if (loss < 45) return { grade: 'good', title: 'Good move' };
  if (loss < 100) return { grade: 'inaccuracy', title: 'Inaccuracy' };
  if (loss < 220) return { grade: 'mistake', title: 'Mistake' };
  return { grade: 'blunder', title: 'Blunder' };
}

export function classifyMove(args: {
  before: EngineSearchResult | null;
  after: EngineSearchResult | null;
  beforeFen: string;
  playerColor: Color;
  playedSan: string;
  isBook?: boolean;
}): MoveFeedback {
  const { before, after, beforeFen, playerColor, playedSan, isBook } = args;
  const bestUci = before?.lines[0]?.pv[0] ?? before?.bestMove;
  const bestMoveSan = bestUci ? uciToSan(beforeFen, bestUci) ?? undefined : undefined;

  if (!before?.lines.length || !after?.lines.length) {
    return {
      grade: 'unknown',
      title: isBook ? 'London book move' : 'Move played',
      message: isBook
        ? `${playedSan} follows the guided London line. Keep the setup moves in view.`
        : `${playedSan} was legal. Enable live analysis to compare it with Stockfish.`,
      bestMoveSan,
      playedSan,
      tone: isBook ? 'positive' : 'neutral',
    };
  }

  const beforeSign = before.sideToMove === playerColor ? 1 : -1;
  const afterSign = after.sideToMove === playerColor ? 1 : -1;
  const beforeForPlayer = lineScore(before.lines[0]) * beforeSign;
  const afterForPlayer = lineScore(after.lines[0]) * afterSign;
  const swing = beforeForPlayer - afterForPlayer;
  const loss = Math.max(0, swing);
  const gain = Math.max(0, -swing);
  const { grade, title } = gradeFromLoss(loss, gain);

  if (isBook && loss < 100) {
    return {
      grade: 'book',
      title: 'London book move',
      message: `${playedSan} keeps the position inside your opening book. The plan remains d4 + e3 + c3 with control of e5.`,
      cpLoss: Math.round(loss),
      bestMoveSan,
      playedSan,
      tone: 'positive',
    };
  }

  if (loss >= 120 && bestMoveSan && bestMoveSan !== playedSan) {
    return {
      grade,
      title,
      message: `${playedSan} gave away about ${Math.round(loss)} centipawns. Stockfish preferred ${bestMoveSan}; look for the tactical resource you missed.`,
      cpLoss: Math.round(loss),
      bestMoveSan,
      playedSan,
      tone: loss >= 220 ? 'danger' : 'warning',
    };
  }

  if (gain >= 90) {
    return {
      grade: 'excellent',
      title: 'Strong move',
      message: `${playedSan} improved your position by roughly ${Math.round(gain)} centipawns. This is the kind of concrete move that punishes a passive setup.`,
      cpLoss: -Math.round(gain),
      bestMoveSan,
      playedSan,
      tone: 'positive',
    };
  }

  return {
    grade,
    title,
    message:
      loss < 45
        ? `${playedSan} is sound. Continue with the London plan: finish development, hold d4, and watch e5.`
        : `${playedSan} costs around ${Math.round(loss)} centipawns. Recenter your pieces and ask what changed on e5, c4, or d4.`,
    cpLoss: Math.round(loss),
    bestMoveSan,
    playedSan,
    tone: loss >= 220 ? 'danger' : loss >= 100 ? 'warning' : 'neutral',
  };
}

export function getGameStateInfo(fen: string): GameStateInfo {
  const chess = createChess(fen);
  const inCheck = chess.isCheck();
  const kingSquare = inCheck
    ? chess.findPiece({ type: 'k', color: chess.turn() })[0]
    : undefined;
  const base = { inCheck, checkSquare: kingSquare };

  if (chess.isCheckmate()) {
    const winner: Color = chess.turn() === 'w' ? 'b' : 'w';
    return {
      ...base,
      over: true,
      winner,
      title: `${winner === 'w' ? 'White' : 'Black'} wins`,
      detail: 'Checkmate',
      reason: 'checkmate',
    };
  }
  if (chess.isStalemate()) {
    return {
      ...base,
      over: true,
      winner: 'draw',
      title: 'Draw',
      detail: 'Stalemate — no legal move and no check',
      reason: 'stalemate',
    };
  }
  if (chess.isThreefoldRepetition()) {
    return {
      ...base,
      over: true,
      winner: 'draw',
      title: 'Draw',
      detail: 'Threefold repetition',
      reason: 'repetition',
    };
  }
  if (chess.isDrawByFiftyMoves()) {
    return {
      ...base,
      over: true,
      winner: 'draw',
      title: 'Draw',
      detail: 'Fifty-move rule',
      reason: 'fifty-move',
    };
  }
  if (chess.isInsufficientMaterial()) {
    return {
      ...base,
      over: true,
      winner: 'draw',
      title: 'Draw',
      detail: 'Insufficient material',
      reason: 'insufficient-material',
    };
  }
  if (chess.isDraw()) {
    return {
      ...base,
      over: true,
      winner: 'draw',
      title: 'Draw',
      detail: 'Position is drawn',
      reason: 'draw',
    };
  }
  return {
    ...base,
    over: false,
    title: inCheck ? 'Check!' : `${chess.turn() === 'w' ? 'White' : 'Black'} to move`,
    detail: inCheck ? 'The king must be defended' : 'Game in progress',
  };
}

export function lessonToFrames(chapter: LessonChapter): LessonFrame[] {
  const chess = createChess();
  const positions: string[] = [chess.fen()];
  const sans: string[] = [];

  for (const uci of chapter.moves) {
    const move = chess.move(uciToMove(uci));
    positions.push(chess.fen());
    sans.push(move.san);
  }

  return chapter.steps.map((step, index) => {
    const fen = positions[step.moveIndex + 1] ?? positions[0];
    return {
      index,
      step,
      fen,
      san: step.moveIndex >= 0 ? sans[step.moveIndex] : null,
      moveNumber: Math.floor(Math.max(0, step.moveIndex) / 2) + 1,
      sideToMove: sideToMove(fen),
    };
  });
}

export function getPhase(fen: string): 'opening' | 'middlegame' | 'endgame' {
  const chess = createChess(fen);
  const values: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };
  let material = 0;
  for (const row of chess.board()) {
    for (const square of row) {
      if (square) material += values[square.type];
    }
  }
  const ply = getPlyCount(fen);
  if (ply < 18 && material > 55) return 'opening';
  if (material <= 24) return 'endgame';
  return 'middlegame';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
