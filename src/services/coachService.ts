import { Chess, type Square } from 'chess.js';
import { getDifficultyPreset } from '../data/settings';
import { getLondonSetupStatus } from '../data/openingBook';
import type { ChatMessage, CoachContext, Settings } from '../types';
import {
  formatEvaluationLabel,
  formatScore,
  getGameStateInfo,
  getPhase,
  mateForWhite,
  pvToSan,
  scoreForWhite,
} from '../utils/chess';

export const COACH_GREETING =
  "Hi, I’m your **London Lab coach**. Ask me about the plan in this position, why a move was played, or how to meet Black’s setup. I can see the board, the engine line, and your last move.";

interface CoachRequest {
  question: string;
  history: ChatMessage[];
  context: CoachContext;
  settings: Settings;
}

function pieceAt(fen: string, square: Square, color: 'w' | 'b', type: string) {
  const piece = new Chess(fen).get(square);
  return piece?.color === color && piece.type === type;
}

function positionNotes(fen: string): string[] {
  const notes: string[] = [];
  const chess = new Chess(fen);
  const state = getGameStateInfo(fen);
  const phase = getPhase(fen);
  const setup = getLondonSetupStatus(fen);
  const completed = setup.filter((item) => item.done).length;

  notes.push(`The position is in the **${phase}** phase and it is **${chess.turn() === 'w' ? 'White' : 'Black'} to move**.`);
  notes.push(`${completed}/8 London setup markers are currently in place.`);
  if (state.inCheck) notes.push('Someone is in check — forcing moves come before strategic plans.');

  if (pieceAt(fen, 'g6', 'b', 'p') || pieceAt(fen, 'g7', 'b', 'b')) {
    notes.push(
      'Black has a **kingside fianchetto**. Preserve the dark-squared bishop with h3/Bh2, or meet ...e5 with a concrete central capture.',
    );
  }
  if (pieceAt(fen, 'c5', 'b', 'p')) {
    notes.push(
      'Black has played **...c5**, putting pressure on d4. The standard answer is c3; only take on c5 when it wins a tempo or creates a weakness.',
    );
  }
  if (pieceAt(fen, 'f5', 'b', 'b')) {
    notes.push(
      'Black’s bishop has reached **f5** outside the pawn chain. Bd3 or c4 are the principled ways to challenge it.',
    );
  }
  if (pieceAt(fen, 'f4', 'w', 'b')) {
    notes.push(
      'Your bishop on **f4** is active. If Black plays ...Nh5, keep it with Bg3 or Bh2 rather than trading your best piece prematurely.',
    );
  }
  if (pieceAt(fen, 'e5', 'w', 'n')) {
    notes.push(
      'The knight on **e5** signals the attacking phase. Look for Qf3/Qh5, f4, Rf3–h3, and h4–h5 — but only after king safety is secured.',
    );
  }
  if (pieceAt(fen, 'c4', 'w', 'p')) {
    notes.push(
      'White’s **c4** break opens queenside lines. It is especially useful against ...Bf5, Grünfeld setups, and passive ...c6 structures.',
    );
  }
  if (!pieceAt(fen, 'g1', 'w', 'k') && chess.turn() === 'w') {
    notes.push('Your king is not castled yet. Complete development before launching a pawn storm.');
  }

  return notes;
}

function evaluationNotes(context: CoachContext): string | null {
  if (!context.evaluation?.lines.length) {
    return 'Live evaluation is still calculating. Start with king safety, development, and the d4/e5 squares.';
  }
  const result = context.evaluation;
  const whiteCp = scoreForWhite(result);
  const whiteMate = mateForWhite(result);
  const score = formatScore(whiteCp, whiteMate);
  const label = formatEvaluationLabel(whiteCp, whiteMate);
  const pv = result.lines[0]?.pv.slice(0, 6) ?? [];
  const san = pvToSan(context.fen, pv);
  const line = san.length > 0 ? ` The main line starts **${san.join(' ')}**.` : '';
  return `Stockfish evaluates the displayed position at **${score}** — ${label}.${line}`;
}

function lastMoveNotes(context: CoachContext): string {
  if (!context.lastMoveSan) {
    return 'No move has been played from this position yet. Start with a central pawn move, then develop knights before bishops.';
  }
  const feedback = context.feedback;
  if (feedback) {
    return `Your last move was **${context.lastMoveSan}** (${context.lastMoveLan ?? '—'}). ${feedback.message}`;
  }
  return `Your last move was **${context.lastMoveSan}** (${context.lastMoveLan ?? '—'}). Check whether it helps d4, e5, development, or king safety.`;
}

