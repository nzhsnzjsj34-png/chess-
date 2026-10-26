/**
 * Validates every guided line and lesson frame with chess.js.
 * Run with: npm run test:lines
 */
import { Chess } from 'chess.js';
import { COURSE_LESSONS, TOTAL_COURSE_DRILLS, TOTAL_COURSE_STEPS } from '../src/data/course';
import { LESSON_CHAPTERS } from '../src/data/lessons';
import { DEVIATION_DRILLS, EXTRA_BOOK_LINES, openingBookSize } from '../src/data/openingBook';

let failures = 0;

for (const chapter of LESSON_CHAPTERS) {
  const chess = new Chess();

  chapter.moves.forEach((uci, index) => {
    try {
      const move = chess.move(uci);
      console.log(
        `${chapter.id.padEnd(15)} ${String(index + 1).padStart(2, '0')} ${move.san.padEnd(7)} ${move.lan}`,
      );
    } catch (error) {
      failures += 1;
      console.error(
        `❌ ${chapter.id}: illegal move ${index + 1} (${uci}) at ${chess.fen()}`,
        error,
      );
    }
  });

  for (const step of chapter.steps) {
    if (step.moveIndex < -1 || step.moveIndex >= chapter.moves.length) {
      failures += 1;
      console.error(
        `❌ ${chapter.id}: step "${step.title}" has out-of-range moveIndex ${step.moveIndex}`,
      );
    }
  }
}

for (const line of [...EXTRA_BOOK_LINES, ...DEVIATION_DRILLS]) {
  const chess = new Chess();
  line.moves.forEach((uci, index) => {
    try {
      chess.move(uci);
    } catch (error) {
      failures += 1;
      console.error(`❌ ${line.id}: illegal move ${index + 1} (${uci})`, error);
    }
  });
}

for (const courseLesson of COURSE_LESSONS) {
  for (const step of courseLesson.steps) {
    const board = new Chess(step.beforeFen);
    if (!step.expectedUci) {
      if (step.beforeFen !== step.afterFen) {
        failures += 1;
        console.error(`❌ ${courseLesson.id}/${step.id}: concept FENs do not match`);
      }
      continue;
    }
    try {
      const move = board.move(step.expectedUci);
      if (board.fen() !== step.afterFen) {
        failures += 1;
        console.error(`❌ ${courseLesson.id}/${step.id}: after FEN does not match replay`);
      }
      if (move.san !== step.san) {
        failures += 1;
        console.error(
          `❌ ${courseLesson.id}/${step.id}: SAN mismatch (${move.san} vs ${step.san})`,
        );
      }
    } catch (error) {
      failures += 1;
      console.error(
        `❌ ${courseLesson.id}/${step.id}: illegal expected move ${step.expectedUci}`,
        error,
      );
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} line validation failure(s).`);
  process.exit(1);
}

console.log(
  `\n✅ Validated ${LESSON_CHAPTERS.length} lessons, ${EXTRA_BOOK_LINES.length} extra book branches, ${DEVIATION_DRILLS.length} drills, ${COURSE_LESSONS.length} course lessons (${TOTAL_COURSE_STEPS} steps / ${TOTAL_COURSE_DRILLS} play-the-move drills), and ${openingBookSize()} opening positions.`,
);
