import { useCallback, useEffect, useMemo, useState } from 'react';
import { LESSON_CHAPTERS } from '../data/lessons';
import type { LessonChapter, LessonFrame } from '../types';
import { lessonToFrames } from '../utils/chess';

export interface LessonPlayerController {
  chapter: LessonChapter;
  frames: LessonFrame[];
  frame: LessonFrame;
  stepIndex: number;
  playing: boolean;
  chapters: LessonChapter[];
  selectChapter: (id: string) => void;
  goToStep: (index: number) => void;
  next: () => void;
  previous: () => void;
  restart: () => void;
  togglePlay: () => void;
}

export function useLessonPlayer(): LessonPlayerController {
  const [chapterId, setChapterId] = useState(LESSON_CHAPTERS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const chapter = useMemo(
    () => LESSON_CHAPTERS.find((item) => item.id === chapterId) ?? LESSON_CHAPTERS[0],
    [chapterId],
  );
  const frames = useMemo(() => lessonToFrames(chapter), [chapter]);
  const frame = frames[Math.min(stepIndex, frames.length - 1)];

  const selectChapter = useCallback((id: string) => {
    setChapterId(id);
    setStepIndex(0);
    setPlaying(false);
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(Math.max(0, Math.min(frames.length - 1, index)));
      setPlaying(false);
    },
    [frames.length],
  );

  const next = useCallback(() => {
    setStepIndex((current) => Math.min(frames.length - 1, current + 1));
  }, [frames.length]);

  const previous = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const restart = useCallback(() => {
    setStepIndex(0);
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => setPlaying((current) => !current), []);

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStepIndex((current) => Math.min(frames.length - 1, current + 1));
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [playing, stepIndex, frames.length]);

  return {
    chapter,
    frames,
    frame,
    stepIndex,
    playing,
    chapters: LESSON_CHAPTERS,
    selectChapter,
    goToStep,
    next,
    previous,
    restart,
    togglePlay,
  };
}
