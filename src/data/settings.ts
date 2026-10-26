import type {
  BoardTheme,
  BoardThemeId,
  DifficultyId,
  Settings,
} from '../types';

export const SETTINGS_STORAGE_KEY = 'london-lab.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  playerColor: 'w',
  difficulty: 'club',
  limitStrength: true,
  elo: 1800,
  skillLevel: 10,
  moveTimeMs: 700,
  analysisDepth: 12,
  multiPv: 3,
  hashSize: 32,
  openingMode: 'guided',
  openingPlyLimit: 10,
  punishDeviations: true,
  botBookReplies: true,
  boardTheme: 'midnight',
  orientation: 'auto',
  showCoordinates: true,
  showLegalMoves: true,
  showArrows: true,
  animatePieces: true,
  showEvalBar: true,
  autoAnalyze: true,
  soundEnabled: true,
  soundVolume: 0.45,
  coachTips: true,
  agentStyle: 'balanced',
};

export interface DifficultyPreset {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  description: string;
  elo: number;
  skillLevel: number;
  moveTimeMs: number;
  analysisDepth: number;
  limitStrength: boolean;
}

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    shortLabel: 'New',
    description: 'Relaxed replies and obvious tactical gifts.',
    elo: 1320,
    skillLevel: 0,
    moveTimeMs: 250,
    analysisDepth: 7,
    limitStrength: true,
  },
  {
    id: 'casual',
    label: 'Casual',
    shortLabel: 'Easy',
    description: 'A forgiving sparring partner for building habits.',
    elo: 1500,
    skillLevel: 5,
    moveTimeMs: 400,
    analysisDepth: 9,
    limitStrength: true,
  },
  {
    id: 'club',
    label: 'Club player',
    shortLabel: 'Club',
    description: 'Sound positional play with occasional tactical tests.',
    elo: 1800,
    skillLevel: 10,
    moveTimeMs: 700,
    analysisDepth: 12,
    limitStrength: true,
  },
  {
    id: 'expert',
    label: 'Expert',
    shortLabel: 'Strong',
    description: 'Sharp calculation and disciplined London plans.',
    elo: 2250,
    skillLevel: 16,
    moveTimeMs: 1100,
    analysisDepth: 15,
    limitStrength: true,
  },
  {
    id: 'grandmaster',
    label: 'Grandmaster',
    shortLabel: 'GM',
    description: 'Full-strength search; strength is limited only by time.',
    elo: 3000,
    skillLevel: 20,
    moveTimeMs: 1600,
    analysisDepth: 18,
    limitStrength: false,
  },
];

export function getDifficultyPreset(id: DifficultyId): DifficultyPreset {
  return DIFFICULTY_PRESETS.find((preset) => preset.id === id) ?? DIFFICULTY_PRESETS[2];
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blue glass with warm gold accents.',
    light: '#d9e2ef',
    dark: '#506884',
    lightText: '#26364f',
    darkText: '#dce8f7',
    accent: '#e9b949',
    accentSoft: 'rgba(233, 185, 73, 0.32)',
    boardEdge: '#111b2d',
  },
  walnut: {
    id: 'walnut',
    name: 'Walnut',
    description: 'Classic wooden tournament-board warmth.',
    light: '#efd8ad',
    dark: '#9a6640',
    lightText: '#6d4529',
    darkText: '#f8e9cf',
    accent: '#4fd1a5',
    accentSoft: 'rgba(79, 209, 165, 0.28)',
    boardEdge: '#3d2418',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Muted green felt with a cool mint accent.',
    light: '#e7efe4',
    dark: '#6d9a83',
    lightText: '#315446',
    darkText: '#edf9f2',
    accent: '#7dd3fc',
    accentSoft: 'rgba(125, 211, 252, 0.28)',
    boardEdge: '#132c24',
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic',
    description: 'Clean slate, ice, and electric violet highlights.',
    light: '#f1f5f9',
    dark: '#94a3b8',
    lightText: '#334155',
    darkText: '#f8fafc',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.3)',
    boardEdge: '#1e293b',
  },
};

export const SETTINGS_BOUNDS = {
  elo: { min: 1320, max: 3190, step: 20 },
  skillLevel: { min: 0, max: 20, step: 1 },
  moveTimeMs: { min: 150, max: 2500, step: 50 },
  analysisDepth: { min: 6, max: 20, step: 1 },
  multiPv: { min: 1, max: 4, step: 1 },
  hashSize: { min: 16, max: 256, step: 16 },
  openingPlyLimit: { min: 6, max: 18, step: 2 },
  soundVolume: { min: 0, max: 1, step: 0.05 },
} as const;

export function sanitizeSettings(input: Partial<Settings> | null | undefined): Settings {
  if (!input || typeof input !== 'object') return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...input } as Settings;
  const ids: BoardThemeId[] = ['midnight', 'walnut', 'emerald', 'arctic'];
  const difficulties: DifficultyId[] = ['beginner', 'casual', 'club', 'expert', 'grandmaster'];
  const modes = ['off', 'guided', 'strict', 'bot'] as const;
  const styles = ['concise', 'balanced', 'deep', 'socratic'] as const;
  const orientations = ['auto', 'white', 'black'] as const;

  merged.version = 1;
  merged.playerColor = merged.playerColor === 'b' ? 'b' : 'w';
  merged.difficulty = difficulties.includes(merged.difficulty) ? merged.difficulty : 'club';
  merged.limitStrength = typeof merged.limitStrength === 'boolean' ? merged.limitStrength : true;
  merged.boardTheme = ids.includes(merged.boardTheme) ? merged.boardTheme : 'midnight';
  merged.openingMode = modes.includes(merged.openingMode) ? merged.openingMode : 'guided';
  merged.agentStyle = styles.includes(merged.agentStyle) ? merged.agentStyle : 'balanced';
  merged.orientation = orientations.includes(merged.orientation)
    ? merged.orientation
    : 'auto';
  merged.elo = clamp(merged.elo, 1320, 3190);
  merged.skillLevel = Math.round(clamp(merged.skillLevel, 0, 20));
  merged.moveTimeMs = Math.round(clamp(merged.moveTimeMs, 150, 5000));
  merged.analysisDepth = Math.round(clamp(merged.analysisDepth, 5, 22));
  merged.multiPv = Math.round(clamp(merged.multiPv, 1, 4));
  merged.hashSize = Math.round(clamp(merged.hashSize, 8, 512));
  merged.openingPlyLimit = Math.round(clamp(merged.openingPlyLimit, 4, 24));
  merged.soundVolume = clamp(merged.soundVolume, 0, 1);
  return merged;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
