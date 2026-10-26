import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Move as ChessMove, type PieceSymbol, type Square } from 'chess.js';
import { engineService } from '../engine/uciEngine';
import {
  DEVIATION_DRILLS,
  getDrillFen,
  getGenericLondonMove,
  getLondonSetupStatus,
  getOpeningStatus,
  getPreferredBookMove,
  isBookMove,
  shouldConstrainPlayerMove,
  type DeviationDrill,
  type OpeningStatus,
} from '../data/openingBook';
import { soundService } from '../services/soundService';
import type {
  EngineSearchResult,
  FlyingMove,
  GameStateInfo,
  LegalMoveDescriptor,
  MoveFeedback,
  MoveRecord,
  PlayerColor,
  Settings,
} from '../types';
import {
  classifyMove,
  getGameStateInfo,
  moveToUci,
  scoreForWhite,
  sideToMove,
  START_FEN,
  uciToMove,
} from '../utils/chess';

export interface ToastMessage {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface StartPositionOptions {
  fen?: string;
  color?: PlayerColor;
  label?: string;
  drill?: DeviationDrill | null;
}

export interface LoadPositionResult {
  ok: boolean;
  message: string;
}

interface MoveMeta {
  isBook: boolean;
  isDeviation: boolean;
  engineReply: boolean;
}

export interface LondonGameController {
  fen: string;
  pgn: string;
  fenHistory: string[];
  moves: MoveRecord[];
  lastMove: { from: Square; to: Square } | null;
  flying: FlyingMove | null;
  status: GameStateInfo;
  openingStatus: OpeningStatus;
  setupStatus: ReturnType<typeof getLondonSetupStatus>;
  analysis: EngineSearchResult | null;
  evalHistory: number[];
  feedback: MoveFeedback | null;
  deviation: boolean;
  thinking: boolean;
  analyzing: boolean;
  interactiveColor: PlayerColor | null;
  sessionColor: PlayerColor;
  positionLabel: string;
  drill: DeviationDrill | null;
  toast: ToastMessage | null;
  getLegalMoves: (square: Square) => LegalMoveDescriptor[];
  attemptMove: (
    from: Square,
    to: Square,
    promotion?: PieceSymbol,
  ) => Promise<boolean>;
  onBlockedMove: (from: Square, to: Square) => void;
  newGame: (options?: StartPositionOptions) => void;
  takeBack: () => void;
  loadPosition: (input: string) => LoadPositionResult;
  startDrill: (drill: DeviationDrill) => void;
  startFromFen: (fen: string, color?: PlayerColor, label?: string) => void;
  analyzeNow: () => Promise<void>;
  clearToast: () => void;
  showToast: (message: string, tone?: ToastMessage['tone']) => void;
  drills: DeviationDrill[];
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function withHeaders(chess: Chess): Chess {
  try {
    chess.setHeader('Event', 'London Lab Training');
    chess.setHeader('Site', 'London Lab');
    chess.setHeader('Date', new Date().toISOString().slice(0, 10).replaceAll('-', '.'));
    chess.setHeader('White', 'Player');
    chess.setHeader('Black', 'Stockfish');
  } catch {
    // Header changes are cosmetic and should never block a game.
  }
  return chess;
}

function moveNumberFromFen(fen: string): number {
  return Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1;
}

function recordFromMove(move: ChessMove, meta: MoveMeta): MoveRecord {
  return {
    number: moveNumberFromFen(move.before),
    san: move.san,
    lan: move.lan,
    from: move.from,
    to: move.to,
    color: move.color,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion,
    fen: move.after,
    isBook: meta.isBook,
    isDeviation: meta.isDeviation,
    engineReply: meta.engineReply,
    timestamp: Date.now(),
  };
}

/**
 * Central game state machine. chess.js owns the rules; Stockfish workers own
 * search; React state only mirrors the authoritative position and metadata.
 */
export function useLondonGame(
  settings: Settings,
  syncPlayerColor?: (color: PlayerColor) => void,
): LondonGameController {
  const settingsRef = useRef(settings);
  const syncColorRef = useRef(syncPlayerColor);
  settingsRef.current = settings;
  syncColorRef.current = syncPlayerColor;

  const chessRef = useRef<Chess>(withHeaders(new Chess()));
  const [fen, setFen] = useState(START_FEN);
  const [pgn, setPgn] = useState('');
  const [fenHistory, setFenHistory] = useState<string[]>([START_FEN]);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [flying, setFlying] = useState<FlyingMove | null>(null);
  const [analysis, setAnalysis] = useState<EngineSearchResult | null>(null);
  const [evalHistory, setEvalHistory] = useState<number[]>([0]);
  const [feedback, setFeedback] = useState<MoveFeedback | null>(null);
  const [deviation, setDeviation] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionColor, setSessionColor] = useState<PlayerColor>(settings.playerColor);
  const [positionLabel, setPositionLabel] = useState('Start position');
  const [drill, setDrill] = useState<DeviationDrill | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const sessionColorRef = useRef<PlayerColor>(settings.playerColor);
  const analysisRef = useRef<EngineSearchResult | null>(null);
  const deviationRef = useRef(false);
  const generationRef = useRef(0);
  const botRunningRef = useRef(false);
  const movesRef = useRef<MoveRecord[]>([]);
  const fenHistoryRef = useRef<string[]>([START_FEN]);
  const evaluatedFensRef = useRef<Set<string>>(new Set());

