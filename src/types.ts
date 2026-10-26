import type { Color, Piece, PieceSymbol, Square } from 'chess.js';

export type { Color, Piece, PieceSymbol, Square } from 'chess.js';

export type TabId = 'play' | 'learn' | 'review' | 'settings';
export type BoardThemeId = 'midnight' | 'walnut' | 'emerald' | 'arctic';
export type DifficultyId = 'beginner' | 'casual' | 'club' | 'expert' | 'grandmaster';
export type OpeningMode = 'off' | 'guided' | 'strict' | 'bot';
export type AgentStyle = 'concise' | 'balanced' | 'deep' | 'socratic';
export type Orientation = 'auto' | 'white' | 'black';
export type PlayerColor = Color;
export type Grade =
  | 'book'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'unknown';

export interface Settings {
  version: number;
  playerColor: PlayerColor;
  difficulty: DifficultyId;
  limitStrength: boolean;
  elo: number;
  skillLevel: number;
  moveTimeMs: number;
  analysisDepth: number;
  multiPv: number;
  hashSize: number;
  openingMode: OpeningMode;
  openingPlyLimit: number;
  punishDeviations: boolean;
  botBookReplies: boolean;
  boardTheme: BoardThemeId;
  orientation: Orientation;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  showArrows: boolean;
  animatePieces: boolean;
  showEvalBar: boolean;
  autoAnalyze: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  coachTips: boolean;
  agentStyle: AgentStyle;
}

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  description: string;
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
  accent: string;
  accentSoft: string;
  boardEdge: string;
}

export interface BoardArrow {
  from: Square;
  to: Square;
  color?: string;
  label?: string;
}

export interface LegalMoveDescriptor {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  uci: string;
}

export interface FlyingMove {
  id: number;
  from: Square;
  to: Square;
  piece: Piece;
}

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreCp: number;
  mate?: number;
  nodes?: number;
  timeMs?: number;
  pv: string[];
  bestMove?: string;
}

export interface EngineSearchResult {
  fen: string;
  sideToMove: Color;
  bestMove?: string;
  ponder?: string;
  depth: number;
  lines: EngineLine[];
  elapsedMs: number;
  fallback?: boolean;
}

export interface MoveFeedback {
  grade: Grade;
  title: string;
  message: string;
  cpLoss?: number;
  bestMoveSan?: string;
  playedSan?: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
}

export interface MoveRecord {
  number: number;
  san: string;
  lan: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  fen: string;
  isBook: boolean;
  isDeviation: boolean;
  engineReply?: boolean;
  feedback?: MoveFeedback;
  timestamp: number;
}

export interface GameStateInfo {
  over: boolean;
  title: string;
  detail: string;
  winner?: Color | 'draw';
  reason?: string;
  inCheck: boolean;
  checkSquare?: Square;
}

export interface LessonStep {
  moveIndex: number;
  title: string;
  explanation: string;
  tip: string;
  arrows: BoardArrow[];
  highlights: Square[];
}

export interface LessonChapter {
  id: string;
  title: string;
  subtitle: string;
  family: string;
  level: 'Foundation' | 'Core' | 'Advanced';
  summary: string;
  objective: string;
  accent: string;
  moves: string[];
  steps: LessonStep[];
}

export interface LessonFrame {
  index: number;
  step: LessonStep;
  fen: string;
  san: string | null;
  moveNumber: number;
  sideToMove: Color;
}

export interface ChatMessage {
  id: string;
  role: 'coach' | 'user';
  text: string;
  createdAt: number;
  pending?: boolean;
}

export interface CoachContext {
  fen: string;
  pgn: string;
  lastMoveSan?: string;
  lastMoveLan?: string;
  evaluation?: EngineSearchResult | null;
  feedback?: MoveFeedback | null;
  lessonTitle?: string;
  lessonStepTitle?: string;
  openingHint?: string;
  deviation?: boolean;
  playerColor: PlayerColor;
  difficultyLabel: string;
  openingMode: OpeningMode;
  reviewMode?: boolean;
}

export interface EngineStatusSnapshot {
  state: 'loading' | 'ready' | 'fallback';
  label: string;
  detail: string;
  workers: {
    game: 'loading' | 'ready' | 'error';
    analysis: 'loading' | 'ready' | 'error';
  };
}
