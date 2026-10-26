import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  LockKeyhole,
  MousePointerClick,
  Play,
  Target,
} from 'lucide-react';
import type { CourseLesson } from '../data/course';
import type { CourseProgressController } from '../hooks/useCourseProgress';
import { Badge, Button, Panel, ProgressBar, SectionHeading, cx } from './ui';

export function CourseOverviewPanel({
  lessons,
  progress,
  onStartCourse,
  onOpenFreePlay,
  className,
}: {
  lessons: CourseLesson[];
  progress: CourseProgressController;
  onStartCourse: () => void;
  onOpenFreePlay: () => void;
  className?: string;
}) {
  const nextLesson =
    lessons.find((lesson) => lesson.id === progress.continueTarget.lessonId) ?? lessons[0];

  return (
    <div className={cx('flex min-h-0 flex-col gap-3', className)}>
      <Panel className="p-3.5">
        <SectionHeading
          icon={GraduationCap}
          title="How the course works"
          subtitle="A focused path with active recall."
          action={<Badge tone="mint">Saved</Badge>}
        />
        <div className="space-y-2.5">
          {[
            {
              icon: BookOpen,
              title: 'Read the plan',
              text: 'Each step explains the move, the strategy, and White’s next idea.',
            },
            {
              icon: MousePointerClick,
              title: 'Play the highlighted move',
              text: 'The board shows the from-square and target. You must make the move to advance.',
            },
            {
              icon: Lightbulb,
              title: 'Learn from mistakes',
              text: 'A wrong move explains what went wrong and asks you to try again.',
            },
            {
              icon: LockKeyhole,
              title: 'Unlock lessons in order',
              text: 'Finishing a lesson opens the next stage of the roadmap.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-2.5 rounded-xl border border-white/7 bg-white/2 p-2.5">
                <Icon className="mt-0.5 h-3.8 w-3.8 shrink-0 text-amber-300" />
                <div>
                  <div className="text-[0.72rem] font-bold text-slate-200">{item.title}</div>
                  <div className="mt-0.5 text-[0.66rem] leading-snug text-slate-500">{item.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading
          icon={Target}
          title="Your next objective"
          subtitle={`Lesson ${nextLesson.number} of ${lessons.length}`}
        />
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/6 p-3">
          <div className="text-[0.84rem] font-bold text-white">{nextLesson.title}</div>
          <p className="mt-1 text-[0.7rem] leading-snug text-slate-300">{nextLesson.objective}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {nextLesson.outcomes.slice(0, 3).map((outcome) => (
              <Badge key={outcome} tone="gold">{outcome}</Badge>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[0.65rem] text-slate-500">
            <span>Lesson progress</span>
            <span>
              {progress.getLessonProgress(nextLesson.id).completed}/
              {progress.getLessonProgress(nextLesson.id).total}
            </span>
          </div>
          <ProgressBar
            value={progress.getLessonProgress(nextLesson.id).percent}
            accent={nextLesson.accent}
          />
        </div>
        <Button variant="primary" size="md" icon={Play} className="mt-3 w-full" onClick={onStartCourse}>
          {progress.continueLabel}
        </Button>
        <Button variant="ghost" size="sm" icon={CheckCircle2} className="mt-1 w-full" onClick={onOpenFreePlay}>
          Prefer open-ended practice?
        </Button>
      </Panel>

      <Panel className="p-3.5" soft>
        <SectionHeading icon={CheckCircle2} title="Course outcomes" subtitle="What you will be able to do." />
        <div className="flex flex-wrap gap-1.5">
          {[
            'Build the London setup',
            'Control e5',
            'Answer ...Qb6',
            'Handle ...Bf5',
            'Meet fianchetto defenses',
            'Launch Ne5/f4 attacks',
            'Punish early deviations',
          ].map((item) => (
            <Badge key={item} tone="sky">{item}</Badge>
          ))}
        </div>
      </Panel>
    </div>
  );
}
