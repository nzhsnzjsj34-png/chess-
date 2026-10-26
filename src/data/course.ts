import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { BoardArrow } from '../types';
import { LESSON_CHAPTERS } from './lessons';

const GOLD = '#f0b94b';
const MINT = '#59d7b2';
const SKY = '#72c9ff';
const ROSE = '#ff8da1';
const VIOLET = '#c4b5fd';

const a = (from: Square, to: Square, color = GOLD, label?: string): BoardArrow => ({
  from,
  to,
  color,
  label,
});

function chapterLine(id: string): string[] {
  return LESSON_CHAPTERS.find((chapter) => chapter.id === id)?.moves ?? [];
}

/** Shared, fully legal move sequences from the existing theory database. */
const CORE_LINE = chapterLine('spine');
const CLASSICAL_LINE = chapterLine('classical');
const QB6_LINE = chapterLine('qb6');
const KID_LINE = chapterLine('kings-indian');
const DEVIATION_LINE = chapterLine('deviations');

/** Short branch for the early ...Bf5 anti-London idea. */
const EARLY_BF5_LINE = [
  'd2d4', 'd7d5', 'g1f3', 'c8f5', 'c2c4',
  'e7e6', 'b1c3', 'g8f6', 'c1f4',
];

/** Aggressive London setup built from the Queen's Indian line. */
const TACTICAL_LINE = [
  ...chapterLine('qid'),
  'g7g6', 'd1h5', 'g8g7', 'h2h4',
];

export interface CourseStepDefinition {
  id: string;
  title: string;
  instruction: string;
  why: string;
  plan: string;
  wrongHint: string;
  line?: string[];
  moveIndex?: number;
  startMoveIndex?: number;
  arrows?: BoardArrow[];
  highlights?: Square[];
}

export interface CourseLessonDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  objective: string;
  outcomes: string[];
  accent: string;
  estimatedMinutes: number;
  relatedChapterId: string;
  steps: CourseStepDefinition[];
}

export interface CourseStep extends CourseStepDefinition {
  lessonId: string;
  index: number;
  beforeFen: string;
  afterFen: string;
  expectedUci?: string;
  san?: string;
  from?: Square;
  to?: Square;
  promotion?: PieceSymbol;
  moveNumber: number;
  sideToMove: Color;
  isDrill: boolean;
  arrows: BoardArrow[];
  highlights: Square[];
}

export interface CourseLesson extends Omit<CourseLessonDefinition, 'steps'> {
  steps: CourseStep[];
}