const KNOWLEDGE: Array<{ test: RegExp; answer: string }> = [
  {
    test: /why|explain.*move|played|reason/i,
    answer:
      '**Why this move?** In the London, a good move usually does one of four jobs: support d4, fight for e5, develop a piece to its best square, or improve king safety. The key move order is d4, Nf3, Bf4, e3, c3, Nbd2, Bd3, and castling. Bf4 happens before e3 because the bishop otherwise gets trapped behind its own pawns.',
  },
  {
    test: /plan|strategy|idea|middlegame|attack/i,
    answer:
      '**White’s middlegame plan:** finish development, castle, then choose one attacking plan. The most thematic is Ne5 supported by d4/f4, followed by Qf3, Qh5, Rf3–h3, and h4–h5. A quieter plan is c4 and Rc1 for queenside pressure. Do not start h4 before your king is safe or before the center is locked.',
  },
  {
    test: /c5|qb6|queen.*b6|b2/i,
    answer:
      '**Against ...c5 and ...Qb6:** answer ...c5 with c3 to keep d4 protected. If Black plays ...Qb6, Qb3 is the common remedy: it covers b2, challenges the queen, and often improves White’s structure after ...Qxb3 axb3. If Black avoids the trade with ...c4, Qc2 keeps the queen safe and prepares b3 or e4.',
  },
  {
    test: /kid|king.?s indian|fianchetto|g6|bg7/i,
    answer:
      '**Against a King’s Indian setup:** do not play the standard setup blindly. Use h3 to give the bishop the h2 retreat square, castle quickly, and meet ...e5 with a concrete decision. White can choose c4 for queenside space or dxe5 followed by Bh2, keeping the dark-squared bishop on the long diagonal.',
  },
  {
    test: /grunfeld|grünfeld|d5.*g6/i,
    answer:
      '**Against a Grünfeld setup:** e3 and Be2 keep d4 defended while blunting the g7-bishop. After ...c5, c3 is the shock absorber. If Black adds ...Qb6, Qb3 challenges the queen; if Black pushes ...c4, Qc2 and later b3 undermine the pawn chain.',
  },
  {
    test: /bf5|bishop.*f5|anti.?london/i,
    answer:
      '**Against early ...Bf5:** Black’s bishop is outside the pawn chain and controls e4. White’s simplest answer is Bd3, offering a trade; c4 is a more ambitious alternative. After ...Bxd3 Qxd3, White keeps a healthy center and can prepare e4 with Nbd2 and castling.',
  },
  {
    test: /ne5|outpost|e5|attack.*king/i,
    answer:
      '**The e5 outpost:** d4 controls e5, and Nf3 is ready to occupy it. Ne5 is strongest when Black cannot capture the knight without opening the f-file. Typical follow-ups are f4, Qf3, Qh5, h4, and a rook lift. If Black can trade knights favorably, first improve your king or queen position.',
  },
  {
    test: /h4|h5|pawn storm|greek gift/i,
    answer:
      '**The h-pawn attack:** h4–h5 is a plan, not a reflex. It works best when your king is castled, the center is closed, Black’s king is on g8, and you control e5. Use h3 first as a luft and bishop retreat; push h4 only when ...g5 cannot trap your bishop.',
  },
  {
    test: /blunder|mistake|inaccuracy|bad|wrong|punish|deviation/i,
    answer:
      '**Punishing mistakes:** first calculate forcing moves — checks, captures, and threats. In London positions, pay special attention to e5, c7, h7, and the b2/f2 squares. If there is no tactic, simply improve your worst-placed piece and keep the center closed.',
  },
  {
    test: /opening|move order|first.*move|setup|theory/i,
    answer:
      '**The core move order is 1.d4 d5 2.Nf3 Nf6 3.Bf4.** Then e3, c3, Nbd2, Bd3, O-O. Nf3 comes before Bf4 to control e5; Bf4 comes before e3 so the bishop is not blocked; c3 comes before Nbd2 so the pawn can support d4.',
  },
  {
    test: /endgame|pawn structure|weakness/i,
    answer:
      '**London endgames:** the d4/e3/c3 triangle often gives White a stable space advantage. Trade pieces when you have more space only if it fixes a target. Create a second weakness with c4 or e4, and activate the king once queens are off.',
  },
  {
    test: /position|eval|analy|best move|engine|stockfish/i,
    answer:
      '**Position analysis:** compare king safety, material, pawn structure, piece activity, and the fight for e5. The evaluation bar shows the result from White’s perspective; the analysis panel translates Stockfish’s principal variation into SAN.',
  },
  {
    test: /lesson|chapter|learn|study/i,
    answer:
      '**How to study this chapter:** replay the line once without trying to memorize it, then replay it while naming the purpose of every White move. Finally, practice the position against the bot with opening constraints turned on.',
  },
];

