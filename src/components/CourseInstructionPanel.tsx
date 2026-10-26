import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  GraduationCap,
  Lightbulb,
  MousePointerClick,
  Swords,
  Target,
} from 'lucide-react';
import type { CourseLesson, CourseStep } from '../data/course';
import type { CourseProgressController } from '../hooks/useCourseProgress';
import {
  Badge,
  Button,
  Panel,
  ProgressBar,
  RichText,
  SectionHeading,
  cx,
} from './ui';

export function CourseInstructionPanel({
  lesson,
  step,
  stepIndex,
  stepComplete,
  progress,
  wrongMessage,
  hintVisible,
  onToggleHint,
  onExit,
  onFreePractice,
  className,
}: {
  lesson: CourseLesson;
  step: CourseStep;
  stepIndex: number;
  stepComplete: boolean;
  progress: CourseProgressController;
  wrongMessage: string | null;
  hintVisible: boolean;
  onToggleHint: () => void;
  onExit: () => void;
  onFreePractice: () => void;
  className?: string;
}) {
  const lessonProgress = progress.getLessonProgress(lesson.id);

  return (
    <div className={cx('scrollbar-thin flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5', className)}>
      <Panel className="p-3.5">
        <SectionHeading
          icon={GraduationCap}
          title="Instruction panel"
          subtitle={`Lesson ${lesson.number} · Step ${stepIndex + 1}/${lesson.steps.length}`}
          action={
            <Badge tone={stepComplete ? 'mint' : step.isDrill ? 'gold' : 'sky'}>
              {stepComplete ? <CheckCircle2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
              {stepComplete ? 'Complete' : step.isDrill ? 'Drill' : 'Concept'}
            </Badge>
          }
        />
        <ProgressBar value={lessonProgress.percent} accent={lesson.accent} />
        <div className="mt-2 flex items-center justify-between text-[0.64rem] text-slate-500">
          <span>{lessonProgress.completed}/{lessonProgress.total} lesson steps</span>
          <span>{Math.round(progress.overallPercent)}% course</span>
        </div>
      </Panel>

      <Panel className="p-3.5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black"
            style={{
              color: lesson.accent,
              borderColor: `${lesson.accent}55`,
              background: `${lesson.accent}12`,
            }}
          >
            {stepIndex + 1}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-white">{step.title}</h2>
            <div className="font-mono text-[0.68rem] text-amber-200">
              {step.san ? `Move ${step.moveNumber} · ${step.san}` : 'Key concept'}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[0.79rem] leading-relaxed text-slate-200">{step.instruction}</p>

        <div className="mt-3 rounded-xl border border-sky-300/18 bg-sky-300/5 p-3">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-sky-200">
            <BookOpen className="h-3.5 w-3.5" /> Why this move?
          </div>
          <p className="mt-1.5 text-[0.73rem] leading-relaxed text-slate-300">{step.why}</p>
        </div>

        <div className="mt-2.5 rounded-xl border border-amber-300/18 bg-amber-300/5 p-3">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-amber-200">
            <Target className="h-3.5 w-3.5" /> White’s plan
          </div>
          <p className="mt-1.5 text-[0.73rem] leading-relaxed text-slate-300">{step.plan}</p>
        </div>

        {step.highlights.length > 0 ? (
          <div className="mt-3">
            <div className="mb-1.5 text-[0.64rem] font-bold uppercase tracking-wider text-slate-500">
              Key squares
            </div>
            <div className="flex flex-wrap gap-1">
              {[...new Set(step.highlights)].map((square) => (
                <Badge key={square} tone="sky">{square}</Badge>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel className="p-3.5" soft>
        <SectionHeading
          icon={step.isDrill ? MousePointerClick : Lightbulb}
          title={step.isDrill ? 'Play the move' : 'Ready to continue'}
          subtitle={
            step.isDrill
              ? 'The board arrow shows the source and target.'
              : 'No board move is required for this concept.'
          }
        />

        {step.isDrill ? (
          <div
            className={cx(
              'rounded-xl border p-3',
              wrongMessage
                ? 'border-rose-300/25 bg-rose-300/6'
                : stepComplete
                  ? 'border-emerald-300/25 bg-emerald-300/6'
                  : 'border-amber-300/20 bg-amber-300/5',
            )}
          >
            <div className="flex items-center gap-2">
              {wrongMessage ? (
                <CircleAlert className="h-4 w-4 text-rose-200" />
              ) : stepComplete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : (
                <MousePointerClick className="h-4 w-4 text-amber-200" />
              )}
              <div className="text-[0.75rem] font-bold text-white">
                {wrongMessage
                  ? 'Incorrect — try again'
                  : stepComplete
                    ? 'Move verified'
                    : 'White to move'}
              </div>
            </div>
            <p className="mt-1.5 text-[0.7rem] leading-snug text-slate-300">
              {wrongMessage
                ? wrongMessage
                : stepComplete
                  ? `${step.san} was the correct continuation. You may now advance.`
                  : 'Make the highlighted move on the board. A wrong move will not advance the lesson.'}
            </p>
            {hintVisible && step.san ? (
              <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/6 px-2.5 py-2 font-mono text-[0.72rem] text-amber-100">
                {step.moveNumber}. {step.san} · {step.from} → {step.to}
              </div>
            ) : null}
            <Button
              variant={hintVisible ? 'primary' : 'secondary'}
              size="sm"
              icon={Lightbulb}
              className="mt-2.5 w-full"
              onClick={onToggleHint}
            >
              {hintVisible ? 'Hide move' : 'Reveal move hint'}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-sky-300/18 bg-sky-300/5 p-3 text-[0.72rem] leading-snug text-slate-300">
            <RichText text={`**${lesson.objective}**`} />
          </div>
        )}
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading icon={CheckCircle2} title="Lesson outcomes" subtitle="What you are training." />
        <div className="space-y-1.5">
          {lesson.outcomes.map((outcome) => (
            <div key={outcome} className="flex items-start gap-2 text-[0.7rem] text-slate-400">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
              <span>{outcome}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onExit}>
            Roadmap
          </Button>
          <Button variant="secondary" size="sm" icon={Swords} onClick={onFreePractice}>
            Free practice
          </Button>
        </div>
      </Panel>
    </div>
  );
}