  sessionColorRef.current = sessionColor;
  movesRef.current = moves;
  fenHistoryRef.current = fenHistory;

  const status = useMemo(() => getGameStateInfo(fen), [fen]);
  const openingStatus = useMemo(
    () =>
      getOpeningStatus(
        fen,
        settings.openingMode,
        settings.openingPlyLimit,
        settings.botBookReplies,
      ),
    [fen, settings.openingMode, settings.openingPlyLimit, settings.botBookReplies],
  );
  const setupStatus = useMemo(() => getLondonSetupStatus(fen), [fen]);

  const showToast = useCallback(
    (message: string, tone: ToastMessage['tone'] = 'info') => {
      setToast({ id: Date.now() + Math.random(), message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  const applyMove = useCallback(
    async (
      descriptor: { from: Square; to: Square; promotion?: PieceSymbol },
      meta: MoveMeta,
    ): Promise<ChessMove | null> => {
      const piece = chessRef.current.get(descriptor.from);
      if (!piece) return null;
      const generation = generationRef.current;

      if (settingsRef.current.animatePieces) {
        setFlying({
          id: Date.now() + Math.random(),
          from: descriptor.from,
          to: descriptor.to,
          piece,
        });
        await delay(155);
        if (generation !== generationRef.current) {
          setFlying(null);
          return null;
        }
      }

      let move: ChessMove;
      try {
        move = chessRef.current.move({
          from: descriptor.from,
          to: descriptor.to,
          promotion: descriptor.promotion,
        });
      } catch {
        setFlying(null);
        showToast('That move is not legal in this position.', 'warning');
        return null;
      }

      setFlying(null);
      setFen(move.after);
      setFenHistory((current) => [...current, move.after]);
      setMoves((current) => [...current, recordFromMove(move, meta)]);
      setLastMove({ from: move.from, to: move.to });
      setPgn(chessRef.current.pgn({ maxWidth: 100 }));

      const nextStatus = getGameStateInfo(move.after);
      const soundKind = nextStatus.over
        ? 'gameEnd'
        : nextStatus.inCheck
          ? 'check'
          : move.isPromotion()
            ? 'promote'
            : move.isKingsideCastle() || move.isQueensideCastle()
              ? 'castle'
              : move.isCapture()
                ? 'capture'
                : 'move';
      soundService.play(
        soundKind,
        settingsRef.current.soundEnabled,
        settingsRef.current.soundVolume,
      );

      if (nextStatus.over) {
        showToast(
          `${nextStatus.title} — ${nextStatus.detail}.`,
          nextStatus.winner === 'draw' ? 'info' : 'success',
        );
      }

      return move;
    },
    [showToast],
  );

  const runMoveFeedback = useCallback(
    async (args: {
      beforeFen: string;
      afterFen: string;
      moveIndex: number;
      playedSan: string;
      isBook: boolean;
      isDeviation: boolean;
      generation: number;
    }) => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.coachTips) return;
      const quickConfig = {
        depth: currentSettings.analysisDepth,
        multiPv: 1,
        hashSize: currentSettings.hashSize,
        quick: true,
      };
      try {
        let before: EngineSearchResult | null =
          analysisRef.current?.fen === args.beforeFen ? analysisRef.current : null;
        if (!before) {
          before = await engineService.analyze(args.beforeFen, quickConfig, 'feedback');
        }
        const after = await engineService.analyze(args.afterFen, quickConfig, 'feedback');
        if (args.generation !== generationRef.current) return;

        const result = classifyMove({
          before,
          after,
          beforeFen: args.beforeFen,
          playerColor: sessionColorRef.current,
          playedSan: args.playedSan,
          isBook: args.isBook,
        });
        if (args.isDeviation && currentSettings.punishDeviations) {
          result.message = `You left the London book, so the bot is searching for a punishment. ${result.message}`;
        }
        setFeedback(result);
        setMoves((current) =>
          current.map((move, index) =>
            index === args.moveIndex ? { ...move, feedback: result } : move,
          ),
        );
      } catch {
        // A cancelled/superseded search should not surface as a user-facing error.
      }
    },
    [],
  );

  const getLegalMoves = useCallback(
    (square: Square): LegalMoveDescriptor[] => {
      if (
        status.over ||
        thinking ||
        botRunningRef.current ||
        sideToMove(fen) !== sessionColorRef.current
      ) {
        return [];
      }
      const legal = chessRef.current.moves({ square, verbose: true }) as ChessMove[];
      const constrain = shouldConstrainPlayerMove(
        fen,
        settingsRef.current.openingMode,
        sessionColorRef.current,
        settingsRef.current.openingPlyLimit,
      );
      const filtered = constrain
        ? legal.filter((move) => isBookMove(fen, moveToUci(move)))
        : legal;
      return filtered.map((move) => ({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        uci: moveToUci(move),
      }));
    },
    [fen, status.over, thinking],
  );

  const onBlockedMove = useCallback(
    (_from: Square, _to: Square) => {
      if (
        shouldConstrainPlayerMove(
          fen,
          settingsRef.current.openingMode,
          sessionColorRef.current,
          settingsRef.current.openingPlyLimit,
        )
      ) {
        showToast(
          `Strict book mode: choose ${openingStatus.recommendedSan.slice(0, 3).join(' / ')} instead.`,
          'warning',
        );
        soundService.play(
          'error',
          settingsRef.current.soundEnabled,
          settingsRef.current.soundVolume,
        );
      }
    },
    [fen, openingStatus.recommendedSan, showToast],
  );

  const attemptMove = useCallback(
    async (from: Square, to: Square, promotion?: PieceSymbol): Promise<boolean> => {
      if (
        status.over ||
        thinking ||
        botRunningRef.current ||
        sideToMove(fen) !== sessionColorRef.current
      ) {
        return false;
      }
      const candidates = getLegalMoves(from).filter((move) => move.to === to);
      if (candidates.length === 0) {
        onBlockedMove(from, to);
        return false;
      }
      const descriptor = promotion
        ? (candidates.find((move) => move.promotion === promotion) ?? candidates[0])
        : candidates[0];
      const uci = descriptor.uci;
      const beforeFen = chessRef.current.fen();
      const currentSettings = settingsRef.current;
      const bookStatus = getOpeningStatus(
        beforeFen,
        currentSettings.openingMode,
        currentSettings.openingPlyLimit,
        currentSettings.botBookReplies,
      );
      const isBook = bookStatus.inBook && isBookMove(beforeFen, uci);
      const isDeviation =
        bookStatus.inBook &&
        bookStatus.sideToMove === sessionColorRef.current &&
        currentSettings.openingMode !== 'off' &&
        currentSettings.openingMode !== 'bot' &&
        !isBook;

      if (isDeviation && currentSettings.punishDeviations) {
        deviationRef.current = true;
        setDeviation(true);
        showToast('Deviation detected — Stockfish is looking for a punishment.', 'warning');
      } else if (isBook) {
        deviationRef.current = false;
        setDeviation(false);
      }

      const moveIndex = movesRef.current.length;
      if (currentSettings.coachTips) {
        setFeedback({
          grade: 'unknown',
          title: 'Analyzing your move…',
          message: 'Comparing the position before and after your move with Stockfish.',
          tone: 'neutral',
          playedSan: '',
        });
      }

      const move = await applyMove(
        {
          from: descriptor.from,
          to: descriptor.to,
          promotion: descriptor.promotion,
        },
        { isBook, isDeviation, engineReply: false },
      );
      if (!move) return false;

      void runMoveFeedback({
        beforeFen,
        afterFen: move.after,
        moveIndex,
        playedSan: move.san,
        isBook,
        isDeviation,
        generation: generationRef.current,
      });
      return true;
    },
    [
      applyMove,
      fen,
      getLegalMoves,
      onBlockedMove,
      runMoveFeedback,
      showToast,
      status.over,
      thinking,
    ],
  );

  const runBotMove = useCallback(async () => {
    const currentFen = chessRef.current.fen();
    const currentSettings = settingsRef.current;
    const botColor = sideToMove(currentFen);
    if (getGameStateInfo(currentFen).over || botColor === sessionColorRef.current) return;
    if (botRunningRef.current) return;

    botRunningRef.current = true;
    const generation = generationRef.current;
    setThinking(true);

    try {
      const punish = deviationRef.current && currentSettings.punishDeviations;
      const bookStatus = getOpeningStatus(
        currentFen,
        currentSettings.openingMode,
        currentSettings.openingPlyLimit,
        currentSettings.botBookReplies,
      );
      let uci: string | null = null;
      let usedBook = false;

      if (!punish && currentSettings.openingMode !== 'off' && currentSettings.botBookReplies && bookStatus.withinLimit) {
        uci = getPreferredBookMove(currentFen, botColor);
        if (!uci && botColor === 'w' && currentSettings.openingMode === 'bot') {
          uci = getGenericLondonMove(currentFen);
        }
        usedBook = Boolean(uci);
      }

      if (punish) {
        showToast('Full-strength search: finding a refutation to your deviation.', 'danger');
      }

      if (!uci) {
        const result = await engineService.play(currentFen, {
          elo: currentSettings.elo,
          skillLevel: currentSettings.skillLevel,
          moveTimeMs: currentSettings.moveTimeMs,
          limitStrength:
            currentSettings.limitStrength && currentSettings.difficulty !== 'grandmaster',
          hashSize: currentSettings.hashSize,
          punishDeviation: punish,
        });
        uci = result.bestMove ?? null;
      }
      if (generation !== generationRef.current || !uci) return;

      const descriptor = uciToMove(uci);
      const legal = chessRef.current
        .moves({ square: descriptor.from, verbose: true })
        .some((move) => moveToUci(move) === uci);
      if (!legal) return;

      const move = await applyMove(descriptor, {
        isBook: usedBook,
        isDeviation: false,
        engineReply: true,
      });
      if (!move) return;
      if (punish) {
        deviationRef.current = false;
        setDeviation(false);
      }
    } catch {
      if (generation === generationRef.current) {
        showToast('The engine could not complete that search. Try a new game.', 'warning');
      }
    } finally {
      botRunningRef.current = false;
      if (generation === generationRef.current) setThinking(false);
    }
  }, [applyMove, showToast]);

  useEffect(() => {
    if (status.over) return;
    if (sideToMove(fen) !== sessionColor && !botRunningRef.current) {
      void runBotMove();
    }
  }, [fen, runBotMove, sessionColor, status.over]);

  const newGame = useCallback(
    (options: StartPositionOptions = {}) => {
      generationRef.current += 1;
      botRunningRef.current = false;
      engineService.newGame();

      let chess: Chess;
      try {
        chess = withHeaders(new Chess(options.fen ?? START_FEN));
      } catch {
        showToast('That starting FEN is invalid. Using the standard position.', 'warning');
        chess = withHeaders(new Chess());
      }

      const color = options.color ?? settingsRef.current.playerColor;
      sessionColorRef.current = color;
      syncColorRef.current?.(color);

      chessRef.current = chess;
      const startFen = chess.fen();
      setFen(startFen);
      setPgn(chess.pgn({ maxWidth: 100 }));
      setFenHistory([startFen]);
      setMoves([]);
      setLastMove(null);
      setFlying(null);
      setAnalysis(null);
      analysisRef.current = null;
      evaluatedFensRef.current.clear();
      setEvalHistory([0]);
      setFeedback(null);
      setDeviation(false);
      deviationRef.current = false;
      setThinking(false);
      setAnalyzing(false);
      setSessionColor(color);
      setPositionLabel(options.label ?? 'Start position');
      setDrill(options.drill ?? null);
      setToast(null);
    },
    [showToast],
  );

  const takeBack = useCallback(() => {
    const history = fenHistoryRef.current;
    if (history.length <= 1) {
      showToast('No move to take back yet.', 'info');
      return;
    }

    generationRef.current += 1;
    botRunningRef.current = false;
    engineService.cancelAll();
    let targetIndex = history.length - 2;
    while (targetIndex > 0 && sideToMove(history[targetIndex]) !== sessionColorRef.current) {
      targetIndex -= 1;
    }
    const undos = history.length - 1 - targetIndex;
    for (let index = 0; index < undos; index += 1) chessRef.current.undo();

    const nextHistory = history.slice(0, targetIndex + 1);
    const targetFen = nextHistory[nextHistory.length - 1];
    const previousMove = movesRef.current[targetIndex - 1];

    setFen(targetFen);
    setFenHistory(nextHistory);
    setMoves((current) => current.slice(0, targetIndex));
    setLastMove(previousMove ? { from: previousMove.from, to: previousMove.to } : null);
    setPgn(chessRef.current.pgn({ maxWidth: 100 }));
    setFlying(null);
    setAnalysis(null);
    analysisRef.current = null;
    evaluatedFensRef.current.clear();
    setEvalHistory([0]);
    setFeedback(null);
    setDeviation(false);
    deviationRef.current = false;
    setThinking(false);
    setToast(null);
    showToast(undos > 1 ? 'Took back the last full move.' : 'Took back the last reply.', 'info');
  }, [showToast]);

  const loadPosition = useCallback(
    (input: string): LoadPositionResult => {
      const value = input.trim();
      if (!value) return { ok: false, message: 'Enter a FEN or PGN first.' };

      try {
        generationRef.current += 1;
        botRunningRef.current = false;
        engineService.newGame();
        const chess = new Chess();
        const isPgn = value.includes('[Event') || /\d+\.\s*[O0KQRBNa-h]/.test(value);
        let initialFen = START_FEN;
        if (isPgn) {
          chess.loadPgn(value, { strict: false });
          initialFen = chess.getHeaders().FEN || START_FEN;
        } else {
          chess.load(value);
          initialFen = chess.fen();
          withHeaders(chess);
        }

        const history = chess.history({ verbose: true }) as ChessMove[];
        const currentFen = chess.fen();
        const color = sideToMove(currentFen);
        sessionColorRef.current = color;
        syncColorRef.current?.(color);
        chessRef.current = chess;

        const nextHistory = [
          initialFen,
          ...history.map((move) => move.after),
        ];
        const nextMoves = history.map((move) =>
          recordFromMove(move, {
            isBook: isBookMove(move.before, moveToUci(move)),
            isDeviation: false,
            engineReply: false,
          }),
        );
        const last = history[history.length - 1];

        setFen(currentFen);
        setPgn(chess.pgn({ maxWidth: 100 }));
        setFenHistory(nextHistory);
        setMoves(nextMoves);
        setLastMove(last ? { from: last.from, to: last.to } : null);
        setFlying(null);
        setAnalysis(null);
        analysisRef.current = null;
        evaluatedFensRef.current.clear();
        setEvalHistory([0]);
        setFeedback(null);
        setDeviation(false);
        deviationRef.current = false;
        setThinking(false);
        setAnalyzing(false);
        setSessionColor(color);
        setPositionLabel(isPgn ? 'Imported PGN' : 'Imported FEN');
        setDrill(null);
        showToast(`${isPgn ? 'PGN' : 'FEN'} imported. You play the side to move.`, 'success');
        return { ok: true, message: 'Position imported.' };
      } catch (error) {
        showToast('Could not parse that FEN/PGN. Check the notation and try again.', 'danger');
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Invalid position.',
        };
      }
    },
    [showToast],
  );

  const startDrill = useCallback(
    (target: DeviationDrill) => {
      newGame({
        fen: getDrillFen(target),
        color: target.playerColor,
        label: target.name,
        drill: target,
      });
      showToast(`Drill objective: ${target.objective}`, 'success');
    },
    [newGame, showToast],
  );

  const startFromFen = useCallback(
    (targetFen: string, color?: PlayerColor, label?: string) => {
      newGame({
        fen: targetFen,
        color: color ?? sideToMove(targetFen),
        label: label ?? 'Lesson practice position',
      });
      showToast('Practice position loaded. The bot is ready.', 'success');
    },
    [newGame, showToast],
  );

  const analyzeNow = useCallback(async () => {
    if (status.over) return;
    setAnalyzing(true);
    try {
      const result = await engineService.analyze(fen, {
        depth: settingsRef.current.analysisDepth,
        multiPv: settingsRef.current.multiPv,
        hashSize: settingsRef.current.hashSize,
      });
      if (result.fen !== fen) return;
      setAnalysis(result);
      analysisRef.current = result;
    } catch {
      // Latest-position requests can supersede older ones; this is expected.
    } finally {
      setAnalyzing(false);
    }
  }, [fen, status.over]);

  useEffect(() => {
    if (!settings.autoAnalyze || status.over) {
      setAnalyzing(false);
      return;
    }
    let active = true;
    setAnalyzing(true);
    engineService
      .analyze(fen, {
        depth: settings.analysisDepth,
        multiPv: settings.multiPv,
        hashSize: settings.hashSize,
      })
      .then((result) => {
        if (!active || result.fen !== fen) return;
        setAnalysis(result);
        analysisRef.current = result;
        if (!evaluatedFensRef.current.has(result.fen)) {
          evaluatedFensRef.current.add(result.fen);
          setEvalHistory((current) =>
            [...current, scoreForWhite(result)].slice(-40),
          );
        }
      })
      .catch(() => {
        // A newer analysis request may have cancelled this one.
      })
      .finally(() => {
        if (active) setAnalyzing(false);
      });
    return () => {
      active = false;
    };
  }, [
    fen,
    settings.analysisDepth,
    settings.autoAnalyze,
    settings.hashSize,
    settings.multiPv,
    status.over,
  ]);

  const isPlayerTurn = sideToMove(fen) === sessionColor;
  const interactiveColor: PlayerColor | null =
    !status.over && !thinking && isPlayerTurn ? sessionColor : null;

  return {
    fen,
    pgn,
    fenHistory,
    moves,
    lastMove,
    flying,
    status,
    openingStatus,
    setupStatus,
    analysis,
    evalHistory,
    feedback,
    deviation,
    thinking,
    analyzing,
    interactiveColor,
    sessionColor,
    positionLabel,
    drill,
    toast,
    getLegalMoves,
    attemptMove,
    onBlockedMove,
    newGame,
    takeBack,
    loadPosition,
    startDrill,
    startFromFen,
    analyzeNow,
    clearToast: () => setToast(null),
    showToast,
    drills: DEVIATION_DRILLS,
  };
}
