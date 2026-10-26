import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Chess, type Color, type Piece, type PieceSymbol, type Square } from 'chess.js';
import type {
  BoardArrow,
  BoardTheme,
  FlyingMove,
  LegalMoveDescriptor,
} from '../types';
import { cx } from './ui';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export function PieceGlyph({
  piece,
  className,
}: {
  piece: Piece;
  className?: string;
}) {
  return (
    <span
      className={cx('piece-glyph', piece.color === 'w' ? 'white' : 'black', className)}
      aria-hidden="true"
    >
      {GLYPHS[piece.color][piece.type]}
    </span>
  );
}

export interface ChessBoardProps {
  fen: string;
  theme: BoardTheme;
  orientation: 'white' | 'black';
  interactiveColor?: Color | null;
  lastMove?: { from: Square; to: Square } | null;
  checkSquare?: Square | null;
  arrows?: BoardArrow[];
  highlights?: Square[];
  hintSquares?: Square[];
  flying?: FlyingMove | null;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  showArrows?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  getLegalMoves?: (square: Square) => LegalMoveDescriptor[];
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void | Promise<void>;
  onBlockedMove?: (from: Square, to: Square) => void;
}

interface DragState {
  from: Square;
  piece: Piece;
  x: number;
  y: number;
}

interface PointerDragRef {
  from: Square;
  piece: Piece;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
}

interface PromotionChoice {
  from: Square;
  to: Square;
  candidates: LegalMoveDescriptor[];
  color: Color;
}

