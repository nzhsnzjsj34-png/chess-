import type { EngineLine, EngineSearchResult, EngineStatusSnapshot } from '../types';
import { sideToMove } from '../utils/chess';
import { fallbackEvaluation, fallbackMoveResult } from './fallback';

export type SearchPurpose = 'play' | 'analysis' | 'feedback';

export interface UciSearchOptions {
  fen: string;
  purpose: SearchPurpose;
  depth?: number;
  moveTimeMs?: number;
  limitStrength?: boolean;
  elo?: number;
  skillLevel?: number;
  multiPv?: number;
  hashSize?: number;
}

export interface EnginePlayConfig {
  elo: number;
  skillLevel: number;
  moveTimeMs: number;
  limitStrength: boolean;
  hashSize: number;
  punishDeviation?: boolean;
}

export interface EngineAnalysisConfig {
  depth: number;
  multiPv: number;
  hashSize: number;
  quick?: boolean;
}

type WorkerState = 'loading' | 'ready' | 'error';

interface WorkerStatus {
  state: WorkerState;
  detail: string;
}

interface QueuedSearch {
  id: number;
  options: UciSearchOptions;
  resolve: (result: EngineSearchResult) => void;
  reject: (error: Error) => void;
  cancelled: boolean;
  settled: boolean;
  startedAt: number;
}

export class UciCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UciCommandError';
  }
}

const ENGINE_FILE = 'stockfish-19-lite-single.js';

/**
 * Thin UCI Web Worker client for Stockfish 19 Lite (single-threaded WASM).
 *
 * Each worker owns a serial command queue. A search resolves when Stockfish
 * emits `bestmove`; intermediate `info` lines are grouped by MultiPV number.
 */
class UciWorker {
  private worker: Worker | null = null;
  private queue: QueuedSearch[] = [];
  private current: QueuedSearch | null = null;
  private searchLines = new Map<number, EngineLine>();
  private ready = false;
  private requestId = 0;
  private hashSize = 16;
  private status: WorkerStatus = { state: 'loading', detail: 'Loading WASM engine…' };

  constructor(
    private readonly label: string,
    private readonly onStatusChange: (status: WorkerStatus) => void,
  ) {
    this.init();
  }

  getStatus(): WorkerStatus {
    return this.status;
  }

  private setStatus(state: WorkerState, detail: string) {
    this.status = { state, detail };
    this.onStatusChange(this.status);
  }

  private init() {
    if (typeof Worker === 'undefined') {
      this.setStatus('error', 'Web Workers are unavailable in this browser.');
      return;
    }

    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;

    try {
      this.worker = new Worker(`${base}engine/${ENGINE_FILE}`, {
        name: `London Lab ${this.label} Stockfish`,
      });
      this.worker.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
      this.worker.onerror = (event) => {
        this.setStatus('error', event.message || 'The engine worker failed to start.');
        this.failAll(new UciCommandError(event.message || 'Stockfish worker error'));
      };
      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
      this.setStatus('loading', 'Starting Stockfish 19 Lite…');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown worker error';
      this.setStatus('error', detail);
      this.failAll(new UciCommandError(detail));
    }
  }

  private handleMessage(data: unknown) {
    const raw = typeof data === 'string' ? data : '';
    if (!raw) return;
    for (const line of raw.split(/\r?\n/).map((part) => part.trim())) {
      if (!line) continue;
      if (line === 'uciok') {
        this.ready = true;
        this.setStatus('ready', 'Stockfish 19 Lite ready');
        this.pump();
      } else if (line === 'readyok') {
        this.ready = true;
        this.setStatus('ready', 'Stockfish 19 Lite ready');
        this.pump();
      } else if (line.startsWith('info')) {
        this.handleInfo(line);
      } else if (line.startsWith('bestmove')) {
        this.handleBestMove(line);
      } else if (line.startsWith('id name')) {
        this.setStatus(this.status.state, line.replace('id name ', ''));
      }
    }
  }

