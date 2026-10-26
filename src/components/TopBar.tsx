import {
  Activity,
  BookOpen,
  CircleCheck,
  Cpu,
  Crown,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Settings2,
  Swords,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { EngineStatusSnapshot, TabId } from '../types';
import { Button, cx, IconButton } from './ui';

const TABS = [
  { id: 'course', label: 'Course', icon: GraduationCap, hint: 'Structured London System course' },
  { id: 'play', label: 'Play', icon: Swords, hint: 'Spar against Stockfish' },
  { id: 'learn', label: 'Learn', icon: BookOpen, hint: 'Guided London chapters' },
  { id: 'review', label: 'Review', icon: Activity, hint: 'Analyze and import games' },
  { id: 'settings', label: 'Settings', icon: Settings2, hint: 'Customize every detail' },
] as const;

export function TopBar({
  activeTab,
  onTabChange,
  engineStatus,
  soundEnabled,
  onToggleSound,
  onNewGame,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  engineStatus: EngineStatusSnapshot;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNewGame: () => void;
}) {
  const StatusIcon =
    engineStatus.state === 'ready'
      ? CircleCheck
      : engineStatus.state === 'fallback'
        ? TriangleAlert
        : LoaderCircle;

  return (
    <header className="sticky top-0 z-40 border-b border-white/7 bg-[#070b14]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-5 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-gradient-to-br from-amber-300/25 to-amber-700/10 shadow-lg shadow-amber-900/20">
            <span className="text-2xl leading-none text-amber-200">♞</span>
            <Crown className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-[0.16em] text-white">
              LONDON LAB
            </div>
            <div className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-slate-500 sm:block">
              Master the system
            </div>
          </div>
        </div>

        <nav className="scrollbar-thin order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-white/7 bg-black/20 p-1 lg:order-none lg:mx-auto lg:w-auto lg:max-w-[640px]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.hint}
                onClick={() => onTabChange(tab.id)}
                className={cx(
                  'flex min-w-[80px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition lg:flex-none',
                  active
                    ? 'bg-amber-300/14 text-amber-100 shadow-[inset_0_0_0_1px_rgba(233,185,73,0.25)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                )}
              >
                <Icon className="h-3.8 w-3.8" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div
            title={engineStatus.detail}
            className={cx(
              'hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.68rem] font-bold md:flex',
              engineStatus.state === 'ready'
                ? 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200'
                : engineStatus.state === 'fallback'
                  ? 'border-amber-300/25 bg-amber-300/8 text-amber-200'
                  : 'border-sky-300/20 bg-sky-300/8 text-sky-200',
            )}
          >
            <StatusIcon
              className={cx('h-3.5 w-3.5', engineStatus.state === 'loading' ? 'animate-spin' : '')}
            />
            <span>{engineStatus.label}</span>
            <Cpu className="h-3 w-3 opacity-60" />
          </div>
          <IconButton
            icon={soundEnabled ? Volume2 : VolumeX}
            label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            onClick={onToggleSound}
          />
          <Button variant="primary" size="sm" icon={RotateCcw} onClick={onNewGame}>
            <span className="hidden sm:inline">New game</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
