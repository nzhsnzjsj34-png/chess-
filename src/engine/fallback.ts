import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { EngineSearchResult } from '../types';
import { createChess, moveToUci, sideToMove } from '../utils/chess';

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const STRONG_SQUARES: Record<string, number> = {
  d4: 14,
  e4: 14,
  d5: 14,
  e5: 14,
  c3: 9,
  f3: 9,
  c6: 9,
  f6: 9,
};

/** A small, deterministic positional evaluator used only if WASM cannot load. */
function staticEvaluation(fen: string): number {
  const chess = new Chess(fen);
  let score = 0;

  for (const row of chess.board()) {
    for (const square of row) {
      if (!square) continue;
      const sign = square.color === 'w' ? 1 : -1;
      score += sign * PIECE_VALUE[square.type];
      if (square.type === 'p' || square.type === 'n') {
        score += sign * (STRONG_SQUARES[square.square] ?? 0);
      }
      if (square.type === 'b') {
        score += sign * 6;
      }
    }
  }
  return Math.round(score);
}

function scoreFromSideToMove(fen: string, color: Color): number {
  const white = staticEvaluation(fen);
  return color === 'w' ? white : -white;
}

export function chooseFallbackMove(fen: string, skillLevel: number): string | null {
  const chess = createChess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const noise = Math.max(0, 20 - Math.max(0, Math.min(20, skillLevel))) * 6;
  let bestUci: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of moves) {
    const after = new Chess(fen);
    after.move(move);
    // Evaluate from the moving side's perspective by negating the next side's score.
    const nextSide = after.turn();
    const score = -scoreFromSideToMove(after.fen(), nextSide) + (Math.random() - 0.5) * noise;
    if (score > bestScore) {
      bestScore = score;
      bestUci = moveToUci(move);
    }
  }

  return bestUci;
}

export function fallbackMoveResult(fen: string, skillLevel: number): EngineSearchResult {
  const bestMove = chooseFallbackMove(fen, skillLevel) ?? undefined;
  const copy = createChess(fen);
  let scoreCp = scoreFromSideToMove(fen, sideToMove(fen));
  if (bestMove) {
    copy.move({
      from: bestMove.slice(0, 2) as Square,
      to: bestMove.slice(2, 4) as Square,
      promotion: bestMove[4] as PieceSymbol | undefined,
    });
    scoreCp = -scoreFromSideToMove(copy.fen(), copy.turn());
  }

  return {
    fen,
    sideToMove: sideToMove(fen),
    bestMove,
    depth: 1,
    lines: [
      {
        multipv: 1,
        depth: 1,
        scoreCp,
        pv: bestMove ? [bestMove] : [],
        bestMove,
      },
    ],
    elapsedMs: 0,
    fallback: true,
  };
}

export function fallbackEvaluation(fen: string): EngineSearchResult {
  const color = sideToMove(fen);
  return {
    fen,
    sideToMove: color,
    bestMove: chooseFallbackMove(fen, 20) ?? undefined,
    depth: 1,
    lines: [
      {
        multipv: 1,
        depth: 1,
        scoreCp: scoreFromSideToMove(fen, color),
        pv: [],
      },
    ],
    elapsedMs: 0,
    fallback: true,
  };
}
