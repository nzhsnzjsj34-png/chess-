import {
  CheckCircle2,
  Circle,
  Clock3,
  GraduationCap,
  LockKeyhole,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { CourseLesson } from '../data/course';
import type { CourseLessonStatus, CourseProgressController } from '../hooks/useCourseProgress';
import {
  Badge,
  Button,
  Panel,
  ProgressBar,
  SectionHeading,
  cx,
} from './ui';

const STATUS_META: Record<
  CourseLessonStatus,
  { label: string; tone: 'neutral' | 'gold' | 'mint' | 'rose'; icon: typeof Circle }
> = {
  'not-started': { label: 'Not Started', tone: 'neutral', icon: Circle },
  'in-progress': { label: 'In Progress', tone: 'gold', icon: Play },
  completed: { label: 'Completed', tone: 'mint', icon: CheckCircle2 },
  locked: { label: 'Locked', tone: 'rose', icon: LockKeyhole },
};

export function CourseRoadmap({
  lessons,
  progress,
  activeLessonId,
  onOpenLesson,
  onStartCourse,
  onReset,
}: {
  lessons: CourseLesson[];
  progress: CourseProgressController;
  activeLessonId: string | null;
  onOpenLesson: (lessonId: string, stepIndex: number) => void;
  onStartCourse: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Panel className="p-3.5">
        <SectionHeading
          icon={GraduationCap}
          title="Learning roadmap"
          subtitle="A linear path from setup to attack."
          action={<Badge tone="gold">{lessons.length} lessons</Badge>}
        />
        <div className="mb-1.5 flex items-center justify-between text-[0.7rem]">
          <span className="font-semibold text-slate-400">Overall completion</span>
          <span className="font-mono font-bold text-amber-200">
            {Math.round(progress.overallPercent)}%
          </span>
        </div>
        <ProgressBar value={progress.overallPercent} />
        <div className="mt-2 flex items-center justify-between text-[0.64rem] text-slate-500">
          <span>
            {progress.completedStepCount}/{progress.totalSteps} steps
          </span>
          <span>{progress.completedLessonCount}/{lessons.length} lessons</span>
        </div>
        <Button variant="primary" size="sm" icon={Play} className="mt-3 w-full" onClick={onStartCourse}>
          {progress.continueLabel}
        </Button>
      </Panel>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="relative pl-7">
          <span className="absolute bottom-7 left-[13px] top-5 w-px bg-gradient-to-b from-amber-300/45 via-white/10 to-emerald-300/35" />
          <div className="space-y-2.5">
            {lessons.map((lesson) => {
              const status = progress.getLessonStatus(lesson.id);
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              const lessonProgress = progress.getLessonProgress(lesson.id);
              const resumeIndex = progress.getResumeIndex(lesson.id);
              const locked = status === 'locked';
              const active = activeLessonId === lesson.id;

              return (
                <div key={lesson.id} className="relative">
                  <span
                    className={cx(
                      'absolute -left-[27px] top-5 flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[0.62rem] font-black',
                      status === 'completed'
                        ? 'border-emerald-300/35 bg-emerald-300/15 text-emerald-200'
                        : status === 'in-progress' || active
                          ? 'border-amber-300/45 bg-amber-300/15 text-amber-100'
                          : 'border-white/10 bg-[#0b1424] text-slate-500',
                    )}
                  >
                    {status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : lesson.number}
                  </span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onOpenLesson(lesson.id, status === 'completed' ? 0 : resumeIndex)}
                    className={cx(
                      'group w-full rounded-2xl border p-3 text-left transition',
                      active
                        ? 'border-amber-300/40 bg-amber-300/8 shadow-lg shadow-amber-900/10'
                        : 'border-white/7 bg-white/2 hover:border-white/15 hover:bg-white/5',
                      locked ? 'cursor-not-allowed opacity-55 hover:border-white/7 hover:bg-white/2' : '',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[0.8rem] font-bold text-slate-100">
                          Lesson {lesson.number}: {lesson.title}
                        </div>
                        <div className="mt-0.5 truncate text-[0.66rem] text-slate-500">
                          {lesson.subtitle}
                        </div>
                      </div>
                      <Badge tone={meta.tone}>
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.68rem] leading-snug text-slate-400">
                      {lesson.description}
                    </p>
                    <ProgressBar
                      value={lessonProgress.percent}
                      accent={lesson.accent}
                      className="mt-2.5"
                    />
                    <div className="mt-2 flex items-center justify-between text-[0.62rem] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {lesson.estimatedMinutes} min
                      </span>
                      <span>{lessonProgress.completed}/{lessonProgress.total} steps</span>
                    </div>
                    {locked ? (
                      <div className="mt-2 text-[0.62rem] font-semibold text-rose-200/80">
                        Complete Lesson {lesson.number - 1} to unlock.
                      </div>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset} className="w-full">
        Reset course progress
      </Button>
    </div>
  );
}
