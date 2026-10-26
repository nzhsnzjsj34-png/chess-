import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MousePointerClick,
  Play,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import {
  TOTAL_COURSE_DRILLS,
  type CourseLesson,
  type CourseStep,
} from '../data/course';
import type { CourseProgressController } from '../hooks/useCourseProgress';
import type { BoardTheme, Settings } from '../types';
import { ChessBoard } from './ChessBoard';
import { Badge, Button, Panel, ProgressBar, cx } from './ui';

export function CourseWelcome({
  lessons,
  progress,
  previewStep,
  theme,
  orientation,
  settings,
  onStartCourse,
  onOpenFreePlay,
}: {
  lessons: CourseLesson[];
  progress: CourseProgressController;
  previewStep: CourseStep;
  theme: BoardTheme;
  orientation: 'white' | 'black';
  settings: Settings;
  onStartCourse: () => void;
  onOpenFreePlay: () => void;
}) {
  const percent = Math.round(progress.overallPercent);
  const targetLesson = lessons.find((lesson) => lesson.id === progress.continueTarget.lessonId);

  return (
    <div className="flex flex-col gap-3">
      <Panel className="course-hero relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-300/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-300/6 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="gold">
                <GraduationCap className="h-3 w-3" />
                Interactive course
              </Badge>
              <Badge tone="mint">
                <MousePointerClick className="h-3 w-3" />
                Play-the-move drills
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
              Master the London System in four guided lessons.
            </h1>
            <p className="mt-2 max-w-xl text-[0.82rem] leading-relaxed text-slate-300">
              Start with the pawn structure, complete your development, answer Black’s main
              setups, and finish with the Ne5 attack. Every key move is played on the board, not
              just watched.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="lg" icon={Play} onClick={onStartCourse}>
                {progress.continueLabel}
              </Button>
              <Button variant="secondary" size="lg" icon={Swords} onClick={onOpenFreePlay}>
                Skip to free play
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                Progress saved locally
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3 text-sky-300" />
                {targetLesson ? `Next: Lesson ${targetLesson.number}` : 'Course complete'}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-300" />
                {TOTAL_COURSE_DRILLS} play-the-move drills
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center">
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#e9b949 ${percent}%, rgba(148,175,214,0.13) ${percent}% 100%)`,
              }}
              aria-label={`Course ${percent}% complete`}
            >
              <div className="flex h-[5.6rem] w-[5.6rem] flex-col items-center justify-center rounded-full border border-white/10 bg-[#0b1424]">
                <span className="text-xl font-black text-white">{percent}%</span>
                <span className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-500">
                  complete
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[0.65rem] font-semibold text-slate-400">
            <span>Course progress</span>
            <span>{progress.completedStepCount}/{progress.totalSteps} steps</span>
          </div>
          <ProgressBar value={progress.overallPercent} />
        </div>
      </Panel>

      <div className="relative">
        <ChessBoard
          fen={previewStep.beforeFen}
          theme={theme}
          orientation={orientation}
          interactiveColor={null}
          arrows={previewStep.arrows}
          highlights={previewStep.highlights}
          hintSquares={previewStep.to ? [previewStep.to] : []}
          showCoordinates={settings.showCoordinates}
          showLegalMoves={false}
          showArrows={settings.showArrows}
          disabled
          ariaLabel="Course preview board showing the first London setup move"
        />
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-[#0b1424]/82 px-2.5 py-1 text-[0.65rem] font-bold text-amber-100 backdrop-blur">
          <BookOpen className="h-3 w-3" />
          Course preview · Lesson 1
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: 'Learn the idea',
            text: 'Short instructions explain why each move matters.',
            tone: 'sky',
          },
          {
            icon: MousePointerClick,
            title: 'Play the move',
            text: 'Correct moves unlock the next step; wrong moves get instant coaching.',
            tone: 'gold',
          },
          {
            icon: ArrowRight,
            title: 'Follow the path',
            text: 'Four sequential lessons take you from setup to attack.',
            tone: 'mint',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={cx(
                'rounded-2xl border border-white/7 bg-white/2 p-3',
                item.tone === 'gold' ? 'sm:border-amber-300/20 sm:bg-amber-300/4' : '',
              )}
            >
              <Icon className="h-4 w-4 text-amber-200" />
              <div className="mt-2 text-[0.74rem] font-bold text-slate-100">{item.title}</div>
              <div className="mt-0.5 text-[0.66rem] leading-snug text-slate-500">{item.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
