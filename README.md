# London Lab

**London Lab** is a complete client-side chess training application dedicated to the London System. It combines a rules-correct interactive board, a bundled Stockfish 19 WebAssembly engine, constrained opening practice, guided theoretical chapters, live analysis, move classification, and an LLM-ready chess coach.

---

## 1. Conceptual reset

### London theory model

The app starts from the canonical move order **1.d4 d5 2.Nf3 Nf6 3.Bf4**. `Bf4` happens before `e3` so the dark-squared bishop is not locked behind its own pawn chain. The core setup is:

```text
d4 · Nf3 · Bf4 · e3 · c3 · Nbd2 · Bd3 · O-O
```

The opening tree and lessons cover the main Black families:

- Classical `...d5`, `...e6`, `...c5`, `...Nc6`, `...Bd6`
- Early `...c5` and `...Qb6` pressure against b2/d4
- King’s Indian and Grünfeld fianchetto setups
- Early `...Bf5` anti-London systems
- Queenside fianchetto / Queen’s Indian setups
- Offbeat deviations such as `1...e5` and `2...c5`

Strategic themes encoded in the coach, lessons, arrows, and book hints include:

- d4/e3/c3 as the central pawn triangle
- e5 as the key knight outpost
- `c3` as the answer to `...c5`
- `Qb3` / `Qc2` against `...Qb6`
- `h3` and `Bh2` to preserve the London bishop
- `Ne5`, `f4`, `Qf3/Qh5`, rook lifts, and `h4–h5` attacking plans
- `c4` and `e4` as the two main pawn breaks
- king safety as the prerequisite for a wing attack

### Rules and engine reset

`chess.js` is the sole authority for legal moves, SAN/LAN, FEN/PGN parsing, castling, en passant, promotion, check, checkmate, stalemate, threefold repetition, insufficient material, the fifty-move rule, and draw detection. Stockfish never decides whether a move is legal; it only searches a validated `position fen ...`.

The engine is **Stockfish 19 Lite, single-threaded WASM**, loaded from `/public/engine` into two dedicated Web Workers: one for bot search and one for analysis. A small static evaluator provides a graceful fallback if WASM workers are unavailable.

---

## 2. Quick start

```bash
npm install
npm run dev
```

Open the live preview / `http://localhost:5173`. The dev server binds to `0.0.0.0` and permits proxied preview hosts.

```bash
npm run typecheck       # strict TypeScript
npm run test:lines      # validate all lesson/book/drill lines with chess.js
npm run build           # typecheck + production build
npm run preview         # preview the production bundle
```

No backend or API key is required.

---

## 3. Feature map

### Interactive board

- React 19 + Vite + Tailwind CSS 4
- Custom SVG-friendly board renderer with Unicode vector-style pieces
- Click-to-move and pointer-based drag-and-drop
- Promotion chooser
- Animated moving piece overlay
- Last-move, selected-square, check, legal-target, book-hint, and lesson highlights
- Four board themes, orientation control, coordinates, and synthesized Web Audio sounds
- SAN and LAN shown together in move history and the compact timeline

### Play vs Stockfish

- Five difficulty presets from Beginner to Grandmaster
- Direct control over `UCI_Elo`, Skill Level, think time, analysis depth, MultiPV, and Hash
- Limit-strength mode and full-strength GM mode
- Two workers prevent bot search from blocking live analysis
- Evaluation bar, principal variations, eval trend, and move-quality classification
- Mistake / blunder / missed-resource feedback from before/after engine evaluations

### Opening constraint mode

Four modes are available:

| Mode | Behavior |
| --- | --- |
| `Off` | Stockfish plays freely from move one. |
| `Guide` | Book moves and targets are highlighted; deviations are allowed. |
| `Strict` | Only map-approved London book moves are legal for the practicing White player. |
| `Bot` | Stockfish as White is forced through the London book or pure-system fallback. |

Additional controls:

- Adjustable first-N book length, 6–18 plies
- Bot book replies
- Full-strength “punish deviation” search
- Four deviation drills loaded from exact FENs
- Position-keyed opening tree built from all lesson lines and nine extra branches
- Transposition support through normalized FEN keys

### Learning hub

- Eight guided chapters with 142 mapped opening positions
- Step-by-step replay with play/pause and direct step selection
- Visual arrows for bishop maneuvers, pawn chains, and knight jumps
- Key-square highlights and coaching explanations
- “Practice this position” starts a sparring game from any lesson frame

### AI coach

- Chat UI with quick prompts, local context chips, typing state, and persistent history
- Local deterministic coach knows the current FEN, PGN, move, evaluation, lesson, opening mode, and last-move feedback
- Teaching styles: concise, balanced, deep, and Socratic
- Optional LLM proxy integration through `VITE_COACH_API_URL`
- Safe rich-text rendering (no injected HTML)

### Review and customization

- FEN/PGN import and PGN download
- Historical move scrubbing with position-specific Stockfish analysis
- Estimated accuracy and mistake/blunder counts
- Full settings dashboard for engine, opening, board, sound, and coach behavior
- Settings persist in `localStorage`
- Checkmate / stalemate / repetition / fifty-move / insufficient-material result modal

---

