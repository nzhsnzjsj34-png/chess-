import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COURSE_LESSONS,
  COURSE_LESSON_IDS,
  COURSE_STEP_IDS,
  TOTAL_COURSE_STEPS,
  type CourseLesson,
} from '../data/course';

const COURSE_STORAGE_KEY = 'london-lab.course.v1';

export type CourseLessonStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'locked';

export interface CourseProgressState {
  version: number;
  started: boolean;
  completedStepIds: string[];
  completedLessonIds: string[];
  resumeStepIndex: Record<string, number>;
  lastLessonId: string | null;
}

export interface CourseProgressController {
  progress: CourseProgressState;
  overallPercent: number;
  completedStepCount: number;
  totalSteps: number;
  completedLessonCount: number;
  allComplete: boolean;
  continueLabel: string;
  continueTarget: { lessonId: string; stepIndex: number };
  getLessonStatus: (lessonId: string) => CourseLessonStatus;
  getLessonProgress: (lessonId: string) => { completed: number; total: number; percent: number };
  getResumeIndex: (lessonId: string) => number;
  isStepComplete: (stepId: string) => boolean;
  startLesson: (lessonId: string, stepIndex?: number) => void;
  goToStep: (lessonId: string, stepIndex: number) => void;
  completeStep: (lessonId: string, stepId: string, nextIndex: number) => void;
  completeLesson: (lessonId: string) => void;
  resetCourse: () => void;
}

