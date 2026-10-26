import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { OpeningMode } from '../types';
import { getPlyCount, positionKey, sideToMove, START_FEN, uciToSan } from '../utils/chess';
import { LESSON_CHAPTERS } from './lessons';

interface BookLine {
  id: string;
  moves: string[];
}

export interface OpeningStatus {
  ply: number;
  withinLimit: boolean;
  inBook: boolean;
  sideToMove: Color;
  recommended: string[];
  recommendedSan: string[];
  label: string;
}

export interface LondonSetupItem {
  id: string;
  label: string;
  square: Square;
  piece: { color: Color; type: PieceSymbol };
  done: boolean;
  hint: string;
}

export interface DeviationDrill {
  id: string;
  name: string;
  description: string;
  objective: string;
  moves: string[];
  playerColor: Color;
  tag: string;
}

/**
 * Extra branches that are too short to deserve a full lesson chapter but are
 * important for a useful opening book. They cover common early deviations.
 */
export const EXTRA_BOOK_LINES: BookLine[] = [
  {
    id: 'early-c5',
    moves: ['d2d4', 'd7d5', 'g1f3', 'c7c5', 'c1f4', 'e7e6', 'e2e3', 'g8f6', 'c2c3'],
  },
  {
    id: 'early-bf5',
    moves: ['d2d4', 'd7d5', 'g1f3', 'c8f5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1f4'],
  },
  {
    id: 'early-nc6',
    moves: ['d2d4', 'd7d5', 'g1f3', 'b8c6', 'c1f4', 'g8f6', 'e2e3', 'e7e6', 'c2c3'],
  },
  {
    id: 'bf5-after-bf4',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'c8f5', 'e2e3', 'e7e6', 'f1d3'],
  },
  {
    id: 'g6-after-bf4',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'g7g6', 'e2e3', 'f8g7', 'f1d3'],
  },
  {
    id: 'nc6-after-bf4',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'b8c6', 'e2e3', 'e7e6', 'c2c3'],
  },
  {
    id: 'b6-after-bf4',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'b7b6', 'e2e3', 'c8b7', 'f1d3'],
  },
  {
    id: 'c5-first',
    moves: ['d2d4', 'c7c5', 'd4c5', 'e7e6', 'g1f3', 'f8c5', 'c1f4', 'g8f6', 'e2e3', 'e8g8'],
  },
  {
    id: 'dutch',
    moves: ['d2d4', 'f7f5', 'g1f3', 'g8f6', 'c1f4', 'e7e6', 'e2e3', 'f8e7', 'f1d3'],
  },
];

const BOOK_LINES: BookLine[] = [
  ...LESSON_CHAPTERS.map((chapter) => ({ id: chapter.id, moves: chapter.moves })),
  ...EXTRA_BOOK_LINES,
];

/**
 * Map of position key → legal book continuations. Positions are keyed by board,
 * side-to-move, castling rights, and en-passant square, so transpositions work
 * even when the full-move number differs.
 */
const OPENING_BOOK = new Map<string, string[]>();

function addBookLine(line: BookLine) {
  const chess = new Chess();
  for (const uci of line.moves) {
    const fen = chess.fen();
    const key = positionKey(fen);
    const existing = OPENING_BOOK.get(key) ?? [];
    if (!existing.includes(uci)) existing.push(uci);
    OPENING_BOOK.set(key, existing);
    try {
      chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci[4] as PieceSymbol | undefined,
      });
    } catch {
      // The validation script checks all lines; skip malformed data defensively.
      return;
    }
  }
}

BOOK_LINES.forEach(addBookLine);

export const DEVIATION_DRILLS: DeviationDrill[] = [
  {
    id: 'punish-e5',
    name: 'Punish 1...e5',
    description: 'Black offers a central pawn before developing.',
    objective: 'Find 2.dxe5, meet ...Nc6 with Nf3, and castle quickly.',
    moves: ['d2d4', 'e7e5'],
    playerColor: 'w',
    tag: 'Center',
  },
  {
    id: 'early-c5',
    name: 'Handle 2...c5',
    description: 'Black attacks d4 on move two and invites complications.',
    objective: 'Keep the center intact with e3/c3, then finish development.',
    moves: ['d2d4', 'd7d5', 'g1f3', 'c7c5'],
    playerColor: 'w',
    tag: 'd4 pressure',
  },
  {
    id: 'early-bf5',
    name: 'Neutralize ...Bf5',
    description: 'Black develops the light-squared bishop outside the chain.',
    objective: 'Challenge the bishop with c4 or Bd3 without losing d4.',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'c8f5'],
    playerColor: 'w',
    tag: 'Anti-London',
  },
  {
    id: 'early-g5',
    name: 'Meet ...g5',
    description: 'A premature wing thrust tries to kick the f4-bishop.',
    objective: 'Retreat to g3, keep control of e5, and exploit Black’s kingside.',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4', 'g7g5'],
    playerColor: 'w',
    tag: 'Wing attack',
  },
];

export function getDrillFen(drill: DeviationDrill): string {
  const chess = new Chess();
  for (const uci of drill.moves) {
    try {
      chess.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci[4] as PieceSymbol | undefined,
      });
    } catch {
      break;
    }
  }
  return chess.fen();
}

export function getBookMoves(fen: string): string[] {
  return [...(OPENING_BOOK.get(positionKey(fen)) ?? [])];
}

export function isBookMove(fen: string, uci: string): boolean {
  return getBookMoves(fen).includes(uci);
}