const COURSE_LESSON_DEFINITIONS: CourseLessonDefinition[] = [
  {
    id: 'lesson-1',
    number: 1,
    title: 'Core Setup & Pawn Structure',
    subtitle: 'Build the London pyramid',
    description:
      'Learn the first five White moves that define the London System and understand the pawn triangle behind them.',
    objective:
      'Play d4, Nf3, Bf4, e3, and c3 in the correct order while Black develops naturally.',
    outcomes: [
      'Understand why Bf4 comes before e3',
      'Recognize the d4/e3/c3 pawn triangle',
      'Know how c3 answers ...c5',
    ],
    accent: GOLD,
    estimatedMinutes: 8,
    relatedChapterId: 'spine',
    steps: [
      {
        id: 'l1-intro',
        title: 'The London blueprint',
        instruction:
          'You are White. Your first task is to build a stable center before choosing an attacking plan. Watch the highlighted move, then play it on the board.',
        why:
          'The London System is a development scheme rather than a forced tactical line. Every early move supports d4 or controls e5.',
        plan:
          'Aim for d4, Nf3, Bf4, e3, c3, Nbd2, Bd3, and castling. After that, choose between Ne5/f4 and c4.',
        wrongHint: 'This step is an introduction; use Next Step to begin.',
        line: CORE_LINE,
        startMoveIndex: 0,
        arrows: [a('d2', 'd4'), a('g1', 'f3', MINT), a('c1', 'f4', SKY)],
        highlights: ['d4', 'f3', 'f4', 'e3', 'c3'],
      },
      {
        id: 'l1-d4',
        title: 'Claim the center with d4',
        instruction:
          'Play the opening pawn move that takes space and controls c5/e5.',
        why:
          '1.d4 fights for the center immediately and opens the c1-bishop’s diagonal. It also fixes White’s central space advantage.',
        plan:
          'Keep the d-pawn protected. Later, e3 and c3 turn d4 into the point of a sturdy pawn triangle.',
        wrongHint:
          'A wing pawn does not fight for the center. The London begins by occupying d4 and controlling e5/c5.',
        line: CORE_LINE,
        moveIndex: 0,
        highlights: ['d4', 'e5', 'c5'],
      },
      {
        id: 'l1-nf3',
        title: 'Develop the king’s knight to f3',
        instruction:
          'Bring the g1-knight to f3, where it controls e5 and prepares kingside castling.',
        why:
          '2.Nf3 is more flexible than an immediate c4. The knight supports the d4 pawn and is ready to jump to e5 later.',
        plan:
          'Treat e5 as your most important outpost. Nf3 is the piece that makes Ne5 possible.',
        wrongHint:
          'That move does not control e5 or prepare castling. The f3-knight is the soul of the London setup.',
        line: CORE_LINE,
        moveIndex: 2,
        arrows: [a('f3', 'e5', MINT, 'outpost')],
        highlights: ['f3', 'e5'],
      },
      {
        id: 'l1-bf4',
        title: 'Solve the problem bishop with Bf4',
        instruction:
          'Move the c1-bishop outside the pawn chain before playing e3.',
        why:
          'If White plays e3 too early, the c1-bishop becomes trapped. 3.Bf4 develops it actively and keeps the e5 square under control.',
        plan:
          'From f4 the bishop can retreat to g3 or h2 after ...Bd6 or ...Nh5. Keep this bishop as a long-term asset.',
        wrongHint:
          'That move leaves the dark-squared bishop behind its own pawns. Bf4 must happen before e3.',
        line: CORE_LINE,
        moveIndex: 4,
        arrows: [a('f4', 'g3', SKY, 'retreat')],
        highlights: ['f4', 'g3', 'h2'],
      },
      {
        id: 'l1-e3',
        title: 'Support d4 with e3',
        instruction:
          'Play the e-pawn one square to support d4 and open the f1-bishop’s diagonal.',
        why:
          'The bishop is already on f4, so e3 no longer traps it. White now has a compact, hard-to-attack center.',
        plan:
          'Do not rush e4. Keep the center closed until your king is safe and your pieces are developed.',
        wrongHint:
          'That move weakens or ignores the d4 point. e3 makes the center solid and opens f1 for the bishop.',
        line: CORE_LINE,
        moveIndex: 6,
        highlights: ['e3', 'd4', 'c3'],
      },
      {
        id: 'l1-c3',
        title: 'Answer ...c5 with c3',
        instruction:
          'Black has challenged d4 with ...c5. Reinforce the center with c3.',
        why:
          'c3 is the London shock absorber: it keeps d4 protected and avoids opening the center while White is still developing.',
        plan:
          'After c3, continue with Nbd2 and Bd3. Only capture on c5 when it wins a tempo or creates a weakness.',
        wrongHint:
          'Capturing or ignoring ...c5 too early can activate Black’s pieces. c3 keeps the center closed and protected.',
        line: CORE_LINE,
        moveIndex: 8,
        arrows: [a('c5', 'd4', ROSE, 'pressure')],
        highlights: ['c3', 'd4', 'c5'],
      },
      {
        id: 'l1-recap',
        title: 'Core setup complete',
        instruction:
          'You have built the London pyramid. The next lesson adds the remaining minor pieces and castling.',
        why:
          'This structure gives White a clear plan: finish development, control e5, and choose a pawn break only when the position is ready.',
        plan:
          'Remember the order: d4, Nf3, Bf4, e3, c3. The move order is more important than memorizing long variations.',
        wrongHint: 'Recap complete.',
        line: CORE_LINE,
        startMoveIndex: 9,
        arrows: [a('b1', 'd2', MINT), a('f1', 'd3', SKY), a('f3', 'e5', GOLD)],
        highlights: ['d4', 'e3', 'c3', 'f3', 'f4'],
      },
    ],
  },
  {
    id: 'lesson-2',
    number: 2,
    title: 'Development & Minor Pieces',
    subtitle: 'Complete the London setup',
    description:
      'Place the remaining knights and bishops, castle, and occupy the e5 outpost with a clear attacking plan.',
    objective:
      'Coordinate Nbd2, Bg3, Bd3, O-O, and Ne5 without weakening the center.',
    outcomes: [
      'Understand why Nbd2 is preferred to Nc3',
      'Keep the London bishop with Bg3',
      'Castle before starting an attack',
      'Use e5 as the main knight outpost',
    ],
    accent: MINT,
    estimatedMinutes: 9,
    relatedChapterId: 'classical',
    steps: [
      {
        id: 'l2-intro',
        title: 'From setup to coordination',
        instruction:
          'The pawn skeleton is in place. Now develop every minor piece toward the center and the black kingside.',
        why:
          'A system opening only works if every piece has a purpose. White’s pieces should coordinate around d4 and e5.',
        plan:
          'Nbd2, Bg3, Bd3, O-O, and Ne5 form the classical attacking setup.',
        wrongHint: 'This step is an introduction; use Next Step to begin.',
        line: CLASSICAL_LINE,
        startMoveIndex: 10,
        arrows: [a('b1', 'd2'), a('f4', 'g3', SKY), a('f1', 'd3', VIOLET)],
        highlights: ['d2', 'g3', 'd3', 'e5'],
      },
      {
        id: 'l2-nbd2',
        title: 'Play Nbd2, not Nc3',
        instruction:
          'Develop the b1-knight to d2 so the c-pawn can keep supporting d4.',
        why:
          'Nc3 would block the c-pawn and make the center less flexible. Nbd2 supports e4 and keeps the London structure intact.',
        plan:
          'From d2 the knight can reroute through f1 to g3 or e3, or simply support a central pawn break.',
        wrongHint:
          'That knight move blocks the c-pawn or ignores d4. Nbd2 keeps the c3/d4 pawn triangle harmonious.',
        line: CLASSICAL_LINE,
        moveIndex: 10,
        arrows: [a('d2', 'f1', SKY, 'reroute')],
        highlights: ['d2', 'c3', 'd4'],
      },
      {
        id: 'l2-bg3',
        title: 'Preserve the bishop with Bg3',
        instruction:
          'Black has played ...Bd6. Retreat the active bishop to g3 instead of allowing a passive trade.',
        why:
          'Bg3 keeps the bishop on the board and supports e5. If Black takes on g3, hxg3 gives White the half-open h-file.',
        plan:
          'After hxg3, the h-pawn can become an attacking unit with h4–h5, but only after castling.',
        wrongHint:
          'Trading your best bishop too early gives up pressure on e5. Bg3 keeps the tension.',
        line: CLASSICAL_LINE,
        moveIndex: 12,
        arrows: [a('h2', 'h4', ROSE, 'after hxg3')],
        highlights: ['g3', 'e5', 'h4'],
      },
      {
        id: 'l2-bd3',
        title: 'Develop the bishop to d3',
        instruction:
          'Place the f1-bishop on d3, aiming at h7 and clearing the kingside for castling.',
        why:
          'Bd3 is the most active square for the light-squared bishop. It supports e4 and can join a kingside attack.',
        plan:
          'Once the bishop leaves f1, White can castle. A safe king is the green light for Ne5 and h4.',
        wrongHint:
          'That bishop move does not fight for e4 or h7. Bd3 completes the minor-piece development.',
        line: CLASSICAL_LINE,
        moveIndex: 14,
        highlights: ['d3', 'h7', 'e4'],
      },
      {
        id: 'l2-castle',
        title: 'Castle kingside',
        instruction:
          'Move your king to safety before starting the attacking phase.',
        why:
          'Pawn storms and rook lifts require a secure king. Castling also connects the rooks and prepares central play.',
        plan:
          'After O-O, ask three questions: is my king safe, is the center stable, and can my pieces reach e5?',
        wrongHint:
          'Launching an attack before castling can backfire. King safety comes before h4 or g4.',
        line: CLASSICAL_LINE,
        moveIndex: 16,
        highlights: ['g1', 'e5', 'h4'],
      },
      {
        id: 'l2-ne5',
        title: 'Occupy e5 with the knight',
        instruction:
          'Jump the f3-knight to e5, the central outpost protected by your d4 pawn.',
        why:
          'Ne5 is the main London attacking switch. The knight cannot be easily challenged and supports Qf3/Qh5 and f4.',
        plan:
          'Follow with f4, Qf3, Qh5, Rf3–h3, or h4–h5 depending on Black’s king position.',
        wrongHint:
          'That move ignores the e5 outpost. Ne5 is strongest when Black cannot trade it off without opening the f-file.',
        line: CLASSICAL_LINE,
        moveIndex: 18,
        arrows: [a('d1', 'h5', SKY, 'queen lift'), a('f2', 'f4', MINT, 'support')],
        highlights: ['e5', 'h5', 'f4'],
      },
      {
        id: 'l2-recap',
        title: 'Your pieces are coordinated',
        instruction:
          'You have completed the classical London setup. The next lesson handles Black’s most common defensive schemes.',
        why:
          'Development, king safety, and central control turn a system into a middlegame plan.',
        plan:
          'Against ...c5, ...Qb6, ...Bf5, or a kingside fianchetto, identify Black’s break before choosing your response.',
        wrongHint: 'Recap complete.',
        line: CLASSICAL_LINE,
        startMoveIndex: 19,
        arrows: [a('c2', 'c4', VIOLET, 'break'), a('f3', 'e5', MINT)],
        highlights: ['e5', 'c4', 'g1'],
      },
    ],
  },
  {
    id: 'lesson-3',
    number: 3,
    title: "Handling Black's Common Responses",
    subtitle: 'Know the answer to every setup',
    description:
      'Practice the standard London responses to ...Qb6, early ...Bf5, and the King’s Indian / Grünfeld fianchetto.',
    objective:
      'Recognize Black’s plan and choose the correct structural response instead of playing autopilot.',
    outcomes: [
      'Meet ...Qb6 with Qb3 and Qc2',
      'Challenge early ...Bf5 with c4',
      'Use h3/Bh2 and c4 against fianchetto setups',
    ],
    accent: SKY,
    estimatedMinutes: 11,
    relatedChapterId: 'qb6',
    steps: [
      {
        id: 'l3-intro',
        title: 'Identify Black’s idea first',
        instruction:
          'The London is a system, but Black’s setup still matters. Each drill in this lesson starts from a different defensive scheme.',
        why:
          'Against ...Qb6 White must defend b2; against ...Bf5 White challenges the active bishop; against ...g6 White needs c4 or h3/Bh2.',
        plan:
          'Before moving, name Black’s threat: pressure on d4/b2, control of e4, or a central break with ...e5/...c5.',
        wrongHint: 'This step is an introduction; use Next Step to begin.',
        line: CORE_LINE,
        startMoveIndex: 0,
        arrows: [a('c7', 'c5', SKY), a('c8', 'f5', VIOLET), a('g7', 'g6', MINT)],
        highlights: ['c5', 'f5', 'g6'],
      },
      {
        id: 'l3-qb3',
        title: 'Answer ...Qb6 with Qb3',
        instruction:
          'Black’s queen attacks b2 and d4. Challenge it immediately with Qb3.',
        why:
          'Qb3 covers b2, offers a queen trade, and keeps White’s center intact. A trade on b6 often improves White’s pawn structure.',
        plan:
          'If Black takes on b3, recapture with the a-pawn. If Black avoids the trade, stay flexible and prepare Nbd2.',
        wrongHint:
          'That move leaves b2 or d4 vulnerable. Qb3 is the direct London remedy to ...Qb6.',
        line: QB6_LINE,
        moveIndex: 10,
        highlights: ['b6', 'b2', 'b3'],
      },
      {
        id: 'l3-qc2',
        title: 'Meet ...c4 with Qc2',
        instruction:
          'Black has pushed ...c4 to avoid the queen trade. Retreat the queen to c2.',
        why:
          'Qc2 keeps the queen safe, continues to guard b2, and prepares b3 or e4 later.',
        plan:
          'Once your king is safe, b3 undermines the c4 pawn. Do not let Black’s space gain go unchallenged.',
        wrongHint:
          'That queen retreat allows Black’s c4 pawn to cramp you. Qc2 is safe and prepares the b3 break.',
        line: QB6_LINE,
        moveIndex: 12,
        arrows: [a('b2', 'b3', MINT, 'later break')],
        highlights: ['c4', 'c2', 'b3'],
      },
      {
        id: 'l3-bf5-c4',
        title: 'Challenge early ...Bf5 with c4',
        instruction:
          'Black has developed the light-squared bishop outside the pawn chain. Strike the center with c4.',
        why:
          'c4 fights for d5 and challenges the bishop’s influence over e4. It is one of White’s most important anti-London pawn breaks.',
        plan:
          'After c4, develop with Nc3 or Bd3 and castle quickly. Do not allow ...Be4 to dominate the light squares.',
        wrongHint:
          'A passive move lets ...Bf5 control e4. c4 challenges Black’s active bishop and claims queenside space.',
        line: EARLY_BF5_LINE,
        moveIndex: 4,
        arrows: [a('f1', 'd3', VIOLET, 'Bd3')],
        highlights: ['c4', 'd5', 'f5', 'e4'],
      },
      {
        id: 'l3-kid-bf4',
        title: 'Still start with Bf4',
        instruction:
          'Against ...Nf6 and ...g6, develop the bishop to f4 before committing the e-pawn.',
        why:
          'Bf4 controls e5 and pressures c7. The basic London development remains useful even against a fianchetto.',
        plan:
          'Against ...g6, consider h3 and Bh2 to preserve the bishop, or c4 to claim queenside space.',
        wrongHint:
          'That move does not contest e5. Bf4 keeps the London bishop active and prepares the main setup.',
        line: KID_LINE,
        moveIndex: 4,
        arrows: [a('f4', 'h2', MINT, 'retreat')],
        highlights: ['f4', 'e5', 'h2'],
      },
      {
        id: 'l3-kid-c4',
        title: 'Use c4 against the fianchetto',
        instruction:
          'Black has chosen ...d6. Claim queenside space with c4 and prepare Nc3.',
        why:
          'c4 controls d5 and gives White a space advantage. It also makes Black’s ...e5 break easier to meet with d5 or dxe5.',
        plan:
          'Castle, keep the bishop with h3/Bh2 if necessary, and meet ...e5 with a concrete central decision.',
        wrongHint:
          'A purely passive setup lets Black prepare ...e5 comfortably. c4 is the active anti-fianchetto break.',
        line: KID_LINE,
        moveIndex: 14,
        arrows: [a('b1', 'c3', SKY, 'Nc3')],
        highlights: ['c4', 'd5', 'e5'],
      },
      {
        id: 'l3-bh2',
        title: 'Preserve the bishop with Bh2',
        instruction:
          'After the central exchange on e5, drop the bishop back to h2.',
        why:
          'Bh2 keeps the bishop on the b8–h2 diagonal and avoids trading White’s best attacking piece.',
        plan:
          'Follow with Qc2, Rad1, and pressure on d6/e5. The bishop is a long-term positional asset.',
        wrongHint:
          'Trading the dark-squared bishop too early gives Black relief. Bh2 keeps it active.',
        line: KID_LINE,
        moveIndex: 18,
        arrows: [a('d1', 'c2', SKY, 'Qc2')],
        highlights: ['h2', 'e5', 'd6'],
      },
      {
        id: 'l3-recap',
        title: 'You can meet the main families',
        instruction:
          'You now have concrete answers to ...Qb6, ...Bf5, and kingside fianchetto setups.',
        why:
          'The London is flexible: defend b2 when needed, challenge active bishops, and use c4 or h3/Bh2 against fianchetto systems.',
        plan:
          'The final lesson turns these structures into attacking patterns and tactical punishments.',
        wrongHint: 'Recap complete.',
        line: KID_LINE,
        startMoveIndex: KID_LINE.length,
        arrows: [a('c2', 'c4', SKY), a('f4', 'h2', MINT)],
        highlights: ['c4', 'h2', 'e5'],
      },
    ],
  },
  {
    id: 'lesson-4',
    number: 4,
    title: 'Tactical Patterns & Attacks',
    subtitle: 'Convert the setup into threats',
    description:
      'Learn the Ne5/f4/Qh5/h4 attacking scheme and practice punishing early central deviations.',
    objective:
      'Recognize when the center is stable enough to attack and calculate forcing moves against offbeat play.',
    outcomes: [
      'Build the Ne5 + f4 attacking setup',
      'Use Qh5 and h4 only with a safe king',
      'Punish 1...e5 with dxe5 and Nf3',
      'Understand checks, captures, and threats',
    ],
    accent: ROSE,
    estimatedMinutes: 10,
    relatedChapterId: 'classical',
    steps: [
      {
        id: 'l4-intro',
        title: 'When to attack',
        instruction:
          'A London attack works when your king is castled, the center is closed, and your pieces control e5.',
        why:
          'Wing attacks fail when the center is open. The London first builds a safe platform, then launches Ne5, f4, Qh5, and h4.',
        plan:
          'Before playing h4, check king safety, calculate checks/captures/threats, and make sure Black cannot open the center.',
        wrongHint: 'This step is an introduction; use Next Step to begin.',
        line: TACTICAL_LINE,
        startMoveIndex: 18,
        arrows: [a('f3', 'e5'), a('f2', 'f4', MINT), a('d1', 'h5', SKY)],
        highlights: ['e5', 'h5', 'h7'],
      },
      {
        id: 'l4-ne5',
        title: 'Start with Ne5',
        instruction:
          'Place the knight on e5 before advancing the f-pawn.',
        why:
          'Ne5 creates a protected outpost and threatens f7/g6. f4 then supports the knight and opens the f-file.',
        plan:
          'If Black trades the knight, recapture with a pawn and use the open file. If Black ignores it, bring the queen.',
        wrongHint:
          'Moving the f-pawn first can leave e4 and e5 loose. Occupy e5 with the knight before committing pawns.',
        line: TACTICAL_LINE,
        moveIndex: 18,
        arrows: [a('f2', 'f4', MINT, 'next')],
        highlights: ['e5', 'f7', 'g6'],
      },
      {
        id: 'l4-f4',
        title: 'Support the outpost with f4',
        instruction:
          'Play f4 to support the e5-knight and gain kingside space.',
        why:
          'The f-pawn makes Ne5 permanent and prepares Rf1–f3–h3. It also discourages ...f6 because the e5 knight is protected.',
        plan:
          'Castling is already done. Now a rook lift or queen sortie can join the attack.',
        wrongHint:
          'That move does not support e5. f4 is the pawn lever that turns the outpost into an attacking platform.',
        line: TACTICAL_LINE,
        moveIndex: 20,
        arrows: [a('f1', 'f3', SKY, 'rook lift')],
        highlights: ['f4', 'e5', 'h5'],
      },
      {
        id: 'l4-qh5',
        title: 'Bring the queen to h5',
        instruction:
          'Lift the queen from d1 to h5, targeting h7 and f7.',
        why:
          'With the knight on e5 and the king castled, Qh5 creates direct threats against Black’s kingside.',
        plan:
          'Combine Qh5 with h4–h5 or Rf3–h3. Always check Black’s defensive resources such as ...g6 or ...Nf6.',
        wrongHint:
          'That move does not increase pressure on h7/f7. Qh5 is the natural queen lift in this attacking setup.',
        line: TACTICAL_LINE,
        moveIndex: 22,
        arrows: [a('h2', 'h4', ROSE, 'next')],
        highlights: ['h5', 'h7', 'f7'],
      },
      {
        id: 'l4-h4',
        title: 'Add the h-pawn to the attack',
        instruction:
          'Play h4, preparing h5 and opening the h-file after a pawn exchange.',
        why:
          'The h-pawn is the final attacking unit. With the queen on h5 and knight on e5, Black’s king has fewer safe squares.',
        plan:
          'Calculate ...gxh5 and ...g5 tactics before pushing h5. Do not open lines toward your own king.',
        wrongHint:
          'That move does not help the kingside attack. h4 supports the queen and prepares the h-file opening.',
        line: TACTICAL_LINE,
        moveIndex: 24,
        highlights: ['h4', 'h5', 'g6'],
      },
      {
        id: 'l4-punish-e5',
        title: 'Punish 1...e5 with dxe5',
        instruction:
          'Black has offered a central pawn prematurely. Capture it with the d-pawn.',
        why:
          '2.dxe5 wins material and forces Black to spend time recovering the pawn. White can return it later for a development lead.',
        plan:
          'Develop with Nf3, meet ...Nc6, and castle quickly. Do not cling to the pawn at the cost of three tempi.',
        wrongHint:
          'That move ignores Black’s central pawn offer. dxe5 is the concrete punishment for 1...e5.',
        line: DEVIATION_LINE,
        moveIndex: 2,
        arrows: [a('g1', 'f3', MINT, 'next')],
        highlights: ['e5', 'f3'],
      },
      {
        id: 'l4-nf3',
        title: 'Develop with Nf3',
        instruction:
          'Attack the e5-pawn and prepare Bf4 with Nf3.',
        why:
          'Development with tempo is how White converts an extra pawn into a lasting initiative.',
        plan:
          'Continue with Bf4, e3, and O-O. If Black’s queen goes pawn hunting, open lines and punish the lost time.',
        wrongHint:
          'That move does not challenge the e5-pawn. Nf3 develops with tempo and prepares a London-like setup.',
        line: DEVIATION_LINE,
        moveIndex: 4,
        arrows: [a('c1', 'f4', SKY, 'Bf4')],
        highlights: ['f3', 'f4', 'e5'],
      },
      {
        id: 'l4-recap',
        title: 'Course complete',
        instruction:
          'You can now build the London structure, complete development, answer Black’s main setups, and launch a principled attack.',
        why:
          'The London System rewards understanding over memorization: protect d4, control e5, castle, then choose c4/e4 or a kingside attack.',
        plan:
          'Continue with free play, deviation drills, and the full learning hub to reinforce each idea.',
        wrongHint: 'Course complete.',
        line: TACTICAL_LINE,
        startMoveIndex: TACTICAL_LINE.length,
        arrows: [a('f3', 'e5'), a('d1', 'h5', SKY), a('h2', 'h4', ROSE)],
        highlights: ['e5', 'h5', 'h4'],
      },
    ],
  },
];