const DEFAULT_PROGRESS: CourseProgressState = {
  version: 1,
  started: false,
  completedStepIds: [],
  completedLessonIds: [],
  resumeStepIndex: {},
  lastLessonId: null,
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readProgress(): CourseProgressState {
  try {
    const raw = localStorage.getItem(COURSE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<CourseProgressState>;
    const completedStepIds = Array.isArray(parsed.completedStepIds)
      ? parsed.completedStepIds.filter((id): id is string => typeof id === 'string' && COURSE_STEP_IDS.has(id))
      : [];
    const completedLessonIds = Array.isArray(parsed.completedLessonIds)
      ? parsed.completedLessonIds.filter(
          (id): id is string => typeof id === 'string' && COURSE_LESSON_IDS.has(id),
        )
      : [];
    const resumeStepIndex: Record<string, number> = {};
    if (parsed.resumeStepIndex && typeof parsed.resumeStepIndex === 'object') {
      for (const lesson of COURSE_LESSONS) {
        const value = (parsed.resumeStepIndex as Record<string, unknown>)[lesson.id];
        if (typeof value === 'number' && Number.isFinite(value)) {
          resumeStepIndex[lesson.id] = Math.round(clamp(value, 0, lesson.steps.length));
        }
      }
    }
    return {
      version: 1,
      started: Boolean(parsed.started),
      completedStepIds: unique(completedStepIds),
      completedLessonIds: unique(completedLessonIds),
      resumeStepIndex,
      lastLessonId:
        typeof parsed.lastLessonId === 'string' && COURSE_LESSON_IDS.has(parsed.lastLessonId)
          ? parsed.lastLessonId
          : null,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function useCourseProgress(): CourseProgressController {
  const [progress, setProgress] = useState<CourseProgressState>(readProgress);

  useEffect(() => {
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage failures should never block learning progress.
    }
  }, [progress]);

  const lessonMap = useMemo(
    () => new Map<string, CourseLesson>(COURSE_LESSONS.map((lesson) => [lesson.id, lesson])),
    [],
  );

  const completedStepSet = useMemo(
    () => new Set(progress.completedStepIds),
    [progress.completedStepIds],
  );
  const completedLessonSet = useMemo(
    () => new Set(progress.completedLessonIds),
    [progress.completedLessonIds],
  );

  const getLessonStatus = useCallback(
    (lessonId: string): CourseLessonStatus => {
      const lessonIndex = COURSE_LESSONS.findIndex((lesson) => lesson.id === lessonId);
      if (lessonIndex < 0) return 'locked';
      if (completedLessonSet.has(lessonId)) return 'completed';
      if (lessonIndex > 0 && !completedLessonSet.has(COURSE_LESSONS[lessonIndex - 1].id)) {
        return 'locked';
      }
      const lesson = COURSE_LESSONS[lessonIndex];
      const completed = lesson.steps.filter((step) => completedStepSet.has(step.id)).length;
      const resume = progress.resumeStepIndex[lessonId] ?? 0;
      if (progress.started && (progress.lastLessonId === lessonId || resume > 0 || completed > 0)) {
        return 'in-progress';
      }
      return 'not-started';
    },
    [completedLessonSet, completedStepSet, progress.lastLessonId, progress.resumeStepIndex, progress.started],
  );

  const getLessonProgress = useCallback(
    (lessonId: string) => {
      const lesson = lessonMap.get(lessonId);
      if (!lesson) return { completed: 0, total: 0, percent: 0 };
      const completed = lesson.steps.filter((step) => completedStepSet.has(step.id)).length;
      return {
        completed,
        total: lesson.steps.length,
        percent: (completed / Math.max(1, lesson.steps.length)) * 100,
      };
    },
    [completedStepSet, lessonMap],
  );

  const getResumeIndex = useCallback(
    (lessonId: string) => {
      const lesson = lessonMap.get(lessonId);
      const value = progress.resumeStepIndex[lessonId] ?? 0;
      return clamp(value, 0, Math.max(0, (lesson?.steps.length ?? 1) - 1));
    },
    [lessonMap, progress.resumeStepIndex],
  );

  const isStepComplete = useCallback(
    (stepId: string) => completedStepSet.has(stepId),
    [completedStepSet],
  );

  const startLesson = useCallback((lessonId: string, stepIndex = 0) => {
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    const safeIndex = clamp(stepIndex, 0, lesson.steps.length - 1);
    setProgress((current) => ({
      ...current,
      started: true,
      lastLessonId: lessonId,
      resumeStepIndex: {
        ...current.resumeStepIndex,
        [lessonId]: Math.max(current.resumeStepIndex[lessonId] ?? 0, safeIndex),
      },
    }));
  }, [lessonMap]);

  const goToStep = useCallback((lessonId: string, stepIndex: number) => {
    const lesson = lessonMap.get(lessonId);
    if (!lesson) return;
    const safeIndex = clamp(stepIndex, 0, lesson.steps.length - 1);
    setProgress((current) => ({
      ...current,
      started: true,
      lastLessonId: lessonId,
      resumeStepIndex: {
        ...current.resumeStepIndex,
        [lessonId]: Math.max(current.resumeStepIndex[lessonId] ?? 0, safeIndex),
      },
    }));
  }, [lessonMap]);

  const completeStep = useCallback(
    (lessonId: string, stepId: string, nextIndex: number) => {
      const lesson = lessonMap.get(lessonId);
      if (!lesson || !COURSE_STEP_IDS.has(stepId)) return;
      setProgress((current) => ({
        ...current,
        started: true,
        lastLessonId: lessonId,
        completedStepIds: unique([...current.completedStepIds, stepId]),
        resumeStepIndex: {
          ...current.resumeStepIndex,
          [lessonId]: Math.max(
            current.resumeStepIndex[lessonId] ?? 0,
            clamp(nextIndex, 0, lesson.steps.length),
          ),
        },
      }));
    },
    [lessonMap],
  );

  const completeLesson = useCallback(
    (lessonId: string) => {
      const lesson = lessonMap.get(lessonId);
      if (!lesson) return;
      setProgress((current) => ({
        ...current,
        started: true,
        lastLessonId: null,
        completedLessonIds: unique([...current.completedLessonIds, lessonId]),
        completedStepIds: unique([
          ...current.completedStepIds,
          ...lesson.steps.map((step) => step.id),
        ]),
        resumeStepIndex: {
          ...current.resumeStepIndex,
          [lessonId]: lesson.steps.length,
        },
      }));
    },
    [lessonMap],
  );

  const resetCourse = useCallback(() => setProgress(DEFAULT_PROGRESS), []);

  const completedStepCount = progress.completedStepIds.length;
  const overallPercent = (completedStepCount / Math.max(1, TOTAL_COURSE_STEPS)) * 100;
  const completedLessonCount = progress.completedLessonIds.length;
  const allComplete = COURSE_LESSONS.every((lesson) => completedLessonSet.has(lesson.id));

  const continueTarget = useMemo(() => {
    const target =
      COURSE_LESSONS.find((lesson) => !completedLessonSet.has(lesson.id)) ?? COURSE_LESSONS[0];
    return {
      lessonId: target.id,
      stepIndex: clamp(
        progress.resumeStepIndex[target.id] ?? 0,
        0,
        target.steps.length - 1,
      ),
    };
  }, [completedLessonSet, progress.resumeStepIndex]);

  const continueLabel = allComplete
    ? 'Review Course'
    : progress.started || completedStepCount > 0
      ? 'Continue Course'
      : 'Start Lesson 1';

  return {
    progress,
    overallPercent,
    completedStepCount,
    totalSteps: TOTAL_COURSE_STEPS,
    completedLessonCount,
    allComplete,
    continueLabel,
    continueTarget,
    getLessonStatus,
    getLessonProgress,
    getResumeIndex,
    isStepComplete,
    startLesson,
    goToStep,
    completeStep,
    completeLesson,
    resetCourse,
  };
}
