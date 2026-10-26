import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Eye,
  Info,
  Lightbulb,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ChessBoard } from './components/ChessBoard';
import { CoachChat } from './components/CoachChat';
import { EvalBar } from './components/EvalBar';
import { GameOverModal } from './components/GameOverModal';
import { LessonControls, LessonPanel, LessonSidebar } from './components/LessonHub';
import { MoveList } from './components/MoveList';
import { PlaySidebar } from './components/PlaySidebar';
import { ReviewSidebar } from './components/ReviewSidebar';
import { SettingsOverview, SettingsPanel } from './components/SettingsPanel';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import {
  Badge,
  Button,
  IconButton,
  Panel,
  RichText,
  SectionHeading,
  cx,
} from './components/ui';
import { BOARD_THEMES, getDifficultyPreset } from './data/settings';
import { openingBookSize, type DeviationDrill } from './data/openingBook';
import { engineService } from './engine/uciEngine';
import { useCoachChat } from './hooks/useCoachChat';
import { useEngineStatus } from './hooks/useEngineStatus';
import { useLessonPlayer } from './hooks/useLessonPlayer';
import {
  useLondonGame,
  type StartPositionOptions,
} from './hooks/useLondonGame';
import { useSettings } from './hooks/useSettings';
import { soundService } from './services/soundService';
import type {
  CoachContext,
  EngineSearchResult,
  GameStateInfo,
  LessonFrame,
  MoveFeedback,
  MoveRecord,
  OpeningMode,
  PlayerColor,
  Settings,
  Square,
  TabId,
} from './types';
import {
  copyText,
  downloadText,
  formatEvaluationLabel,
  getGameStateInfo,
  getPlyCount,
  mateForWhite,
  scoreForWhite,
  sideToMove,
} from './utils/chess';

type BannerTone = 'info' | 'success' | 'warning' | 'danger';
interface BannerData {
  icon: LucideIcon;
  tone: BannerTone;
  title: string;
  message: string;
}