function localAnswer(request: CoachRequest): string {
  const { question, context } = request;
  const match = KNOWLEDGE.find((entry) => entry.test.test(question));
  const notes = positionNotes(context.fen);
  const parts: string[] = [];

  if (match) parts.push(match.answer);
  else {
    parts.push(
      'For this London System position, start with the hierarchy: **king safety → tactics → center → piece activity → pawn breaks**. The plan changes depending on Black’s setup, so identify the key break before choosing a move.',
    );
  }

  parts.push(evaluationNotes(context) ?? '');
  parts.push(lastMoveNotes(context));

  if (context.openingHint && context.openingMode !== 'off') {
    parts.push(`**Opening book:** ${context.openingHint}`);
  }
  if (context.deviation) {
    parts.push(
      '**Deviation detected.** You left the guided book. Stockfish is searching at full strength for the most accurate punishment, so calculate forcing moves before returning to the system setup.',
    );
  }

  parts.push(`Position cues: ${notes.join(' ')}`);
  return styleAnswer(parts.filter(Boolean).join('\n\n'), request.settings);
}

function styleAnswer(answer: string, settings: Settings): string {
  const sections = answer.split('\n\n');
  if (settings.agentStyle === 'concise') {
    return `${sections.slice(0, 2).join('\n\n')}\n\n**Coach tip:** ${sections.at(-1)?.replace('Position cues: ', '') ?? ''}`;
  }
  if (settings.agentStyle === 'deep') {
    return `${answer}\n\n**Training checklist**\n• Can Black play ...c5, ...Qb6, ...Bf5, or ...Nh5?\n• Which side is better developed?\n• What changes after Ne5 or c4?`;
  }
  if (settings.agentStyle === 'socratic') {
    return `${answer}\n\n**Before you move:** which of Black’s pieces is worst placed, and can one move improve both that observation and your control of e5?`;
  }
  return answer;
}

function systemPrompt(settings: Settings, context: CoachContext): string {
  const preset = getDifficultyPreset(settings.difficulty);
  return [
    'You are London Lab Coach, a grandmaster-level chess teacher specializing in the London System.',
    `Use a ${settings.agentStyle} teaching style. Student level: ${preset.label}.`,
    'Be concrete, tactically honest, and concise. Use SAN when referring to moves.',
    'Never invent a legal move; use the provided FEN, PGN, and engine line as ground truth.',
    'Explain plans around d4, e3, c3, Bf4, Nf3-e5, c4/e4 pawn breaks, and king safety.',
    `Current FEN: ${context.fen}`,
  ].join(' ');
}

async function callRemoteCoach(request: CoachRequest): Promise<string | null> {
  const url = import.meta.env.VITE_COACH_API_URL;
  if (!url) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system: systemPrompt(request.settings, request.context),
        style: request.settings.agentStyle,
        question: request.question,
        context: request.context,
        messages: request.history.slice(-10).map((message) => ({
          role: message.role === 'coach' ? 'assistant' : 'user',
          content: message.text,
        })),
      }),
    });
    if (!response.ok) throw new Error(`Coach API returned ${response.status}`);
    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    const reply =
      (typeof data.reply === 'string' && data.reply) ||
      (typeof data.message === 'string' && data.message) ||
      (typeof data.content === 'string' && data.content) ||
      choices?.[0]?.message?.content;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generateCoachReply(request: CoachRequest): Promise<string> {
  try {
    const remote = await callRemoteCoach(request);
    if (remote) return remote;
  } catch {
    // A local, context-aware coach is always available without an API.
  }

  const latency = 380 + Math.min(700, request.question.length * 8);
  await new Promise((resolve) => window.setTimeout(resolve, latency));
  return localAnswer(request);
}