export function ChessBoard({
  fen,
  theme,
  orientation,
  interactiveColor = null,
  lastMove = null,
  checkSquare = null,
  arrows = [],
  highlights = [],
  hintSquares = [],
  flying = null,
  showCoordinates = true,
  showLegalMoves = true,
  showArrows = true,
  disabled = false,
  ariaLabel = 'Interactive chess board',
  getLegalMoves,
  onMove,
  onBlockedMove,
}: ChessBoardProps) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PointerDragRef | null>(null);
  const suppressClickRef = useRef(false);
  const markerPrefix = useId().replace(/:/g, '');
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [promotion, setPromotion] = useState<PromotionChoice | null>(null);

  useEffect(() => {
    setSelected(null);
    setPromotion(null);
    setDrag(null);
    dragRef.current = null;
  }, [fen, orientation, interactiveColor, disabled]);

  const visibleFiles = useMemo(
    () => (orientation === 'white' ? [...FILES] : [...FILES].reverse()),
    [orientation],
  );
  const visibleRanks = useMemo(
    () =>
      orientation === 'white'
        ? [8, 7, 6, 5, 4, 3, 2, 1]
        : [1, 2, 3, 4, 5, 6, 7, 8],
    [orientation],
  );

  const squares = useMemo(() => {
    const board = chess.board();
    return visibleRanks.flatMap((rank) =>
      visibleFiles.map((file) => {
        const square = `${file}${rank}` as Square;
        const cell = board[8 - rank][file.charCodeAt(0) - 97];
        return {
          square,
          piece: cell ? ({ color: cell.color, type: cell.type } as Piece) : null,
          light: chess.squareColor(square) === 'light',
        };
      }),
    );
  }, [chess, visibleFiles, visibleRanks]);

  const pieceBySquare = useMemo(() => {
    const map = new Map<Square, Piece>();
    squares.forEach(({ square, piece }) => {
      if (piece) map.set(square, piece);
    });
    return map;
  }, [squares]);

  const selectedMoves = useMemo(
    () => (selected && !disabled ? (getLegalMoves?.(selected) ?? []) : []),
    [selected, disabled, getLegalMoves],
  );
  const targetMap = useMemo(() => {
    const map = new Map<Square, LegalMoveDescriptor>();
    selectedMoves.forEach((move) => {
      if (!map.has(move.to)) map.set(move.to, move);
    });
    return map;
  }, [selectedMoves]);
  const hintSet = useMemo(() => new Set(hintSquares), [hintSquares]);
  const highlightSet = useMemo(() => new Set(highlights), [highlights]);

  const squareCenter = (square: Square) => {
    const file = square[0];
    const rank = Number(square[1]);
    const fileIndex = orientation === 'white'
      ? FILES.indexOf(file as (typeof FILES)[number])
      : 7 - FILES.indexOf(file as (typeof FILES)[number]);
    const rankIndex = orientation === 'white' ? 8 - rank : rank - 1;
    return { x: fileIndex * 100 + 50, y: rankIndex * 100 + 50 };
  };

  const squareOffset = (square: Square) => {
    const { x, y } = squareCenter(square);
    return { x: (x - 50) / 100, y: (y - 50) / 100 };
  };

  const tryMove = (from: Square, to: Square) => {
    const candidates = (getLegalMoves?.(from) ?? []).filter((move) => move.to === to);
    if (candidates.length === 0) {
      onBlockedMove?.(from, to);
      return false;
    }
    if (candidates.length > 1 && candidates.some((move) => move.promotion)) {
      setPromotion({
        from,
        to,
        candidates,
        color: pieceBySquare.get(from)?.color ?? chess.turn(),
      });
      return true;
    }
    const move = candidates[0];
    setSelected(null);
    void onMove?.(move.from, move.to, move.promotion);
    return true;
  };

  const handleClick = (square: Square) => {
    if (disabled || promotion) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!interactiveColor) return;

    if (selected && targetMap.has(square)) {
      void tryMove(selected, square);
      return;
    }
    const piece = pieceBySquare.get(square);
    if (selected && square !== selected && (!piece || piece.color !== interactiveColor)) {
      onBlockedMove?.(selected, square);
      return;
    }
    if (piece?.color === interactiveColor && (getLegalMoves?.(square) ?? []).length > 0) {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    square: Square,
    piece: Piece | null,
  ) => {
    if (disabled || promotion || !interactiveColor || piece?.color !== interactiveColor) return;
    if ((getLegalMoves?.(square) ?? []).length === 0) return;
    dragRef.current = {
      from: square,
      piece,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    try {
      boardRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an optimization; click-to-move still works without it.
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    );
    if (!current.active && distance > 7) current.active = true;
    if (current.active) {
      setDrag({ from: current.from, piece: current.piece, x: event.clientX, y: event.clientY });
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    try {
      boardRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
    if (cancelled) return;

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    if (current.active) {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const squareElement = element?.closest('[data-square]') as HTMLElement | null;
      const target = squareElement?.dataset.square as Square | undefined;
      if (target) void tryMove(current.from, target);
      else setSelected(current.from);
    } else {
      setSelected((previous) => (previous === current.from ? null : current.from));
    }
  };

  const commitPromotion = (move: LegalMoveDescriptor) => {
    setPromotion(null);
    setSelected(null);
    void onMove?.(move.from, move.to, move.promotion);
  };

  const themeVars = {
    '--sq-light': theme.light,
    '--sq-dark': theme.dark,
    '--sq-light-text': theme.lightText,
    '--sq-dark-text': theme.darkText,
    '--sq-accent': theme.accent,
    '--sq-accent-soft': theme.accentSoft,
    '--board-edge': theme.boardEdge,
  } as CSSProperties;

  const flyingStyle = (() => {
    if (!flying) return undefined;
    const from = squareOffset(flying.from);
    const to = squareOffset(flying.to);
    return {
      '--fly-from-x': `${from.x * 100}%`,
      '--fly-from-y': `${from.y * 100}%`,
      '--fly-to-x': `${to.x * 100}%`,
      '--fly-to-y': `${to.y * 100}%`,
    } as CSSProperties;
  })();

  return (
    <div className="board-frame w-full" style={themeVars}>
      <div
        ref={boardRef}
        className="board-grid"
        role="grid"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointer(event)}
        onPointerCancel={(event) => finishPointer(event, true)}
      >
        {squares.map(({ square, piece, light }, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isLast = lastMove?.from === square || lastMove?.to === square;
          const isSelected = selected === square;
          const isCheck = checkSquare === square;
          const isTarget = targetMap.has(square);
          const isCaptureTarget = isTarget && Boolean(pieceBySquare.get(square));
          const isHint = hintSet.has(square);
          const isHighlight = highlightSet.has(square);
          const hidden = flying?.from === square;
          const ownPiece = piece?.color === interactiveColor;
          const label = `${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : ' empty'}`;

          return (
            <button
              key={square}
              type="button"
              data-square={square}
              role="gridcell"
              aria-label={label}
              onClick={() => handleClick(square)}
              onPointerDown={(event) => handlePointerDown(event, square, piece)}
              className={cx(
                'board-square',
                light ? 'light' : 'dark',
                ownPiece && !disabled ? 'interactive' : '',
                isLast ? 'last-move' : '',
                isSelected ? 'selected' : '',
                isCheck ? 'check' : '',
                isHighlight ? 'highlight' : '',
              )}
            >
              {showCoordinates && col === 0 ? (
                <span className="square-coordinate rank">{square[1]}</span>
              ) : null}
              {showCoordinates && row === 7 ? (
                <span className="square-coordinate file">{square[0]}</span>
              ) : null}
              {showLegalMoves && isTarget && !isCaptureTarget ? (
                <span className="legal-dot" />
              ) : null}
              {showLegalMoves && isTarget && isCaptureTarget ? (
                <span className="legal-capture" />
              ) : null}
              {isHint && !isTarget ? <span className="book-hint" /> : null}
              {piece && !hidden ? <PieceGlyph piece={piece} /> : null}
            </button>
          );
        })}

        {showArrows && (arrows.length > 0 || highlights.length > 0) ? (
          <svg className="board-overlay" viewBox="0 0 800 800" aria-hidden="true">
            <defs>
              {arrows.map((arrow, index) => (
                <marker
                  key={`${markerPrefix}-${index}`}
                  id={`${markerPrefix}-arrow-${index}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill={arrow.color ?? theme.accent} />
                </marker>
              ))}
            </defs>
            {highlights.map((square) => {
              const point = squareCenter(square);
              return (
                <rect
                  key={`highlight-${square}`}
                  x={point.x - 43}
                  y={point.y - 43}
                  width="86"
                  height="86"
                  rx="12"
                  fill={theme.accent}
                  opacity="0.13"
                  stroke={theme.accent}
                  strokeWidth="3"
                />
              );
            })}
            {arrows.map((arrow, index) => {
              const from = squareCenter(arrow.from);
              const to = squareCenter(arrow.to);
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const length = Math.hypot(dx, dy) || 1;
              const start = { x: from.x + (dx / length) * 18, y: from.y + (dy / length) * 18 };
              const end = { x: to.x - (dx / length) * 24, y: to.y - (dy / length) * 24 };
              return (
                <g key={`${arrow.from}-${arrow.to}-${index}`}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={arrow.color ?? theme.accent}
                    strokeWidth="11"
                    strokeLinecap="round"
                    opacity="0.88"
                    markerEnd={`url(#${markerPrefix}-arrow-${index})`}
                  />
                  {arrow.label ? (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 12}
                      fill="#fff"
                      stroke="#101827"
                      strokeWidth="3"
                      paintOrder="stroke"
                      fontSize="19"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {arrow.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}

        {flying && flyingStyle ? (
          <div className="flying-piece" style={flyingStyle}>
            <PieceGlyph piece={flying.piece} />
          </div>
        ) : null}

        {promotion ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-slate-950/78 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-center shadow-2xl">
              <div className="text-sm font-bold text-white">Choose promotion</div>
              <div className="mt-1 text-xs text-slate-400">
                Select the piece for {promotion.from} → {promotion.to}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((type) => {
                  const candidate = promotion.candidates.find((move) => move.promotion === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!candidate}
                      onClick={() => candidate && commitPromotion(candidate)}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl transition hover:border-amber-300/50 hover:bg-amber-300/10 disabled:opacity-30"
                      aria-label={`Promote to ${PIECE_NAMES[type]}`}
                    >
                      <PieceGlyph piece={{ color: promotion.color, type }} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPromotion(null)}
                className="mt-3 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {drag
        ? createPortal(
            <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
              <PieceGlyph piece={drag.piece} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
