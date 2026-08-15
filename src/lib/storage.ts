/**
 * Persistência local.
 *
 * IndexedDB via idb-keyval em vez de localStorage: no Safari do iPhone o
 * localStorage é apagado depois de sete dias sem abrir o site, e perder o
 * progresso é exatamente o que faria ela desistir. Como não existe servidor,
 * exportar/importar JSON é a única rede de segurança para trocar de aparelho —
 * por isso está na tela de ajustes e não escondido.
 */

import { get, set } from 'idb-keyval';
import {
  DEFAULT_SETTINGS,
  emptyProgress,
  migrateProgress,
  type Progress,
  type Settings,
  type StoredProgress,
} from './srs';

const PROGRESS_KEY = 'kana-trainer:progress';
const SETTINGS_KEY = 'kana-trainer:settings';

export type Backup = {
  app: 'kana-trainer';
  exportedAt: string;
  progress: Progress;
  settings: Settings;
};

/** Aceita o formato atual e o anterior; qualquer outra coisa começa do zero. */
function readProgress(stored: unknown): Progress {
  const version = (stored as StoredProgress | null)?.version;
  if (version === 1 || version === 2) return migrateProgress(stored as StoredProgress);
  return emptyProgress();
}

export async function loadProgress(): Promise<Progress> {
  try {
    return readProgress(await get(PROGRESS_KEY));
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  try {
    await set(PROGRESS_KEY, progress);
  } catch {
    // Modo privado ou cota estourada: seguir jogando vale mais do que travar.
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await get<Partial<Settings>>(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await set(SETTINGS_KEY, settings);
  } catch {
    // idem
  }
}

export function makeBackup(progress: Progress, settings: Settings): Backup {
  return {
    app: 'kana-trainer',
    exportedAt: new Date().toISOString(),
    progress,
    settings,
  };
}

/**
 * Valida o suficiente para não deixar um arquivo trocado apagar o progresso, e
 * aceita backups da versão anterior — quem exportou antes da separação por modo
 * não pode perder o que tinha.
 */
export function parseBackup(raw: string): Backup {
  // Tipado frouxo de propósito: o arquivo pode vir de uma versão anterior, então
  // a validação é em tempo de execução, não pelo tipo.
  const data = JSON.parse(raw) as {
    app?: string;
    exportedAt?: string;
    progress?: StoredProgress;
    settings?: Partial<Settings>;
  };

  const version = data.progress?.version;
  if (data.app !== 'kana-trainer' || (version !== 1 && version !== 2)) {
    throw new Error('Esse arquivo não é um backup do Kana Trainer.');
  }

  return {
    app: 'kana-trainer',
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    progress: migrateProgress(data.progress!),
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
}