  private handleInfo(line: string) {
    if (!this.current || this.current.cancelled || line.startsWith('info string')) return;
    const depth = Number.parseInt(/depth\s+(\d+)/.exec(line)?.[1] ?? '0', 10);
    const multipv = Number.parseInt(/multipv\s+(\d+)/.exec(line)?.[1] ?? '1', 10);
    const scoreMatch = /score\s+(cp|mate)\s+(-?\d+)/.exec(line);
    const pvIndex = line.indexOf(' pv ');
    const pv =
      pvIndex >= 0
        ? line
            .slice(pvIndex + 4)
            .trim()
            .split(/\s+/)
        : [];
    const previous = this.searchLines.get(multipv);
    if (!scoreMatch && pv.length === 0) return;
    if (previous && depth < previous.depth && pv.length <= previous.pv.length) return;

    const next: EngineLine = {
      multipv,
      depth: Math.max(depth, previous?.depth ?? 0),
      scoreCp: previous?.scoreCp ?? 0,
      mate: previous?.mate,
      nodes: Number.parseInt(/nodes\s+(\d+)/.exec(line)?.[1] ?? '', 10) || previous?.nodes,
      timeMs: Number.parseInt(/time\s+(\d+)/.exec(line)?.[1] ?? '', 10) || previous?.timeMs,
      pv: pv.length > 0 ? pv : (previous?.pv ?? []),
      bestMove: pv[0] ?? previous?.bestMove,
    };

    if (scoreMatch?.[1] === 'cp') {
      next.scoreCp = Number.parseInt(scoreMatch[2], 10);
      next.mate = undefined;
    } else if (scoreMatch?.[1] === 'mate') {
      next.mate = Number.parseInt(scoreMatch[2], 10);
      next.scoreCp = next.mate > 0 ? 2500 : -2500;
    }

    this.searchLines.set(multipv, next);
  }

  private handleBestMove(line: string) {
    const match = /^bestmove\s+(\S+)/.exec(line);
    const ponder = /ponder\s+(\S+)/.exec(line)?.[1];
    const bestMove = match?.[1] && match[1] !== '(none)' ? match[1] : undefined;
    const request = this.current;
    this.current = null;

    if (request && !request.cancelled && !request.settled) {
      const lines = [...this.searchLines.values()].sort((a, b) => a.multipv - b.multipv);
      if (lines.length === 0 && bestMove) {
        lines.push({
          multipv: 1,
          depth: 0,
          scoreCp: 0,
          pv: [bestMove],
          bestMove,
        });
      }
      request.settled = true;
      request.resolve({
        fen: request.options.fen,
        sideToMove: sideToMove(request.options.fen),
        bestMove,
        ponder: ponder && ponder !== '(none)' ? ponder : undefined,
        depth: Math.max(0, ...lines.map((entry) => entry.depth)),
        lines,
        elapsedMs: Math.round(performance.now() - request.startedAt),
      });
    }

    this.searchLines.clear();
    this.pump();
  }

  private send(command: string) {
    if (!this.worker) throw new UciCommandError('Stockfish worker is unavailable.');
    this.worker.postMessage(command);
  }

  private pump() {
    if (!this.ready || this.current || this.status.state === 'error') return;
    const request = this.queue.shift();
    if (!request) return;
    if (request.cancelled) {
      this.pump();
      return;
    }

    this.current = request;
    this.searchLines.clear();
    request.startedAt = performance.now();

    const options = request.options;
    const limitStrength = Boolean(options.limitStrength);
    const elo = Math.max(1320, Math.min(3190, Math.round(options.elo ?? 1800)));
    const skillLevel = Math.max(0, Math.min(20, Math.round(options.skillLevel ?? 10)));
    const multiPv = Math.max(1, Math.min(4, Math.round(options.multiPv ?? 1)));
    const hashSize = Math.max(8, Math.min(512, Math.round(options.hashSize ?? 32)));

    try {
      if (hashSize !== this.hashSize) {
        this.send(`setoption name Hash value ${hashSize}`);
        this.hashSize = hashSize;
      }
      this.send(`setoption name UCI_LimitStrength value ${limitStrength ? 'true' : 'false'}`);
      this.send(`setoption name UCI_Elo value ${elo}`);
      this.send(`setoption name Skill Level value ${skillLevel}`);
      this.send(`setoption name MultiPV value ${multiPv}`);
      this.send(`position fen ${options.fen}`);
      if (options.depth) {
        const maxTime = Math.max(300, Math.min(6500, options.moveTimeMs ?? options.depth * 450));
        this.send(`go depth ${options.depth} movetime ${maxTime}`);
      } else {
        this.send(`go movetime ${Math.max(100, Math.round(options.moveTimeMs ?? 500))}`);
      }
    } catch (error) {
      request.settled = true;
      request.reject(error instanceof Error ? error : new UciCommandError(String(error)));
      this.current = null;
      this.pump();
    }
  }