function replayLine(line: string[], count: number): Chess {
  const chess = new Chess();
  const limit = Math.min(count, line.length);
  for (let index = 0; index < limit; index += 1) {
    chess.move(line[index]);
  }
  return chess;
}

function buildStep(
  definition: CourseStepDefinition,
  lesson: CourseLessonDefinition,
  index: number,
): CourseStep {
  const line = definition.line ?? [];

  if (definition.moveIndex !== undefined) {
    const beforeChess = replayLine(line, definition.moveIndex);
    const beforeFen = beforeChess.fen();
    const beforeSide = beforeChess.turn();
    const expectedUci = line[definition.moveIndex];
    if (!expectedUci) {
      throw new Error(`Course step ${definition.id} has no move at index ${definition.moveIndex}.`);
    }
    const move = beforeChess.move(expectedUci);
    const afterFen = beforeChess.fen();
    const from = expectedUci.slice(0, 2) as Square;
    const to = expectedUci.slice(2, 4) as Square;
    const promotion = expectedUci.length > 4 ? (expectedUci[4] as PieceSymbol) : undefined;
    const recommendedArrow = a(from, to, lesson.accent, 'Play');
    const extraArrows = (definition.arrows ?? []).filter(
      (arrow) => arrow.from !== from || arrow.to !== to,
    );

    return {
      ...definition,
      lessonId: lesson.id,
      index,
      beforeFen,
      afterFen,
      expectedUci,
      san: move.san,
      from,
      to,
      promotion,
      moveNumber: Number.parseInt(beforeFen.split(' ')[5] ?? '1', 10) || 1,
      sideToMove: beforeSide,
      isDrill: true,
      arrows: [recommendedArrow, ...extraArrows],
      highlights: [from, to, ...(definition.highlights ?? [])],
    };
  }

  const beforeChess = replayLine(line, definition.startMoveIndex ?? 0);
  const beforeFen = beforeChess.fen();
  return {
    ...definition,
    lessonId: lesson.id,
    index,
    beforeFen,
    afterFen: beforeFen,
    moveNumber: Number.parseInt(beforeFen.split(' ')[5] ?? '1', 10) || 1,
    sideToMove: beforeChess.turn(),
    isDrill: false,
    arrows: definition.arrows ?? [],
    highlights: definition.highlights ?? [],
  };
}

