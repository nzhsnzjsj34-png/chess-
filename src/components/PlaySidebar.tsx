import {
  BookOpen,
  Bot,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Gauge,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { DIFFICULTY_PRESETS, getDifficultyPreset } from '../data/settings';
import type { LondonGameController } from '../hooks/useLondonGame';
import type { DeviationDrill } from '../data/openingBook';
import type { SettingsController } from '../hooks/useSettings';
import type { DifficultyId, OpeningMode, PlayerColor, Settings } from '../types';
import {
  Badge,
  Button,
  Panel,
  ProgressBar,
  RangeField,
  SectionHeading,
  SegmentedControl,
  Toggle,
  cx,
} from './ui';

const COLOR_OPTIONS = [
  { id: 'w' as const, label: 'Play White', title: 'You practice the London System' },
  { id: 'b' as const, label: 'Play Black', title: 'Stockfish plays the London System' },
];

const OPENING_OPTIONS = [
  { id: 'off' as const, label: 'Off', title: 'No opening constraints' },
  { id: 'guided' as const, label: 'Guide', title: 'Highlight book moves but allow deviations' },
  { id: 'strict' as const, label: 'Strict', title: 'Only London book moves are legal' },
  { id: 'bot' as const, label: 'Bot', title: 'Force the bot to play the London System' },
];

export function PlaySidebar({
  settings,
  settingsController,
  game,
  onPlayerColorChange,
  onOpeningModeChange,
  onStartDrill,
}: {
  settings: Settings;
  settingsController: SettingsController;
  game: LondonGameController;
  onPlayerColorChange: (color: PlayerColor) => void;
  onOpeningModeChange: (mode: OpeningMode) => void;
  onStartDrill: (drill: DeviationDrill) => void;
}) {
  const preset = getDifficultyPreset(settings.difficulty);
  const setupDone = game.setupStatus.filter((item) => item.done).length;
  const bookPercent = Math.min(100, (game.openingStatus.ply / settings.openingPlyLimit) * 100);

  return (
    <div className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto pr-0.5">
      <Panel className="p-3.5">
        <SectionHeading
          icon={Bot}
          title="Sparring setup"
          subtitle="Choose your side and the engine's playing strength."
          action={
            <Badge tone={game.thinking ? 'gold' : 'mint'}>
              {game.thinking ? 'Thinking' : 'Ready'}
            </Badge>
          }
        />
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[0.72rem] font-semibold text-slate-400">Your color</div>
            <SegmentedControl
              value={game.sessionColor}
              options={COLOR_OPTIONS}
              onChange={onPlayerColorChange}
              columns={2}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[0.72rem] font-semibold text-slate-400">Difficulty</span>
              <span className="font-mono text-[0.68rem] text-amber-200">{settings.elo} Elo</span>
            </div>
            <SegmentedControl
              value={settings.difficulty}
              options={DIFFICULTY_PRESETS.map((item) => ({
                id: item.id as DifficultyId,
                label: item.shortLabel,
                title: `${item.label} — ${item.description}`,
              }))}
              onChange={settingsController.applyDifficulty}
              columns={5}
            />
            <div className="mt-2 rounded-xl border border-white/7 bg-black/15 p-2.5">
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-xs font-bold text-slate-200">{preset.label}</span>
              </div>
              <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">
                {preset.description}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/7 bg-white/3 p-2.5">
              <Clock3 className="h-3.5 w-3.5 text-sky-300" />
              <div className="mt-1 text-sm font-bold text-slate-100">
                {(settings.moveTimeMs / 1000).toFixed(1)}s
              </div>
              <div className="text-[0.64rem] text-slate-500">Think time</div>
            </div>
            <div className="rounded-xl border border-white/7 bg-white/3 p-2.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              <div className="mt-1 text-sm font-bold text-slate-100">
                {settings.analysisDepth}
              </div>
              <div className="text-[0.64rem] text-slate-500">Analysis depth</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading
          icon={LockKeyhole}
          title="Opening constraint"
          subtitle="Force the first moves into London theory."
        />
        <SegmentedControl
          value={settings.openingMode}
          options={OPENING_OPTIONS}
          onChange={onOpeningModeChange}
          columns={4}
        />
        <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-2.5">
          <div className="flex items-start gap-2">
            <BookOpen className="mt-0.5 h-3.8 w-3.8 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <div className="text-[0.72rem] font-bold text-amber-100">
                {game.openingStatus.label}
              </div>
              <div className="mt-0.5 text-[0.66rem] leading-snug text-slate-400">
                Ply {game.openingStatus.ply} of {settings.openingPlyLimit} ·{' '}
                {game.openingStatus.inBook ? 'inside theory' : 'outside theory'}
              </div>
            </div>
          </div>
          <ProgressBar value={bookPercent} className="mt-2.5" />
          {game.openingStatus.recommendedSan.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {game.openingStatus.recommendedSan.slice(0, 6).map((san) => (
                <Badge key={san} tone="gold">{san}</Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-1 divide-y divide-white/5">
          <Toggle
            checked={settings.punishDeviations}
            onChange={(value) => settingsController.updateSetting('punishDeviations', value)}
            label="Punish deviations"
            description="Full-strength search after you leave the book."
            icon={Zap}
          />
          <Toggle
            checked={settings.botBookReplies}
            onChange={(value) => settingsController.updateSetting('botBookReplies', value)}
            label="Bot book replies"
            description="Bot follows theory for the constrained plies."
            icon={Bot}
          />
        </div>
        <RangeField
          label="Opening book length"
          value={settings.openingPlyLimit}
          min={6}
          max={18}
          step={2}
          onChange={(value) => settingsController.updateSetting('openingPlyLimit', value)}
          format={(value) => `${value} plies`}
        />
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading
          icon={ShieldCheck}
          title="London setup"
          subtitle="The eight development markers."
          action={<span className="font-mono text-xs font-bold text-amber-200">{setupDone}/8</span>}
        />
        <ProgressBar value={setupDone} max={8} accent="#59d7b2" />
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
          {game.setupStatus.map((item) => (
            <div
              key={item.id}
              title={item.hint}
              className={cx(
                'flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[0.67rem]',
                item.done ? 'text-emerald-200' : 'text-slate-500',
              )}
            >
              {item.done ? (
                <CircleCheck className="h-3 w-3 shrink-0" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 opacity-60" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-3.5">
        <SectionHeading
          icon={Target}
          title="Deviation drills"
          subtitle="Practice punishing non-London setups."
        />
        <div className="space-y-1.5">
          {game.drills.map((drill) => (
            <button
              key={drill.id}
              type="button"
              onClick={() => onStartDrill(drill)}
              className={cx(
                'group flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
                game.drill?.id === drill.id
                  ? 'border-amber-300/35 bg-amber-300/8'
                  : 'border-white/7 bg-white/2 hover:border-white/15 hover:bg-white/5',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.74rem] font-bold text-slate-200">{drill.name}</div>
                <div className="truncate text-[0.65rem] text-slate-500">{drill.description}</div>
              </div>
              <Badge tone="rose">{drill.tag}</Badge>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-300" />
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2 pb-1">
        <Button variant="secondary" icon={RotateCcw} onClick={game.takeBack}>
          Take back
        </Button>
        <Button variant="secondary" icon={Sparkles} onClick={() => void game.analyzeNow()}>
          Analyze
        </Button>
      </div>
    </div>
  );
}