  search(options: UciSearchOptions): Promise<EngineSearchResult> {
    if (this.status.state === 'error') {
      return Promise.reject(new UciCommandError(this.status.detail));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: ++this.requestId,
        options,
        resolve,
        reject,
        cancelled: false,
        settled: false,
        startedAt: performance.now(),
      });
      this.pump();
    });
  }

  /** Remove stale queued searches so a fast-changing board never builds a backlog. */
  dropQueued(predicate: (options: UciSearchOptions) => boolean) {
    for (const request of this.queue) {
      if (predicate(request.options) && !request.settled) {
        request.cancelled = true;
        request.settled = true;
        request.reject(new UciCommandError('Superseded by a newer position.'));
      }
    }
    this.queue = this.queue.filter((request) => !request.cancelled);
  }

  cancel(reason = 'Search cancelled.') {
    this.dropQueued(() => true);
    if (this.current && !this.current.settled) {
      this.current.cancelled = true;
      this.current.settled = true;
      this.current.reject(new UciCommandError(reason));
      try {
        this.send('stop');
      } catch {
        // The worker may already be gone.
      }
    }
  }

  newGame() {
    this.cancel('New game started.');
    try {
      this.send('ucinewgame');
    } catch {
      // Ignore; fallback mode is handled by the manager.
    }
  }

  private failAll(error: Error) {
    this.queue.forEach((request) => {
      if (!request.settled) {
        request.settled = true;
        request.reject(error);
      }
    });
    this.queue = [];
    if (this.current && !this.current.settled) {
      this.current.settled = true;
      this.current.reject(error);
    }
    this.current = null;
  }

  destroy() {
    this.cancel('Engine disposed.');
    this.worker?.terminate();
    this.worker = null;
  }
}

/**
 * Two independent workers keep bot search and live analysis from competing in
 * the same UCI queue. Both use the same small WASM file from /public/engine.
 */
class EngineManager {
  private readonly gameWorker: UciWorker;
  private readonly analysisWorker: UciWorker;
  private readonly listeners = new Set<() => void>();
  private snapshot: EngineStatusSnapshot = {
    state: 'loading',
    label: 'Starting engine',
    detail: 'Loading Stockfish 19 Lite in Web Workers…',
    workers: { game: 'loading', analysis: 'loading' },
  };

  constructor() {
    this.gameWorker = new UciWorker('Game', (status) => this.updateStatus('game', status));
    this.analysisWorker = new UciWorker('Analysis', (status) =>
      this.updateStatus('analysis', status),
    );
  }

  private updateStatus(worker: 'game' | 'analysis', status: WorkerStatus) {
    const workers = {
      game: worker === 'game' ? status.state : this.snapshot.workers.game,
      analysis: worker === 'analysis' ? status.state : this.snapshot.workers.analysis,
    };
    const hasError = workers.game === 'error' || workers.analysis === 'error';
    const bothReady = workers.game === 'ready' && workers.analysis === 'ready';
    const state: EngineStatusSnapshot['state'] = hasError
      ? 'fallback'
      : bothReady
        ? 'ready'
        : 'loading';

    this.snapshot = {
      state,
      label:
        state === 'ready'
          ? 'Stockfish ready'
          : state === 'fallback'
            ? 'Local fallback engine'
            : 'Starting engine',
      detail:
        state === 'ready'
          ? 'Two Web Workers · Stockfish 19 Lite WASM'
          : state === 'fallback'
            ? status.detail || 'WASM engine unavailable; using a lightweight local evaluator.'
            : status.detail,
      workers,
    };
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EngineStatusSnapshot => this.snapshot;

  async play(fen: string, config: EnginePlayConfig): Promise<EngineSearchResult> {
    const punish = Boolean(config.punishDeviation);
    const moveTime = punish
      ? Math.max(config.moveTimeMs, 900)
      : config.moveTimeMs;
    try {
      return await this.gameWorker.search({
        fen,
        purpose: 'play',
        moveTimeMs: moveTime,
        limitStrength: punish ? false : config.limitStrength,
        elo: punish ? 3190 : config.elo,
        skillLevel: punish ? 20 : config.skillLevel,
        multiPv: 1,
        hashSize: config.hashSize,
      });
    } catch (error) {
      if (error instanceof UciCommandError && error.message.includes('Superseded')) throw error;
      return fallbackMoveResult(fen, punish ? 20 : config.skillLevel);
    }
  }

  async analyze(
    fen: string,
    config: EngineAnalysisConfig,
    purpose: 'analysis' | 'feedback' = 'analysis',
  ): Promise<EngineSearchResult> {
    const depth = config.quick
      ? Math.min(config.depth, 9)
      : config.depth;
    this.analysisWorker.dropQueued(
      (options) => options.purpose === purpose && options.fen !== fen,
    );
    try {
      return await this.analysisWorker.search({
        fen,
        purpose,
        depth,
        moveTimeMs: config.quick ? Math.max(350, depth * 90) : depth * 350 + 450,
        limitStrength: false,
        skillLevel: 20,
        multiPv: config.quick ? 1 : config.multiPv,
        hashSize: config.hashSize,
      });
    } catch (error) {
      if (error instanceof UciCommandError && error.message.includes('Superseded')) throw error;
      return fallbackEvaluation(fen);
    }
  }

  cancelGame() {
    this.gameWorker.cancel('Game reset.');
  }

  cancelAll() {
    this.cancelGame();
    this.analysisWorker.cancel('Position reset.');
  }

  newGame() {
    this.gameWorker.newGame();
    this.analysisWorker.newGame();
  }

  destroy() {
    this.gameWorker.destroy();
    this.analysisWorker.destroy();
  }
}

export const engineService = new EngineManager();
