import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  Lightbulb,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import { Chess, type Move as ChessMove, type PieceSymbol, type Square } from 'chess.js';
import type { CourseLesson, CourseStep } from '../data/course';
import type {
  BoardTheme,
  FlyingMove,
  LegalMoveDescriptor,
  Settings,
} from '../types';
import { moveToUci } from '../utils/chess';
import { soundService } from '../services/soundService';
import { ChessBoard } from './ChessBoard';
import { Badge, Button, Panel, ProgressBar, cx } from './ui';

export function CourseLessonBoardPanel({
  lesson,
  step,
  stepIndex,
  stepComplete,
  theme,
  orientation,
  settings,
  wrongMessage,
  hintVisible,
  onWrong,
  onCorrect,
  onToggleHint,
  onStepComplete,
  onNext,
  onPrevious,
  onFinish,
  onExit,
}: {
  lesson: CourseLesson;
  step: CourseStep;
  stepIndex: number;
  stepComplete: boolean;
  theme: BoardTheme;
  orientation: 'white' | 'black';
  settings: Settings;
  wrongMessage: string | null;
  hintVisible: boolean;
  onWrong: (message: string | null) => void;
  onCorrect: () => void;
  onToggleHint: () => void;
  onStepComplete: (stepId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [flying, setFlying] = useState<FlyingMove | null>(null);
  const timerRef = useRef<number | null>(null);
  const complete = stepComplete || justCompleted;
  const boardFen = complete ? step.afterFen : step.beforeFen;
  const isFinalStep = stepIndex === lesson.steps.length - 1;
  const canAdvance = !step.isDrill || complete;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    clearTimer();
    setJustCompleted(false);
    setFlying(null);
  }, [clearTimer, step.id]);

  const legalChess = useMemo(() => new Chess(step.beforeFen), [step.beforeFen]);

  const getLegalMoves = useCallback(
    (square: Square): LegalMoveDescriptor[] => {
      if (!step.isDrill || complete) return [];
      const moves = legalChess.moves({ square, verbose: true }) as ChessMove[];
      return moves.map((move) => ({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        uci: moveToUci(move),
      }));
    },
    [complete, legalChess, step.isDrill],
  );

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!step.isDrill || complete || !step.expectedUci) return;
      const played = `${from}${to}${promotion ?? ''}`;

      if (played === step.expectedUci) {
        clearTimer();
        onWrong(null);
        const piece = legalChess.get(from);
        if (piece && settings.animatePieces) {
          setFlying({ id: Date.now() + Math.random(), from, to, piece });
        }
        const finish = () => {
          setJustCompleted(true);
          setFlying(null);
          onStepComplete(step.id);
          onCorrect();
          soundService.play('success', settings.soundEnabled, settings.soundVolume);
        };
        if (settings.animatePieces) timerRef.current = window.setTimeout(finish, 155);
        else finish();
        return;
      }

      const isLegal = (legalChess.moves({ verbose: true }) as ChessMove[]).some(
        (move) => moveToUci(move) === played,
      );
      onWrong(
        `${isLegal ? 'That is a legal move, but it is not the course move.' : 'That is not a legal move in this position.'} ${step.wrongHint}`,
      );
      soundService.play('error', settings.soundEnabled, settings.soundVolume);
    },
    [
      clearTimer,
      complete,
      legalChess,
      onCorrect,
      onStepComplete,
      onWrong,
      settings.animatePieces,
      settings.soundEnabled,
      settings.soundVolume,
      step.expectedUci,
      step.id,
      step.isDrill,
      step.wrongHint,
    ],
  );

  const handleBlockedMove = useCallback(
    (_from: Square, _to: Square) => {
      if (!step.isDrill || complete) return;
      onWrong(
        `That square is not part of the highlighted London move. ${step.wrongHint} Try the arrow on the board again.`,
      );
      soundService.play('error', settings.soundEnabled, settings.soundVolume);
    },
    [complete, onWrong, settings.soundEnabled, settings.soundVolume, step.isDrill, step.wrongHint],
  );

  const handleNext = () => {
    if (!canAdvance) return;
    if (isFinalStep) onFinish();
    else onNext();
  };

  const progressPercent = ((stepIndex + 1) / Math.max(1, lesson.steps.length)) * 100;
  const lastMove =
    complete && step.from && step.to ? { from: step.from, to: step.to } : null;

  return (
    <div className="flex flex-col gap-3">
      <Panel soft className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onExit} title="Back to roadmap" />
          <div className="mr-auto min-w-0">
            <div className="truncate text-[0.82rem] font-bold text-white">
              Lesson {lesson.number}: {lesson.title}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-slate-500">
              <span>Step {stepIndex + 1} of {lesson.steps.length}</span>
              <span>•</span>
              <span>{step.title}</span>
            </div>
          </div>
          <Badge tone={step.isDrill ? 'gold' : 'sky'}>
            {step.isDrill ? <MousePointerClick className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            {step.isDrill ? 'Play the move' : 'Instruction'}
          </Badge>
          {complete ? (
            <Badge tone="mint">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          ) : null}
          <Button
            variant={hintVisible ? 'primary' : 'secondary'}
            size="sm"
            icon={Lightbulb}
            onClick={onToggleHint}
            title={hintVisible ? 'Hide move hint' : 'Reveal move hint'}
          >
            {hintVisible ? 'Hide hint' : 'Hint'}
          </Button>
        </div>
        <ProgressBar value={progressPercent} accent={lesson.accent} className="mt-2.5" />
      </Panel>

      <ChessBoard
        fen={boardFen}
        theme={theme}
        orientation={orientation}
        interactiveColor={step.isDrill && !complete ? 'w' : null}
        lastMove={lastMove}
        arrows={step.arrows}
        highlights={step.highlights}
        hintSquares={step.to ? [step.to] : []}
        flying={flying}
        showCoordinates={settings.showCoordinates}
        showLegalMoves={settings.showLegalMoves}
        showArrows={settings.showArrows}
        disabled={!step.isDrill || complete}
        ariaLabel={`Course drill board: ${step.title}`}
        getLegalMoves={getLegalMoves}
        onMove={handleMove}
        onBlockedMove={handleBlockedMove}
      />

      {wrongMessage ? (
        <div
          key={wrongMessage}
          className="drill-error fade-rise flex items-start gap-2.5 rounded-2xl border border-rose-300/25 bg-rose-300/7 p-3"
          role="alert"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
          <div>
            <div className="text-[0.76rem] font-bold text-white">Not quite — try again</div>
            <p className="mt-0.5 text-[0.71rem] leading-snug text-slate-300">{wrongMessage}</p>
            {hintVisible && step.san ? (
              <p className="mt-1 text-[0.68rem] text-amber-200">
                Hint: play <strong>{step.moveNumber}. {step.san}</strong> from {step.from} to {step.to}.
              </p>
            ) : null}
          </div>
        </div>
      ) : complete ? (
        <div className="fade-rise flex items-start gap-2.5 rounded-2xl border border-emerald-300/25 bg-emerald-300/7 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
          <div>
            <div className="text-[0.76rem] font-bold text-white">
              Correct — {isFinalStep ? 'lesson ready to finish' : 'next step unlocked'}
            </div>
            <p className="mt-0.5 text-[0.71rem] leading-snug text-slate-300">
              {step.san
                ? `${step.moveNumber}. ${step.san} is exactly the move this position needs. ${step.plan}`
                : 'Step complete. Continue to the next idea.'}
            </p>
          </div>
        </div>
      ) : step.isDrill ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300/25 bg-amber-300/7 p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <div>
            <div className="text-[0.76rem] font-bold text-white">Your move: White to play</div>
            <p className="mt-0.5 text-[0.71rem] leading-snug text-slate-300">
              Play the highlighted move on the board. Next Step stays locked until the correct move is made.
            </p>
            {hintVisible && step.san ? (
              <p className="mt-1 text-[0.68rem] text-amber-200">
                Hint: <strong>{step.moveNumber}. {step.san}</strong> · {step.from} → {step.to}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-sky-300/20 bg-sky-300/6 p-3">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
          <div>
            <div className="text-[0.76rem] font-bold text-white">Read the idea, then continue</div>
            <p className="mt-0.5 text-[0.71rem] leading-snug text-slate-300">
              This step sets up the next drill. Use Next Step when you are ready.
            </p>
          </div>
        </div>
      )}

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={onPrevious}
            disabled={stepIndex === 0}
          >
            Previous Step
          </Button>
          <div className="min-w-[120px] flex-1">
            <ProgressBar value={progressPercent} accent={lesson.accent} />
          </div>
          <Button
            variant="primary"
            icon={ChevronRight}
            onClick={handleNext}
            disabled={!canAdvance}
            title={canAdvance ? undefined : 'Play the highlighted move first'}
            className={cx(!canAdvance ? 'opacity-55' : '')}
          >
            {isFinalStep ? 'Finish Lesson' : 'Next Step'}
          </Button>
        </div>
        {!canAdvance ? (
          <p className="mt-2 text-center text-[0.65rem] text-slate-500">
            Play the correct move on the board to unlock Next Step.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