## 4. Project structure

```text
public/engine/
  stockfish-19-lite-single.js       # UCI Web Worker entry
  stockfish-19-lite-single.wasm     # Stockfish 19 Lite WASM
  LICENSE.stockfish.txt             # GPL-3.0 license
  ATTRIBUTION.md                    # engine source and update notes

scripts/
  validate-lines.ts                 # chess.js validation for every theory line

src/
  main.tsx                          # React entry point
  App.tsx                           # workspace orchestration and layout
  index.css                         # Tailwind entry + board/UI CSS
  types.ts                          # shared domain types

  data/
    settings.ts                     # defaults, presets, themes, bounds, sanitizer
    lessons.ts                      # eight London chapters and visual steps
    openingBook.ts                  # position-keyed book, setup markers, drills

  engine/
    uciEngine.ts                    # two-worker UCI queue, parsing, search API
    fallback.ts                     # static evaluator if WASM cannot load

  hooks/
    useSettings.ts                  # persisted customization state
    useLondonGame.ts                # authoritative game state machine
    useLessonPlayer.ts              # chapter/step/autoplay controller
    useCoachChat.ts                 # chat history and async replies
    useEngineStatus.ts              # useSyncExternalStore engine health

  services/
    soundService.ts                 # Web Audio synthesized sound effects
    coachService.ts                 # local coach + optional LLM proxy client

  utils/
    chess.ts                        # FEN/PGN helpers, scoring, classification,
                                    # lesson frames, game-state detection

  components/
    ui.tsx                          # design-system primitives
    TopBar.tsx                      # navigation and global controls
    ChessBoard.tsx                  # interactive board, arrows, drag, promotion
    EvalBar.tsx                     # White-perspective evaluation bar
    MoveList.tsx                    # SAN/LAN move table and quality badges
    PlaySidebar.tsx                 # setup, opening controls, drills
    LessonHub.tsx                   # chapter list, guided panel, replay controls
    AnalysisPanel.tsx               # eval, PVs, feedback, trend sparkline
    CoachChat.tsx                   # AI coach UI
    ReviewSidebar.tsx               # review, import/export, accuracy
    SettingsPanel.tsx               # full customization dashboard
    GameOverModal.tsx               # final result and review actions
    Toast.tsx                       # transient notifications
```

---

## 5. Stockfish integration details

`src/engine/uciEngine.ts` implements a serial UCI command queue for each worker:

1. Load `/engine/stockfish-19-lite-single.js` as a classic Web Worker.
2. Send `uci` and `isready`; wait for `uciok` / `readyok`.
3. For each request, set UCI options, send `position fen ...`, then `go`.
4. Group `info ... multipv N score cp ... pv ...` lines by MultiPV number.
5. Resolve the request on `bestmove`.
6. Translate PV UCI strings back to SAN with `chess.js`.

Search strengths:

```text
UCI_LimitStrength  true/false
UCI_Elo            1320–3190
Skill Level        0–20
MultiPV            1–4
Hash               16–256 MB
go movetime        configurable for bot play
go depth           configurable for analysis
```

Analysis always runs at full strength so the evaluation bar is not weakened by the bot’s sparring Elo. Deviation punishment temporarily removes the bot’s strength limit and extends its thinking time.

The single-threaded engine needs no `SharedArrayBuffer` or cross-origin isolation headers, which makes deployment to ordinary static hosts straightforward.

---

## 6. AI coach API integration

The chat works immediately with a local, context-aware simulation. To connect an LLM, copy `.env.example` to `.env.local` and set:

```bash
VITE_COACH_API_URL=https://your-server.example/api/chess-coach
```

The browser posts JSON like:

```json
{
  "system": "You are London Lab Coach...",
  "style": "balanced",
  "question": "What's the plan here?",
  "context": {
    "fen": "...",
    "pgn": "...",
    "evaluation": {},
    "lastMoveSan": "Bf4",
    "openingMode": "guided"
  },
  "messages": [
    { "role": "user", "content": "What's the plan here?" }
  ]
}
```

Accepted response shapes include `{ "reply": "..." }`, `{ "message": "..." }`, `{ "content": "..." }`, or an OpenAI-like `choices[0].message.content`. Keep API keys on the proxy, never in a `VITE_*` variable.

---

## 7. Validation

- `npm run test:lines` replays all lesson lines, extra book branches, and deviation drills through `chess.js`.
- `npm run build` runs strict TypeScript and Vite production bundling.
- A DOM smoke test was also used to confirm initial render, board creation, a legal click-to-move, coach response, tab navigation, and lesson loading.
- The bundled Stockfish engine was verified over UCI with `uci`, `setoption`, `isready`, `position fen`, and `go depth ... movetime ...`.

---

## 8. Licensing and attribution

The Stockfish engine files in `public/engine` are **GPL-3.0-or-later**; see `public/engine/LICENSE.stockfish.txt` and `ATTRIBUTION.md`. They originate from the official `stockfish` npm package (`stockfish@19.0.1`) maintained by Nathan Rugg and Chess.com.

`chess.js` is used under its BSD-2-Clause license. React, Vite, Tailwind CSS, Lucide, and TypeScript are used through their respective npm licenses.
