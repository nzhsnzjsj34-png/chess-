import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getDifficultyPreset,
  sanitizeSettings,
  SETTINGS_STORAGE_KEY,
} from '../data/settings';
import type { DifficultyId, Settings } from '../types';

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw) as Partial<Settings>) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface SettingsController {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  applyDifficulty: (id: DifficultyId) => void;
  resetSettings: () => void;
}

export function useSettings(): SettingsController {
  const [settings, setSettings] = useState<Settings>(readSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing or a full storage quota should never break the app.
    }
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => sanitizeSettings({ ...current, [key]: value }));
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => sanitizeSettings({ ...current, ...patch }));
  }, []);

  const applyDifficulty = useCallback((id: DifficultyId) => {
    const preset = getDifficultyPreset(id);
    setSettings((current) =>
      sanitizeSettings({
        ...current,
        difficulty: id,
        limitStrength: preset.limitStrength,
        elo: preset.elo,
        skillLevel: preset.skillLevel,
        moveTimeMs: preset.moveTimeMs,
        analysisDepth: preset.analysisDepth,
      }),
    );
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, updateSetting, updateSettings, applyDifficulty, resetSettings };
}