export function getPreferredBookMove(fen: string, color?: Color): string | null {
  const chess = new Chess(fen);
  for (const uci of getBookMoves(fen)) {
    const piece = chess.get(uci.slice(0, 2) as Square);
    if (!piece || piece.color !== chess.turn()) continue;
    if (color && piece.color !== color) continue;
    try {
      new Chess(fen).move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci[4] as PieceSymbol | undefined,
      });
      return uci;
    } catch {
      // Try the next branch.
    }
  }
  return null;
}

const LONDON_SYSTEM_SEQUENCE = [
  ['d2d4'],
  ['g1f3', 'c1f4'],
  ['c1f4', 'g1f3'],
  ['e2e3', 'c2c3'],
  ['c2c3', 'e2e3'],
  ['b1d2', 'f1d3'],
  ['f1d3', 'h2h3'],
  ['h2h3', 'f1d3'],
  ['e1g1'],
  ['f3e5', 'c2c4', 'd1f3'],
];

/** A pure-system fallback for White when Black leaves every book branch. */
export function getGenericLondonMove(fen: string): string | null {
  const chess = new Chess(fen);
  if (chess.turn() !== 'w') return null;
  const ply = getPlyCount(fen);
  const candidates =
    ply < LONDON_SYSTEM_SEQUENCE.length
      ? LONDON_SYSTEM_SEQUENCE[ply]
      : ['f3e5', 'c2c4', 'd1f3', 'h2h4'];

  for (const uci of candidates) {
    try {
      const copy = new Chess(fen);
      copy.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci[4] as PieceSymbol | undefined,
      });
      return uci;
    } catch {
      // Try the next system move.
    }
  }
  return null;
}

export function getOpeningStatus(
  fen: string,
  mode: OpeningMode,
  plyLimit: number,
  botBookReplies: boolean,
): OpeningStatus {
  const ply = getPlyCount(fen);
  const active = mode !== 'off' && (mode !== 'bot' || botBookReplies);
  const withinLimit = ply < plyLimit;
  const recommended = active && withinLimit ? getBookMoves(fen) : [];
  const recommendedSan = recommended
    .map((uci) => uciToSan(fen, uci))
    .filter((san): san is string => Boolean(san));
  const currentSide = sideToMove(fen);

  let label = 'Opening constraint is off';
  if (mode !== 'off' && !withinLimit) label = 'Opening phase complete — engine is free';
  else if (mode === 'guided') {
    label = recommendedSan.length
      ? `Guided book: ${recommendedSan.slice(0, 3).join(' / ')}`
      : 'Outside book — calculate concretely';
  } else if (mode === 'strict') {
    label = recommendedSan.length
      ? `Strict book: ${recommendedSan.slice(0, 3).join(' / ')}`
      : 'Outside strict book — play freely';
  } else if (mode === 'bot') {
    label = recommendedSan.length
      ? `Bot follows London: ${recommendedSan.slice(0, 3).join(' / ')}`
      : 'Bot uses the London system fallback';
  }

  return {
    ply,
    withinLimit,
    inBook: recommended.length > 0,
    sideToMove: currentSide,
    recommended,
    recommendedSan,
    label,
  };
}

export function shouldConstrainPlayerMove(
  fen: string,
  mode: OpeningMode,
  playerColor: Color,
  plyLimit: number,
): boolean {
  if (mode !== 'strict') return false;
  if (sideToMove(fen) !== playerColor) return false;
  if (playerColor !== 'w') return false;
  const status = getOpeningStatus(fen, mode, plyLimit, true);
  return status.withinLimit && status.inBook;
}

export function getLondonSetupStatus(fen: string): LondonSetupItem[] {
  const chess = new Chess(fen);
  const requirements: Omit<LondonSetupItem, 'done'>[] = [
    {
      id: 'd4',
      label: 'd-pawn to d4',
      square: 'd4',
      piece: { color: 'w', type: 'p' },
      hint: 'Take the center and control e5/c5.',
    },
    {
      id: 'nf3',
      label: 'Knight to f3',
      square: 'f3',
      piece: { color: 'w', type: 'n' },
      hint: 'Control e5 and prepare to castle.',
    },
    {
      id: 'bf4',
      label: 'Bishop to f4',
      square: 'f4',
      piece: { color: 'w', type: 'b' },
      hint: 'Develop outside the e3/d4 pawn chain.',
    },
    {
      id: 'e3',
      label: 'e-pawn to e3',
      square: 'e3',
      piece: { color: 'w', type: 'p' },
      hint: 'Support d4 and open the f1-bishop.',
    },
    {
      id: 'c3',
      label: 'c-pawn to c3',
      square: 'c3',
      piece: { color: 'w', type: 'p' },
      hint: 'Meet ...c5 and build the pawn triangle.',
    },
    {
      id: 'nbd2',
      label: 'Knight to d2',
      square: 'd2',
      piece: { color: 'w', type: 'n' },
      hint: 'Support e4 without blocking the c-pawn.',
    },
    {
      id: 'bd3',
      label: 'Bishop to d3',
      square: 'd3',
      piece: { color: 'w', type: 'b' },
      hint: 'Aim at h7 and finish kingside development.',
    },
    {
      id: 'castle',
      label: 'King to g1',
      square: 'g1',
      piece: { color: 'w', type: 'k' },
      hint: 'King safety is the green light for Ne5 and h4.',
    },
  ];

  return requirements.map((requirement) => {
    const piece = chess.get(requirement.square);
    return {
      ...requirement,
      done: piece?.color === requirement.piece.color && piece.type === requirement.piece.type,
    };
  });
}

export function openingBookSize(): number {
  return OPENING_BOOK.size;
}

export { START_FEN };
