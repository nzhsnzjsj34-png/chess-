import { useSyncExternalStore } from 'react';
import { engineService } from '../engine/uciEngine';

export function useEngineStatus() {
  return useSyncExternalStore(
    engineService.subscribe,
    engineService.getSnapshot,
    engineService.getSnapshot,
  );
}
