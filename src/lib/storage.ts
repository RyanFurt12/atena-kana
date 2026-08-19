/**
 * Persistência local.
 *
 * IndexedDB via idb-keyval é o store primário: assíncrono, cota grande, dado
 * estruturado. Só que no iOS todo armazenamento gravável por script — IndexedDB
 * incluído, ao contrário do que este arquivo supunha antes — mora no mesmo pote
 * que o WebKit pode esvaziar, e ainda falha de forma transitória ao abrir logo
 * depois que o app na tela inicial retoma do background. Duas defesas em cima:
 *
 * - Espelho em localStorage a cada escrita. Não salva de despejo (o ITP limpa os
 *   dois no mesmo varrimento), mas cobre justamente a falha transitória, que é o
 *   que apaga progresso na prática.
 * - `rev` cresce a cada gravação e decide qual dos dois vence na leitura. Sem um
 *   critério determinístico, a redundância viraria corrupção silenciosa.
 *
 * Como não existe servidor, exportar/importar JSON continua sendo a única rede de
 * segurança para trocar de aparelho — por isso está na tela de ajustes.
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

/** O que foi gravado, com o contador que ordena as duas cópias. */
type Envelope = { rev: number; data: unknown };

/**
 * O que um dos dois stores respondeu.
 *
 * `empty` e `failed` são coisas diferentes, e tratá-las igual é o que apagava o
 * progresso: ler vazio é usuária nova, falhar ao ler é dado que provavelmente
 * existe e não foi alcançado agora.
 */
type Slot =
  | { state: 'ok'; rev: number; data: unknown }
  | { state: 'empty' }
  | { state: 'failed' };

/** Registros gravados antes do envelope são o dado nu, e valem como rev 0. */
export function unwrap(raw: unknown): Slot {
  if (raw === null || raw === undefined) return { state: 'empty' };
  if (typeof raw === 'object' && 'rev' in raw && 'data' in raw) {
    const envelope = raw as Envelope;
    if (typeof envelope.rev === 'number') {
      return { state: 'ok', rev: envelope.rev, data: envelope.data };
    }
  }
  return { state: 'ok', rev: 0, data: raw };
}

async function readIdb(key: string): Promise<Slot> {
  try {
    return unwrap(await get(key));
  } catch {
    return { state: 'failed' };
  }
}

function readMirror(key: string): Slot {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? { state: 'empty' } : unwrap(JSON.parse(raw));
  } catch {
    // Sem localStorage disponível, ou espelho corrompido pela metade.
    return { state: 'failed' };
  }
}

/**
 * Vence o maior `rev`. Quando nenhuma leitura vem boa, o que sobra a decidir é se
 * o vazio é confiável — e basta um store ter falhado para não ser.
 */
export function reconcile(slots: Slot[]): { rev: number; data: unknown; trustworthy: boolean } {
  let best: { rev: number; data: unknown } | null = null;
  for (const slot of slots) {
    // Só rev e data: carregar o `state` junto vazaria detalhe de leitura no retorno.
    if (slot.state === 'ok' && (best === null || slot.rev > best.rev)) {
      best = { rev: slot.rev, data: slot.data };
    }
  }
  if (best !== null) return { ...best, trustworthy: true };
  return { rev: 0, data: null, trustworthy: !slots.some((slot) => slot.state === 'failed') };
}

async function writeBoth(key: string, rev: number, data: unknown): Promise<void> {
  const envelope: Envelope = { rev, data };
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Cota do espelho estourada: o IndexedDB ainda é o store primário.
  }
  try {
    await set(key, envelope);
  } catch {
    // Modo privado ou cota estourada: seguir jogando vale mais do que travar.
  }
}

/**
 * `rev` da última leitura, para a próxima gravação nascer maior. Vive no módulo
 * porque é detalhe de armazenamento: nenhuma tela precisa carregar isso.
 */
let progressRev = 0;

/**
 * Falso quando nenhum dos dois stores respondeu. Aí o progresso que está na tela
 * é um zero fabricado, e gravá-lo apagaria o registro real que só não foi lido —
 * então a escrita para até um reload conseguir ler.
 */
let progressWritable = true;

/** Aceita o formato atual e o anterior; qualquer outra coisa é ilegível, não vazia. */
function readProgress(stored: unknown): Progress | null {
  const version = (stored as StoredProgress | null)?.version;
  if (version === 1 || version === 2) return migrateProgress(stored as StoredProgress);
  return null;
}

export async function loadProgress(): Promise<Progress> {
  const { rev, data, trustworthy } = reconcile([await readIdb(PROGRESS_KEY), readMirror(PROGRESS_KEY)]);
  const progress = readProgress(data);

  progressRev = rev;
  // Registro presente mas ilegível conta como falha: pode ser de uma versão mais
  // nova do app, e sobrescrever seria apagar o que ela fez lá.
  progressWritable = trustworthy && (data === null || progress !== null);

  return progress ?? emptyProgress();
}

/**
 * `force` é para a restauração de backup: ali o conteúdo não é um zero fabricado,
 * é escolha dela, e precisa passar mesmo com a leitura travada.
 */
export async function saveProgress(progress: Progress, force = false): Promise<void> {
  if (!progressWritable && !force) return;
  progressWritable = true;
  progressRev += 1;
  await writeBoth(PROGRESS_KEY, progressRev, progress);
}

let settingsRev = 0;

export async function loadSettings(): Promise<Settings> {
  const { rev, data } = reconcile([await readIdb(SETTINGS_KEY), readMirror(SETTINGS_KEY)]);
  settingsRev = rev;
  return { ...DEFAULT_SETTINGS, ...(data as Partial<Settings> | null) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  // Sem trava aqui: ajuste perdido se reescreve em dois toques, progresso não.
  settingsRev += 1;
  await writeBoth(SETTINGS_KEY, settingsRev, settings);
}

/**
 * Marca o armazenamento como persistente, e é a razão de o Android nunca ter dado
 * problema: lá o Chrome concede sozinho para PWA instalada. O iOS não tem essa
 * cortesia, e sem a marca o WebKit trata tudo como descartável. Chamado a partir
 * de um toque dela, porque engajamento pesa na decisão do navegador.
 */
export async function requestPersistence(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    // Navegador sem suporte: não é motivo para atrapalhar o início da sessão.
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