function buildLesson(definition: CourseLessonDefinition): CourseLesson {
  return {
    ...definition,
    steps: definition.steps.map((step, index) => buildStep(step, definition, index)),
  };
}

export const COURSE_LESSONS: CourseLesson[] = COURSE_LESSON_DEFINITIONS.map(buildLesson);
export const TOTAL_COURSE_STEPS = COURSE_LESSONS.reduce(
  (total, lesson) => total + lesson.steps.length,
  0,
);
export const TOTAL_COURSE_DRILLS = COURSE_LESSONS.reduce(
  (total, lesson) => total + lesson.steps.filter((step) => step.isDrill).length,
  0,
);
export const COURSE_STEP_IDS = new Set(
  COURSE_LESSONS.flatMap((lesson) => lesson.steps.map((step) => step.id)),
);
export const COURSE_LESSON_IDS = new Set(COURSE_LESSONS.map((lesson) => lesson.id));
export const COURSE_PREVIEW_STEP =
  COURSE_LESSONS[0].steps.find((step) => step.isDrill) ?? COURSE_LESSONS[0].steps[0];

export function getCourseLesson(lessonId: string | null | undefined): CourseLesson | null {
  if (!lessonId) return null;
  return COURSE_LESSONS.find((lesson) => lesson.id === lessonId) ?? null;
}

export function getCourseStep(lesson: CourseLesson, stepIndex: number): CourseStep {
  return lesson.steps[Math.max(0, Math.min(lesson.steps.length - 1, stepIndex))];
}

export function getNextCourseLessonId(lessonId: string): string | null {
  const index = COURSE_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 && index < COURSE_LESSONS.length - 1
    ? COURSE_LESSONS[index + 1].id
    : null;
}