function BoardHeader({
  title,
  subtitle,
  status,
  ply,
  thinking,
  analyzing,
  reviewMode,
  onFlip,
  onTakeBack,
  onNewGame,
  onReturnLive,
}: {
  title: string;
  subtitle: string;
  status: GameStateInfo;
  ply: number;
  thinking: boolean;
  analyzing: boolean;
  reviewMode: boolean;
  onFlip: () => void;
  onTakeBack: () => void;
  onNewGame: () => void;
  onReturnLive: () => void;
}) {
  return (
    <Panel soft className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <div className="truncate text-sm font-black text-white">{title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.68rem] text-slate-400">
            <span>{subtitle}</span>
            <span className="text-slate-700">•</span>
            <span className={status.inCheck ? 'font-semibold text-rose-200' : ''}>
              {status.title}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">Ply {ply}</Badge>
          {thinking ? (
            <Badge tone="gold">
              <LoaderCircle className="h-3 w-3 animate-spin" /> Stockfish
            </Badge>
          ) : analyzing ? (
            <Badge tone="sky">
              <LoaderCircle className="h-3 w-3 animate-spin" /> Analyzing
            </Badge>
          ) : (
            <Badge tone="mint">
              <CheckCircle2 className="h-3 w-3" /> Ready
            </Badge>
          )}
          {reviewMode ? <Badge tone="violet">Reviewing</Badge> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {reviewMode ? (
            <Button variant="secondary" size="sm" icon={Eye} onClick={onReturnLive}>
              Live
            </Button>
          ) : null}
          <IconButton icon={ArrowLeftRight} label="Flip board" onClick={onFlip} />
          <IconButton icon={RotateCcw} label="Take back" onClick={onTakeBack} />
          <IconButton icon={Plus} label="New game" onClick={onNewGame} />
        </div>
      </div>
    </Panel>
  );
}

function MoveTimeline({
  moves,
  activeMoveIndex,
  onSelectMove,
}: {
  moves: MoveRecord[];
  activeMoveIndex: number | null;
  onSelectMove: (index: number) => void;
}) {
  const recent = moves.slice(-14);
  const start = moves.length - recent.length;
  return (
    <Panel soft className="p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-slate-400">
          Move history · SAN / LAN
        </span>
        <span className="ml-auto text-[0.62rem] text-slate-600">Last {recent.length}</span>
      </div>
      <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
        {recent.length === 0 ? (
          <div className="py-2 text-[0.7rem] text-slate-500">
            Your moves will appear here with SAN and coordinate notation.
          </div>
        ) : (
          recent.map((move, offset) => {
            const index = start + offset;
            const grade = move.feedback?.grade;
            return (
              <button
                key={`${index}-${move.san}`}
                type="button"
                onClick={() => onSelectMove(index)}
                title={`${move.san} · ${move.lan}${move.feedback ? ` · ${move.feedback.title}` : ''}`}
                className={cx(
                  'min-w-[66px] shrink-0 rounded-xl border px-2 py-1.5 text-left transition',
                  activeMoveIndex === index
                    ? 'border-amber-300/40 bg-amber-300/10'
                    : 'border-white/7 bg-white/2 hover:border-white/15 hover:bg-white/5',
                  grade === 'blunder' || grade === 'mistake' ? 'ring-1 ring-rose-400/20' : '',
                  grade === 'excellent' || grade === 'book' ? 'ring-1 ring-emerald-300/20' : '',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[0.58rem] text-slate-500">
                    {move.number}{move.color === 'w' ? '.' : '…'}
                  </span>
                  {move.isBook ? <BookOpen className="h-2.5 w-2.5 text-amber-300" /> : null}
                </div>
                <div className="mt-0.5 font-mono text-[0.72rem] font-bold text-slate-100">
                  {move.san}
                </div>
                <div className="font-mono text-[0.56rem] text-slate-600">{move.lan}</div>
              </button>
            );
          })
        )}
        {moves.length > recent.length ? <ChevronRight className="my-auto h-3.5 w-3.5 text-slate-600" /> : null}
      </div>
    </Panel>
  );
}

function ContextBanner({ banner }: { banner: BannerData | null }) {
  if (!banner) return null;
  const Icon = banner.icon;
  const styles: Record<BannerTone, string> = {
    info: 'border-sky-300/20 bg-sky-300/6 text-sky-200',
    success: 'border-emerald-300/20 bg-emerald-300/6 text-emerald-200',
    warning: 'border-amber-300/25 bg-amber-300/7 text-amber-200',
    danger: 'border-rose-300/25 bg-rose-300/7 text-rose-200',
  };
  return (
    <div className={cx('fade-rise rounded-2xl border p-3', styles[banner.tone])}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-[0.75rem] font-bold text-white">{banner.title}</div>
          <div className="mt-0.5 text-[0.71rem] leading-snug text-slate-300">
            <RichText text={banner.message} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const settingsController = useSettings();
  const { settings, updateSetting, updateSettings } = settingsController;
  const syncPlayerColor = useCallback(
    (color: PlayerColor) => updateSetting('playerColor', color),
    [updateSetting],
  );
  const game = useLondonGame(settings, syncPlayerColor);
  const engineStatus = useEngineStatus();
  const lesson = useLessonPlayer();
  const chat = useCoachChat();

  const [activeTab, setActiveTab] = useState<TabId>('play');
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [reviewAnalysis, setReviewAnalysis] = useState<EngineSearchResult | null>(null);
  const [reviewAnalyzing, setReviewAnalyzing] = useState(false);
  const [dismissedResultFen, setDismissedResultFen] = useState<string | null>(null);

  const theme = BOARD_THEMES[settings.boardTheme];
  const boardOrientation = useMemo<'white' | 'black'>(() => {
    if (settings.orientation !== 'auto') return settings.orientation;
    return game.sessionColor === 'w' ? 'white' : 'black';
  }, [settings.orientation, game.sessionColor]);
  const visibleOrientation = useMemo<'white' | 'black'>(() => {
    // Lessons are authored from White's side; explicit orientation still wins.
    if (activeTab === 'learn' && settings.orientation === 'auto') return 'white';
    return boardOrientation;
  }, [activeTab, boardOrientation, settings.orientation]);

  const isLesson = activeTab === 'learn';
  const reviewMode = reviewPly !== null && !isLesson;
  const liveFen = reviewPly !== null ? game.fenHistory[reviewPly] ?? game.fen : game.fen;
  const displayFen = isLesson ? lesson.frame.fen : liveFen;
  const displayedStatus = useMemo(() => getGameStateInfo(displayFen), [displayFen]);
  const viewedMove = reviewPly !== null ? game.moves[reviewPly - 1] : game.moves.at(-1);

  useEffect(() => {
    if (reviewPly !== null && reviewPly >= game.fenHistory.length) setReviewPly(null);
  }, [reviewPly, game.fenHistory.length]);

  useEffect(() => {
    const unlock = () => void soundService.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // When a historical move is selected, analyze that exact FEN with the second worker.
  useEffect(() => {
    if (!reviewMode) {
      setReviewAnalysis(null);
      setReviewAnalyzing(false);
      return;
    }
    let active = true;
    setReviewAnalyzing(true);
    engineService
      .analyze(displayFen, {
        depth: settings.analysisDepth,
        multiPv: settings.multiPv,
        hashSize: settings.hashSize,
      })
      .then((result) => {
        if (active && result.fen === displayFen) setReviewAnalysis(result);
      })
      .catch(() => {
        // Superseded requests are expected while scrubbing the move list.
      })
      .finally(() => {
        if (active) setReviewAnalyzing(false);
      });
    return () => {
      active = false;
    };
  }, [
    displayFen,
    reviewMode,
    settings.analysisDepth,
    settings.hashSize,
    settings.multiPv,
  ]);

  const analysisForPanel = reviewMode ? reviewAnalysis : game.analysis;
  const panelAnalyzing = reviewMode ? reviewAnalyzing : game.analyzing;
  const evaluation = useMemo(() => {
    if (isLesson) return { score: 0, mate: undefined as number | undefined };
    if (analysisForPanel) {
      return {
        score: scoreForWhite(analysisForPanel),
        mate: mateForWhite(analysisForPanel),
      };
    }
    if (game.status.over) {
      if (game.status.winner === 'w') return { score: 1000, mate: 1 };
      if (game.status.winner === 'b') return { score: -1000, mate: -1 };
    }
    return { score: 0, mate: undefined as number | undefined };
  }, [analysisForPanel, game.status, isLesson]);

  const bookHintSquares = useMemo(
    () =>
      activeTab === 'play' && settings.openingMode !== 'off'
        ? game.openingStatus.recommended.map((uci) => uci.slice(2, 4) as Square)
        : [],
    [activeTab, game.openingStatus.recommended, settings.openingMode],
  );

  const lessonLastMove = useMemo(() => {
    if (!isLesson || lesson.frame.step.moveIndex < 0) return null;
    const uci = lesson.chapter.moves[lesson.frame.step.moveIndex];
    return uci
      ? { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square }
      : null;
  }, [isLesson, lesson.chapter.moves, lesson.frame.step.moveIndex]);

  const displayLastMove = useMemo(() => {
    if (isLesson) return lessonLastMove;
    if (reviewMode && viewedMove) return { from: viewedMove.from, to: viewedMove.to };
    if (reviewMode) return null;
    return game.lastMove;
  }, [game.lastMove, isLesson, lessonLastMove, reviewMode, viewedMove]);

  const displayFeedback: MoveFeedback | null = reviewMode
    ? (viewedMove?.feedback ?? null)
    : isLesson
      ? null
      : game.feedback;

  const coachContext = useMemo<CoachContext>(() => {
    const lessonMove = lesson.frame.san;
    return {
      fen: displayFen,
      pgn: isLesson ? '' : game.pgn,
      lastMoveSan: isLesson ? (lessonMove ?? undefined) : viewedMove?.san,
      lastMoveLan: isLesson ? lesson.chapter.subtitle : viewedMove?.lan,
      evaluation: isLesson ? null : analysisForPanel,
      feedback: displayFeedback,
      lessonTitle: isLesson ? lesson.chapter.title : undefined,
      lessonStepTitle: isLesson ? lesson.frame.step.title : undefined,
      openingHint: isLesson ? lesson.chapter.subtitle : game.openingStatus.label,
      deviation: isLesson ? false : game.deviation,
      playerColor: game.sessionColor,
      difficultyLabel: getDifficultyPreset(settings.difficulty).label,
      openingMode: settings.openingMode,
      reviewMode,
    };
  }, [
    analysisForPanel,
    displayFen,
    displayFeedback,
    game.deviation,
    game.openingStatus.label,
    game.pgn,
    game.sessionColor,
    isLesson,
    lesson.chapter.subtitle,
    lesson.chapter.title,
    lesson.frame.san,
    lesson.frame.step.title,
    reviewMode,
    settings.difficulty,
    settings.openingMode,
    viewedMove,
  ]);

  const clickSound = useCallback(() => {
    soundService.play('click', settings.soundEnabled, settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

  const handleNewGame = useCallback(
    (options?: StartPositionOptions) => {
      setReviewPly(null);
      setReviewAnalysis(null);
      setDismissedResultFen(null);
      setActiveTab('play');
      game.newGame(options);
      soundService.play('success', settings.soundEnabled, settings.soundVolume);
    },
    [game.newGame, settings.soundEnabled, settings.soundVolume],
  );

  const handlePlayerColorChange = useCallback(
    (color: PlayerColor) => {
      updateSetting('playerColor', color);
      handleNewGame({ color });
    },
    [handleNewGame, updateSetting],
  );

  const handleOpeningModeChange = useCallback(
    (mode: OpeningMode) => {
      const patch: Partial<Settings> = { openingMode: mode };
      let color = settings.playerColor;
      if (mode === 'bot') {
        patch.playerColor = 'b';
        color = 'b';
      } else if (mode === 'guided' || mode === 'strict') {
        patch.playerColor = 'w';
        color = 'w';
      }
      updateSettings(patch);
      handleNewGame({ color });
    },
    [handleNewGame, settings.playerColor, updateSettings, updateSetting],
  );

  const handleStartDrill = useCallback(
    (drill: DeviationDrill) => {
      setReviewPly(null);
      setReviewAnalysis(null);
      setDismissedResultFen(null);
      setActiveTab('play');
      game.startDrill(drill);
      clickSound();
    },
    [clickSound, game.startDrill],
  );

  const handleLessonPractice = useCallback(
    (frame: LessonFrame) => {
      const color = frame.sideToMove;
      updateSettings({
        playerColor: color,
        openingMode: settings.openingMode === 'off' ? 'guided' : settings.openingMode,
      });
      setReviewPly(null);
      setReviewAnalysis(null);
      setDismissedResultFen(null);
      setActiveTab('play');
      game.startFromFen(frame.fen, color, lesson.chapter.title);
      soundService.play('success', settings.soundEnabled, settings.soundVolume);
    },
    [
      game.startFromFen,
      lesson.chapter.title,
      settings.openingMode,
      settings.soundEnabled,
      settings.soundVolume,
      updateSettings,
    ],
  );

  const handleSelectMove = useCallback(
    (index: number) => {
      if (index < 0 || index >= game.moves.length) return;
      setReviewPly(index + 1);
      setActiveTab('review');
      clickSound();
    },
    [clickSound, game.moves.length],
  );

  const handleReturnLive = useCallback(() => {
    setReviewPly(null);
    setReviewAnalysis(null);
    clickSound();
  }, [clickSound]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (tab === 'learn') setReviewPly(null);
      if (tab === 'play' && reviewPly !== null) setReviewPly(null);
      setActiveTab(tab);
      clickSound();
    },
    [clickSound, reviewPly],
  );

  const handleFlip = useCallback(() => {
    updateSetting('orientation', visibleOrientation === 'white' ? 'black' : 'white');
    clickSound();
  }, [clickSound, updateSetting, visibleOrientation]);

  const handleAnalyze = useCallback(async () => {
    if (!reviewMode) {
      await game.analyzeNow();
      return;
    }
    setReviewAnalyzing(true);
    try {
      const result = await engineService.analyze(displayFen, {
        depth: settings.analysisDepth,
        multiPv: settings.multiPv,
        hashSize: settings.hashSize,
      });
      if (result.fen === displayFen) setReviewAnalysis(result);
    } catch {
      // A newer position superseded this analysis.
    } finally {
      setReviewAnalyzing(false);
    }
  }, [
    displayFen,
    game.analyzeNow,
    reviewMode,
    settings.analysisDepth,
    settings.hashSize,
    settings.multiPv,
  ]);

  const handleCopyFen = useCallback(async () => {
    const ok = await copyText(displayFen);
    game.showToast(ok ? 'FEN copied to clipboard.' : 'Could not copy the FEN.', ok ? 'success' : 'warning');
  }, [displayFen, game.showToast]);

  const handleExportPgn = useCallback(() => {
    downloadText(
      'london-lab-game.pgn',
      game.pgn || displayFen,
      'application/x-chess-pgn',
    );
    game.showToast('Game downloaded as PGN.', 'success');
  }, [displayFen, game.pgn, game.showToast]);

  const handleLoadPosition = useCallback(
    (input: string) => {
      const result = game.loadPosition(input);
      if (result.ok) {
        setReviewPly(null);
        setReviewAnalysis(null);
        setDismissedResultFen(null);
        setActiveTab('play');
      }
      return result;
    },
    [game.loadPosition],
  );

  const handleChatSend = useCallback(
    (text: string) => {
      clickSound();
      void chat.send(text, coachContext, settings);
    },
    [chat.send, clickSound, coachContext, settings],
  );

  const handleSoundToggle = useCallback(() => {
    const enabled = !settings.soundEnabled;
    updateSetting('soundEnabled', enabled);
    if (enabled) soundService.play('success', true, settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume, updateSetting]);

  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: MoveRecord['promotion']) => {
      void game.attemptMove(from, to, promotion);
    },
    [game.attemptMove],
  );

  const banner = useMemo<BannerData | null>(() => {
    if (isLesson) {
      return {
        icon: Lightbulb,
        tone: 'info',
        title: lesson.frame.step.title,
        message: `**Coach tip:** ${lesson.frame.step.tip}`,
      };
    }
    if (reviewMode) {
      return {
        icon: Eye,
        tone: 'info',
        title: `Reviewing ply ${reviewPly}`,
        message:
          'The board is paused at a historical position. Stockfish is analyzing exactly this FEN; return to live to continue playing.',
      };
    }
    if (game.deviation && settings.punishDeviations) {
      return {
        icon: TriangleAlert,
        tone: 'danger',
        title: 'Deviation detected',
        message:
          'You left the London book. Stockfish has switched to full-strength search to find the most accurate punishment.',
      };
    }
    if (settings.coachTips && game.feedback) {
      return {
        icon:
          game.feedback.tone === 'danger'
            ? CircleAlert
            : game.feedback.tone === 'warning'
              ? TriangleAlert
              : game.feedback.tone === 'positive'
                ? CheckCircle2
                : BrainCircuit,
        tone:
          game.feedback.tone === 'danger'
            ? 'danger'
            : game.feedback.tone === 'warning'
              ? 'warning'
              : game.feedback.tone === 'positive'
                ? 'success'
                : 'info',
        title: game.feedback.title,
        message: game.feedback.message,
      };
    }
    if (settings.coachTips && settings.openingMode !== 'off' && game.openingStatus.inBook) {
      return {
        icon: BookOpen,
        tone: 'success',
        title: 'London book position',
        message: `**${game.openingStatus.recommendedSan.slice(0, 3).join(' / ')}** keeps the line in theory. Finish development, hold d4, and watch the e5 outpost.`,
      };
    }
    if (settings.coachTips) {
      return {
        icon: Target,
        tone: 'info',
        title: 'London plan reminder',
        message: `**${formatEvaluationLabel(evaluation.score, evaluation.mate)}.** Control e5, keep your king safe, and choose between Ne5/f4 or c4/queenside pressure.`,
      };
    }
    return null;
  }, [
    evaluation.mate,
    evaluation.score,
    game.deviation,
    game.feedback,
    game.openingStatus.inBook,
    game.openingStatus.recommendedSan,
    isLesson,
    lesson.frame.step.tip,
    lesson.frame.step.title,
    reviewMode,
    reviewPly,
    settings.coachTips,
    settings.openingMode,
    settings.punishDeviations,
  ]);

  const showGameOver = game.status.over && dismissedResultFen !== game.fen;
  const boardDisabled = isLesson || activeTab === 'settings' || reviewMode;
  const activeMoveIndex = reviewPly !== null ? reviewPly - 1 : game.moves.length - 1;
  const engineLabel = engineStatus.state === 'ready' ? 'Stockfish 19 Lite' : engineStatus.label;

  return (
    <div className="min-h-screen">
      <TopBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        engineStatus={engineStatus}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleSoundToggle}
        onNewGame={() => handleNewGame()}
      />

      <main className="mx-auto grid max-w-[1800px] grid-cols-1 gap-3 px-3 py-3 sm:px-5 lg:grid-cols-[minmax(230px,280px)_minmax(0,1fr)_minmax(300px,360px)] xl:grid-cols-[290px_minmax(0,1fr)_380px]">
        <aside className="order-2 min-h-0 lg:order-1 lg:sticky lg:top-[70px] lg:h-[calc(100vh-80px)]">
          {activeTab === 'play' ? (
            <PlaySidebar
              settings={settings}
              settingsController={settingsController}
              game={game}
              onPlayerColorChange={handlePlayerColorChange}
              onOpeningModeChange={handleOpeningModeChange}
              onStartDrill={handleStartDrill}
            />
          ) : null}
          {activeTab === 'learn' ? (
            <LessonSidebar
              chapters={lesson.chapters}
              activeId={lesson.chapter.id}
              onSelect={lesson.selectChapter}
            />
          ) : null}
          {activeTab === 'review' ? (
            <ReviewSidebar
              moves={game.moves}
              fen={reviewMode ? displayFen : game.fen}
              pgn={game.pgn}
              status={game.status}
              sessionColor={game.sessionColor}
              reviewMode={reviewMode}
              activeMoveIndex={activeMoveIndex}
              onSelectMove={handleSelectMove}
              onReturnLive={handleReturnLive}
              onLoadPosition={handleLoadPosition}
            />
          ) : null}
          {activeTab === 'settings' ? (
            <SettingsOverview
              settingsController={settingsController}
              engineStatus={engineStatus}
            />
          ) : null}
        </aside>

        <section className="order-1 min-w-0 lg:order-2">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3">
            <BoardHeader
              title={
                isLesson
                  ? lesson.chapter.title
                  : reviewMode
                    ? `Review · ${game.positionLabel}`
                    : game.positionLabel
              }
              subtitle={
                isLesson
                  ? lesson.chapter.subtitle
                  : `${engineLabel} · ${sideToMove(displayFen) === 'w' ? 'White' : 'Black'} to move`
              }
              status={displayedStatus}
              ply={getPlyCount(displayFen)}
              thinking={game.thinking}
              analyzing={panelAnalyzing}
              reviewMode={reviewMode}
              onFlip={handleFlip}
              onTakeBack={game.takeBack}
              onNewGame={() => handleNewGame()}
              onReturnLive={handleReturnLive}
            />

            <div className="flex items-stretch gap-2">
              {settings.showEvalBar ? (
                <EvalBar
                  whiteScore={evaluation.score}
                  whiteMate={evaluation.mate}
                  orientation={visibleOrientation}
                  analyzing={panelAnalyzing}
                  className="shrink-0"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <ChessBoard
                  fen={displayFen}
                  theme={theme}
                  orientation={visibleOrientation}
                  interactiveColor={boardDisabled ? null : game.interactiveColor}
                  lastMove={displayLastMove}
                  checkSquare={displayedStatus.checkSquare}
                  arrows={isLesson ? lesson.frame.step.arrows : []}
                  highlights={isLesson ? lesson.frame.step.highlights : []}
                  hintSquares={bookHintSquares}
                  flying={boardDisabled ? null : game.flying}
                  showCoordinates={settings.showCoordinates}
                  showLegalMoves={settings.showLegalMoves}
                  showArrows={settings.showArrows}
                  disabled={boardDisabled}
                  ariaLabel={
                    isLesson
                      ? `Lesson board: ${lesson.frame.step.title}`
                      : reviewMode
                        ? 'Historical game position'
                        : 'London Lab playing board'
                  }
                  getLegalMoves={game.getLegalMoves}
                  onMove={handleBoardMove}
                  onBlockedMove={game.onBlockedMove}
                />
              </div>
            </div>

            {isLesson ? (
              <LessonControls
                frame={lesson.frame}
                stepIndex={lesson.stepIndex}
                total={lesson.frames.length}
                playing={lesson.playing}
                onPrevious={lesson.previous}
                onNext={lesson.next}
                onTogglePlay={lesson.togglePlay}
                onRestart={lesson.restart}
              />
            ) : (
              <MoveTimeline
                moves={game.moves}
                activeMoveIndex={reviewPly !== null ? reviewPly - 1 : null}
                onSelectMove={handleSelectMove}
              />
            )}

            <ContextBanner banner={banner} />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/6 bg-white/2 px-3 py-2 text-[0.66rem] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Info className="h-3 w-3" />
                Drag pieces, click a piece then a square, or use the promotion chooser.
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-300" />
                chess.js rules · Stockfish WASM · {openingBookSize()} mapped book positions
              </span>
            </div>
          </div>
        </section>

        <aside className="order-3 min-h-0 lg:sticky lg:top-[70px] lg:h-[calc(100vh-80px)]">
          {activeTab === 'play' ? (
            <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
              <AnalysisPanel
                fen={displayFen}
                analysis={analysisForPanel}
                evalHistory={game.evalHistory}
                whiteScore={evaluation.score}
                whiteMate={evaluation.mate}
                feedback={displayFeedback}
                status={displayedStatus}
                engineStatus={engineStatus}
                analyzing={panelAnalyzing}
                onAnalyze={() => void handleAnalyze()}
                onCopyFen={() => void handleCopyFen()}
                onExportPgn={handleExportPgn}
                compact
              />
              <Panel className="p-3.5">
                <SectionHeading
                  icon={BookOpen}
                  title="Notation"
                  subtitle="Select a move to open review mode."
                />
                <MoveList
                  moves={game.moves}
                  activeMoveIndex={reviewPly !== null ? reviewPly - 1 : null}
                  onSelectMove={handleSelectMove}
                  showLan
                  compact
                />
              </Panel>
              <CoachChat
                messages={chat.messages}
                isTyping={chat.isTyping}
                context={coachContext}
                agentStyle={settings.agentStyle}
                onSend={handleChatSend}
                onClear={chat.clear}
                className="min-h-[420px] flex-1"
              />
            </div>
          ) : null}

          {activeTab === 'learn' ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="min-h-0 flex-[3]">
                <LessonPanel
                  chapter={lesson.chapter}
                  frames={lesson.frames}
                  frame={lesson.frame}
                  stepIndex={lesson.stepIndex}
                  onStepSelect={lesson.goToStep}
                  onPractice={handleLessonPractice}
                />
              </div>
              <CoachChat
                messages={chat.messages}
                isTyping={chat.isTyping}
                context={coachContext}
                agentStyle={settings.agentStyle}
                onSend={handleChatSend}
                onClear={chat.clear}
                className="h-[320px] shrink-0"
              />
            </div>
          ) : null}

          {activeTab === 'review' ? (
            <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
              <AnalysisPanel
                fen={displayFen}
                analysis={analysisForPanel}
                evalHistory={game.evalHistory}
                whiteScore={evaluation.score}
                whiteMate={evaluation.mate}
                feedback={displayFeedback}
                status={displayedStatus}
                engineStatus={engineStatus}
                analyzing={panelAnalyzing}
                onAnalyze={() => void handleAnalyze()}
                onCopyFen={() => void handleCopyFen()}
                onExportPgn={handleExportPgn}
              />
              <CoachChat
                messages={chat.messages}
                isTyping={chat.isTyping}
                context={coachContext}
                agentStyle={settings.agentStyle}
                onSend={handleChatSend}
                onClear={chat.clear}
                className="min-h-[320px] flex-1"
              />
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <SettingsPanel
              settingsController={settingsController}
              engineStatus={engineStatus}
              onPlayerColorChange={handlePlayerColorChange}
              onOpeningModeChange={handleOpeningModeChange}
            />
          ) : null}
        </aside>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
        <Toast toast={game.toast} onClose={game.clearToast} />
      </div>

      {showGameOver ? (
        <GameOverModal
          status={game.status}
          moves={game.moves}
          sessionColor={game.sessionColor}
          onClose={() => setDismissedResultFen(game.fen)}
          onNewGame={() => handleNewGame()}
          onReview={() => {
            setDismissedResultFen(game.fen);
            setReviewPly(null);
            setActiveTab('review');
          }}
        />
      ) : null}
    </div>
  );
}
