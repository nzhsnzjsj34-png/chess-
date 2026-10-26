import { useState } from 'react';
import {
  Bot,
  BrainCircuit,
  Cpu,
  Gauge,
  LockKeyhole,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  BOARD_THEMES,
  DIFFICULTY_PRESETS,
  SETTINGS_BOUNDS,
} from '../data/settings';
import type { SettingsController } from '../hooks/useSettings';
import { soundService } from '../services/soundService';
import type {
  AgentStyle,
  BoardThemeId,
  DifficultyId,
  EngineStatusSnapshot,
  OpeningMode,
  Orientation,
  PlayerColor,
} from '../types';
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

type SettingsSection = 'engine' | 'opening' | 'board' | 'coach';

const SECTIONS = [
  { id: 'engine' as const, label: 'Engine', icon: Cpu },
  { id: 'opening' as const, label: 'Opening', icon: LockKeyhole },
  { id: 'board' as const, label: 'Board', icon: Palette },
  { id: 'coach' as const, label: 'Coach', icon: BrainCircuit },
];

export function SettingsOverview({
  settingsController,
  engineStatus,
}: {
  settingsController: SettingsController;
  engineStatus: EngineStatusSnapshot;
}) {
  const { settings } = settingsController;
  return (
    <div className="flex h-full flex-col gap-3">
      <Panel className="p-4">
        <SectionHeading
          icon={SlidersHorizontal}
          title="Customization"
          subtitle="Every preference is saved locally in your browser."
          action={<Badge tone="mint">Autosaved</Badge>}
        />
        <div className="space-y-2.5 text-[0.75rem] leading-relaxed text-slate-400">
          <p>
            Tune the <strong className="text-slate-200">engine</strong> with Elo, Skill Level, search time, hash size, and MultiPV.
          </p>
          <p>
            Control the <strong className="text-slate-200">opening book</strong> from a gentle guide to a strict move filter.
          </p>
          <p>
            Choose a <strong className="text-slate-200">board theme</strong>, sounds, hints, arrows, and the coach’s teaching style.
          </p>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHeading icon={Cpu} title="Engine workers" subtitle={engineStatus.detail} />
        <div className="space-y-2.5">
          {[
            { label: 'Game search worker', value: engineStatus.workers.game },
            { label: 'Analysis worker', value: engineStatus.workers.analysis },
          ].map((worker) => (
            <div key={worker.label} className="flex items-center justify-between gap-3">
              <span className="text-[0.74rem] text-slate-300">{worker.label}</span>
              <Badge tone={worker.value === 'ready' ? 'mint' : worker.value === 'error' ? 'rose' : 'sky'}>
                {worker.value}
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-white/7 bg-black/15 p-3 text-[0.68rem] leading-snug text-slate-500">
          The bundled Stockfish 19 Lite WASM engine is single-threaded, so it works without
          cross-origin isolation headers. Two Web Workers keep playing and analysis responsive.
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHeading icon={Gauge} title="Current profile" subtitle="A quick snapshot of your training room." />
        <div className="space-y-2 text-[0.73rem]">
          {[
            ['Difficulty', `${settings.elo} Elo`],
            ['Search', `depth ${settings.analysisDepth} · ${settings.multiPv} lines`],
            ['Opening', settings.openingMode],
            ['Theme', BOARD_THEMES[settings.boardTheme].name],
            ['Coach', settings.agentStyle],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-slate-500">{label}</span>
              <span className="font-semibold capitalize text-slate-200">{value}</span>
            </div>
          ))}
        </div>
        <Button
          variant="danger"
          size="md"
          icon={RotateCcw}
          className="mt-4 w-full"
          onClick={settingsController.resetSettings}
        >
          Reset all settings
        </Button>
      </Panel>
    </div>
  );
}

export function SettingsPanel({
  settingsController,
  engineStatus,
  onPlayerColorChange,
  onOpeningModeChange,
}: {
  settingsController: SettingsController;
  engineStatus: EngineStatusSnapshot;
  onPlayerColorChange: (color: PlayerColor) => void;
  onOpeningModeChange: (mode: OpeningMode) => void;
}) {
  const { settings, updateSetting } = settingsController;
  const [section, setSection] = useState<SettingsSection>('engine');

  return (
    <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <Panel className="p-3.5">
        <SectionHeading
          icon={SlidersHorizontal}
          title="Full customization"
          subtitle="Tune engine, opening constraints, board, and coach."
        />
        <SegmentedControl
          value={section}
          options={SECTIONS.map((item) => ({ id: item.id, label: item.label }))}
          onChange={setSection}
          columns={4}
        />
      </Panel>

      {section === 'engine' ? (
        <>
          <Panel className="p-3.5">
            <SectionHeading icon={Bot} title="Playing strength" subtitle="Difficulty presets set several UCI options at once." />
            <div className="grid grid-cols-5 gap-1.5">
              {DIFFICULTY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => settingsController.applyDifficulty(preset.id as DifficultyId)}
                  title={preset.description}
                  className={cx(
                    'rounded-xl border px-1 py-2 text-center transition',
                    settings.difficulty === preset.id
                      ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                      : 'border-white/7 bg-white/2 text-slate-400 hover:bg-white/5',
                  )}
                >
                  <div className="text-[0.68rem] font-bold">{preset.shortLabel}</div>
                  <div className="mt-0.5 font-mono text-[0.56rem] opacity-70">{preset.elo}</div>
                </button>
              ))}
            </div>
            <div className="mt-1 divide-y divide-white/5">
              <Toggle
                checked={settings.limitStrength}
                onChange={(value) => updateSetting('limitStrength', value)}
                label="Limit engine strength"
                description="Uses UCI_LimitStrength and UCI_Elo for sparring."
                icon={Gauge}
              />
              <RangeField
                label="Target Elo"
                value={settings.elo}
                {...SETTINGS_BOUNDS.elo}
                onChange={(value) => updateSetting('elo', value)}
                format={(value) => `${value} Elo`}
                hint="Stockfish 19 Lite supports 1320–3190 Elo."
              />
              <RangeField
                label="Skill level"
                value={settings.skillLevel}
                {...SETTINGS_BOUNDS.skillLevel}
                onChange={(value) => updateSetting('skillLevel', value)}
                format={(value) => `${value} / 20`}
              />
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeading icon={Cpu} title="Search parameters" subtitle="Applied to the next engine request." />
            <div className="divide-y divide-white/5">
              <RangeField
                label="Bot think time"
                value={settings.moveTimeMs}
                {...SETTINGS_BOUNDS.moveTimeMs}
                onChange={(value) => updateSetting('moveTimeMs', value)}
                format={(value) => `${(value / 1000).toFixed(2)}s`}
              />
              <RangeField
                label="Live analysis depth"
                value={settings.analysisDepth}
                {...SETTINGS_BOUNDS.analysisDepth}
                onChange={(value) => updateSetting('analysisDepth', value)}
                format={(value) => `depth ${value}`}
              />
              <RangeField
                label="Principal variations"
                value={settings.multiPv}
                {...SETTINGS_BOUNDS.multiPv}
                onChange={(value) => updateSetting('multiPv', value)}
                format={(value) => `${value} line${value === 1 ? '' : 's'}`}
              />
              <RangeField
                label="Hash size"
                value={settings.hashSize}
                {...SETTINGS_BOUNDS.hashSize}
                onChange={(value) => updateSetting('hashSize', value)}
                format={(value) => `${value} MB`}
              />
            </div>
            <div className="mt-2 divide-y divide-white/5 border-t border-white/5">
              <Toggle
                checked={settings.autoAnalyze}
                onChange={(value) => updateSetting('autoAnalyze', value)}
                label="Auto-analyze every position"
                description="Keeps the evaluation bar and principal variations live."
                icon={Sparkles}
              />
            </div>
            <div className="mt-2 rounded-xl border border-white/7 bg-black/15 p-2.5 text-[0.67rem] text-slate-500">
              Engine status: <span className="font-semibold text-slate-300">{engineStatus.label}</span> · {engineStatus.detail}
            </div>
          </Panel>
        </>
      ) : null}

      {section === 'opening' ? (
        <>
          <Panel className="p-3.5">
            <SectionHeading icon={LockKeyhole} title="Opening constraints" subtitle="Control the first N plies of theory." />
            <div className="mb-3">
              <div className="mb-1.5 text-[0.72rem] font-semibold text-slate-400">Mode</div>
              <SegmentedControl
                value={settings.openingMode}
                options={[
                  { id: 'off', label: 'Off' },
                  { id: 'guided', label: 'Guide' },
                  { id: 'strict', label: 'Strict' },
                  { id: 'bot', label: 'Bot' },
                ]}
                onChange={onOpeningModeChange}
                columns={4}
              />
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-[0.72rem] font-semibold text-slate-400">Player color</div>
              <SegmentedControl
                value={settings.playerColor}
                options={[
                  { id: 'w', label: 'White' },
                  { id: 'b', label: 'Black' },
                ]}
                onChange={onPlayerColorChange}
                columns={2}
              />
              <p className="mt-1.5 text-[0.66rem] text-slate-500">
                Changing color starts a fresh game so the correct side is constrained.
              </p>
            </div>
            <RangeField
              label="Book length"
              value={settings.openingPlyLimit}
              {...SETTINGS_BOUNDS.openingPlyLimit}
              onChange={(value) => updateSetting('openingPlyLimit', value)}
              format={(value) => `${value} plies`}
              hint="Core London setup is usually complete by plies 8–10."
            />
            <div className="mt-1 divide-y divide-white/5 border-t border-white/5">
              <Toggle
                checked={settings.punishDeviations}
                onChange={(value) => updateSetting('punishDeviations', value)}
                label="Punish deviations"
                description="Remove Elo limits from the bot’s next search."
                icon={Sparkles}
              />
              <Toggle
                checked={settings.botBookReplies}
                onChange={(value) => updateSetting('botBookReplies', value)}
                label="Force bot book replies"
                description="Bot follows the London tree when it is its turn."
                icon={Bot}
              />
            </div>
          </Panel>
          <Panel className="p-3.5">
            <SectionHeading icon={LockKeyhole} title="How the modes work" />
            <div className="space-y-2 text-[0.72rem] leading-snug text-slate-400">
              <p><strong className="text-amber-100">Guide:</strong> highlights book moves but allows you to leave theory.</p>
              <p><strong className="text-amber-100">Strict:</strong> only book moves are legal while you play White.</p>
              <p><strong className="text-amber-100">Bot:</strong> the engine as White follows d4, Nf3, Bf4, e3, c3, and the book tree.</p>
              <p><strong className="text-amber-100">Punish:</strong> deviations trigger a full-strength tactical search.</p>
            </div>
          </Panel>
        </>
      ) : null}

      {section === 'board' ? (
        <>
          <Panel className="p-3.5">
            <SectionHeading icon={Palette} title="Board themes" subtitle="Click a palette to apply it instantly." />
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BOARD_THEMES).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updateSetting('boardTheme', theme.id as BoardThemeId)}
                  className={cx(
                    'rounded-xl border p-2.5 text-left transition',
                    settings.boardTheme === theme.id
                      ? 'border-amber-300/40 bg-amber-300/8'
                      : 'border-white/7 bg-white/2 hover:bg-white/5',
                  )}
                >
                  <div className="flex overflow-hidden rounded-lg border border-black/30">
                    <div className="h-9 flex-1" style={{ background: theme.light }} />
                    <div className="h-9 flex-1" style={{ background: theme.dark }} />
                    <div className="h-9 flex-1" style={{ background: theme.accent }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[0.73rem] font-bold text-slate-200">{theme.name}</span>
                    {settings.boardTheme === theme.id ? <Badge tone="gold">Active</Badge> : null}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[0.64rem] text-slate-500">
                    {theme.description}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeading icon={Palette} title="Board behavior" />
            <div className="mb-3">
              <div className="mb-1.5 text-[0.72rem] font-semibold text-slate-400">Orientation</div>
              <SegmentedControl
                value={settings.orientation}
                options={[
                  { id: 'auto', label: 'Auto' },
                  { id: 'white', label: 'White' },
                  { id: 'black', label: 'Black' },
                ]}
                onChange={(value) => updateSetting('orientation', value as Orientation)}
                columns={3}
              />
            </div>
            <div className="divide-y divide-white/5">
              <Toggle
                checked={settings.showCoordinates}
                onChange={(value) => updateSetting('showCoordinates', value)}
                label="Coordinates"
              />
              <Toggle
                checked={settings.showLegalMoves}
                onChange={(value) => updateSetting('showLegalMoves', value)}
                label="Legal move dots"
              />
              <Toggle
                checked={settings.showArrows}
                onChange={(value) => updateSetting('showArrows', value)}
                label="Lesson arrows"
              />
              <Toggle
                checked={settings.animatePieces}
                onChange={(value) => updateSetting('animatePieces', value)}
                label="Piece animations"
              />
              <Toggle
                checked={settings.showEvalBar}
                onChange={(value) => updateSetting('showEvalBar', value)}
                label="Evaluation bar"
              />
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeading icon={Volume2} title="Sound effects" subtitle="Synthesized locally with Web Audio." />
            <div className="divide-y divide-white/5">
              <Toggle
                checked={settings.soundEnabled}
                onChange={(value) => updateSetting('soundEnabled', value)}
                label="Enable sounds"
              />
              <RangeField
                label="Volume"
                value={settings.soundVolume}
                {...SETTINGS_BOUNDS.soundVolume}
                onChange={(value) => updateSetting('soundVolume', value)}
                format={(value) => `${Math.round(value * 100)}%`}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Volume2}
              className="mt-2 w-full"
              onClick={() =>
                soundService.play('castle', settings.soundEnabled, settings.soundVolume)
              }
            >
              Test sound
            </Button>
          </Panel>
        </>
      ) : null}

      {section === 'coach' ? (
        <>
          <Panel className="p-3.5">
            <SectionHeading icon={BrainCircuit} title="Coach behavior" subtitle="Shape how the agent explains positions." />
            <div className="mb-3">
              <div className="mb-1.5 text-[0.72rem] font-semibold text-slate-400">Teaching style</div>
              <SegmentedControl
                value={settings.agentStyle}
                options={[
                  { id: 'concise', label: 'Concise' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'deep', label: 'Deep' },
                  { id: 'socratic', label: 'Ask me' },
                ]}
                onChange={(value) => updateSetting('agentStyle', value as AgentStyle)}
                columns={4}
              />
            </div>
            <div className="divide-y divide-white/5">
              <Toggle
                checked={settings.coachTips}
                onChange={(value) => updateSetting('coachTips', value)}
                label="Live coaching tips"
                description="Classify moves as good, inaccurate, mistakes, or blunders."
                icon={Sparkles}
              />
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeading icon={Bot} title="LLM API integration" subtitle="Optional: point VITE_COACH_API_URL at your own server proxy." />
            <div className="rounded-xl border border-white/7 bg-black/15 p-3 text-[0.7rem] leading-relaxed text-slate-400">
              <p>
                The chat UI works out of the box with a context-aware local coach. To connect an LLM,
                set <code className="text-amber-200">VITE_COACH_API_URL</code> and provide a
                server-side proxy that accepts the JSON payload shown in{' '}
                <code className="text-amber-200">src/services/coachService.ts</code>.
              </p>
              <p className="mt-2 text-slate-500">
                Never place secret API keys in Vite environment variables — they are bundled into
                client code. Keep keys on the proxy.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[0.7rem]">
              <span className="text-slate-500">Current mode</span>
              <Badge tone={import.meta.env.VITE_COACH_API_URL ? 'mint' : 'gold'}>
                {import.meta.env.VITE_COACH_API_URL ? 'Remote proxy configured' : 'Local coach'}
              </Badge>
            </div>
          </Panel>

          <Panel className="p-3.5">
            <SectionHeading icon={Gauge} title="Training balance" subtitle="Your current coach and engine profile." />
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex justify-between text-[0.68rem] text-slate-400">
                  <span>Bot strength</span>
                  <span>{settings.elo} Elo</span>
                </div>
                <ProgressBar value={settings.elo - 1320} max={3190 - 1320} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[0.68rem] text-slate-400">
                  <span>Analysis depth</span>
                  <span>{settings.analysisDepth}</span>
                </div>
                <ProgressBar value={settings.analysisDepth} max={20} accent="#59d7b2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[0.68rem] text-slate-400">
                  <span>Opening constraint</span>
                  <span>{settings.openingPlyLimit} plies</span>
                </div>
                <ProgressBar value={settings.openingPlyLimit} max={18} accent="#a78bfa" />
              </div>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
