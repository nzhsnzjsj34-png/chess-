# Stockfish.js engine assets

This directory contains the **Stockfish 19 Lite, single-threaded WASM** build from
the [`stockfish`](https://www.npmjs.com/package/stockfish) npm package (v19.0.1),
maintained by Nathan Rugg and Chess.com.

- `stockfish-19-lite-single.js`
- `stockfish-19-lite-single.wasm`
- `LICENSE.stockfish.txt`

Stockfish.js is licensed under **GPL-3.0-or-later**. See `LICENSE.stockfish.txt`
for the full license text. The single-threaded build is used because it is fast to
load, needs no cross-origin isolation headers, and runs in a dedicated Web Worker
so search never blocks the React UI.

To update the engine, download the `stockfish@19.0.1` tarball and replace these
three files with the matching `stockfish-19-lite-single.js`,
`stockfish-19-lite-single.wasm`, and `Copying.txt` files.
