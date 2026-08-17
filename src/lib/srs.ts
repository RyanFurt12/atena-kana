/**
 * Progresso e escolha dos exercícios.
 *
 * Leitner por (caractere × modo), não SM-2 por caractere, e cada modo com seu
 * próprio conjunto de caracteres liberados. Três razões:
 *
 * 1. Ler あ, lembrar あ e desenhar あ são habilidades diferentes e amadurecem em
 *    ritmos muito diferentes — desenhar é ordens de grandeza mais lento que ler.
 *    Uma nota só por caractere esconde que ela lê tudo e não escreve nada.
 * 2. Por isso a liberação também é por modo. Com um conjunto único, o modo mais
 *    lento segura todos os outros: ficar empacada no traçado de さ travaria a
 *    entrada de caracteres novos até para a leitura.
 * 3. Intervalos em dias servem para agendar o *dia*, não para montar a sessão.
 *    Um SRS que some com o caractere por 24h depois de um acerto destrói uma
 *    prática de 10 minutos. Aqui o agendamento só define a *prioridade*: a
 *    sessão sempre completa o número de cartas pedido, mesmo sem nada vencido.
 */

import { ALL_KANA, INTRO_ORDER, KANA_BY_CHAR, type Group } from '../data/kana';
import { canDraw } from './strokeMatch';

export type ExerciseType = 'recognize' | 'recall' | 'draw_guided' | 'draw_free';

/** Os quatro modos específicos, mais o baralho misto. */
export type SessionMode = ExerciseType | 'geral';

export const EXERCISE_TYPES: ExerciseType[] = ['recognize', 'recall', 'draw_guided', 'draw_free'];

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  recognize: 'Ler',
  recall: 'Lembrar',
  draw_guided: 'Aprender a desenhar',
  draw_free: 'Desenhar de memória',
};

/**
 * O kanji de cada modo, para o medalhão e o cabeçalho: ler, lembrar, escrever,
 * papel em branco. Decorativo — o rótulo em português vai sempre junto.
 */
export const EXERCISE_KANJI: Record<ExerciseType, string> = {
  recognize: '読',
  recall: '覚',
  draw_guided: '書',
  draw_free: '白',
};

export const EXERCISE_HINTS: Record<ExerciseType, string> = {
  recognize: 'Vê o hiragana, escolhe o romaji',
  recall: 'Vê o romaji, escolhe o hiragana',
  draw_guided: 'Traça por cima do guia, traço a traço',
  draw_free: 'Folha em branco, correção só no fim',
};

export const MODE_LABELS: Record<SessionMode, string> = {
  ...EXERCISE_LABELS,
  geral: 'Geral',
};

export function isDrawMode(type: ExerciseType): boolean {
  return type === 'draw_guided' || type === 'draw_free';
}

export type SkillState = {
  box: number;
  streak: number;
  seen: number;
  correct: number;
  avgMs: number;
  lastSeenAt: number;
  dueAt: number;
};

export type Settings = {
  enabledGroups: Group[];
  sessionSize: number;
  leniency: 'tranquilo' | 'exigente';
  sound: boolean;
  /** 'papel' é o padrão; 'noite' é escolha dela, não do sistema. */
  theme: 'papel' | 'noite';
};

export type Progress = {
  version: 2;
  /** Chave `${char}|${type}`. */
  skills: Record<string, SkillState>;
  /** Caracteres já apresentados em cada modo, na ordem em que entraram. */
  introduced: Record<ExerciseType, string[]>;
  /** Datas (YYYY-MM-DD) em que houve sessão, para a sequência de dias. */
  studyDays: string[];
};

export type Card = { char: string; type: ExerciseType };

const DAY = 24 * 60 * 60 * 1000;

/** Intervalo em dias de cada caixa. A caixa 0 volta na mesma sessão. */
const BOX_DAYS = [0, 1, 2, 4, 8, 16];

export const MAX_BOX = BOX_DAYS.length - 1;

/** Considerado dominado a partir daqui — só para as estatísticas. */
export const MASTERED_BOX = 4;

/** Caracteres abaixo disto contam como "ainda em construção". */
const WEAK_BOX = 2;

/** Só entra caractere novo quando restam poucos fracos, e no máximo tantos por sessão. */
const MAX_WEAK_BEFORE_UNLOCK = 2;
const MAX_NEW_PER_SESSION = 5;

/** Não repetir o mesmo caractere dentro desta janela de cartas. */
const NO_REPEAT_WINDOW = 3;

/** Acertou rápido demais para ter pensado? Não — rápido é sinal de domínio. */
const FAST_ANSWER_MS = 3000;

export const DEFAULT_SETTINGS: Settings = {
  enabledGroups: ['basic'],
  sessionSize: 20,
  leniency: 'tranquilo',
  sound: true,
  theme: 'papel',
};

export function emptyIntroduced(): Record<ExerciseType, string[]> {
  return { recognize: [], recall: [], draw_guided: [], draw_free: [] };
}

export function emptyProgress(): Progress {
  return { version: 2, skills: {}, introduced: emptyIntroduced(), studyDays: [] };
}

export function skillKey(char: string, type: ExerciseType): string {
  return `${char}|${type}`;
}

export function emptySkill(): SkillState {
  return { box: 0, streak: 0, seen: 0, correct: 0, avgMs: 0, lastSeenAt: 0, dueAt: 0 };
}

export function getSkill(progress: Progress, char: string, type: ExerciseType): SkillState {
  return progress.skills[skillKey(char, type)] ?? emptySkill();
}

/**
 * Quantos dias faltam para a letra voltar a ter prioridade — 0 quer dizer hoje.
 *
 * Sai de `dueAt`, não do intervalo nominal da caixa: o que interessa na ficha é
 * quando *aquela* letra volta, e não quanto a caixa dela costuma esperar.
 */
export function daysUntilDue(skill: SkillState, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((skill.dueAt - now) / DAY));
}

/**
 * Atualiza uma habilidade depois de uma resposta.
 *
 * Acerto rápido sobe uma caixa; acerto devagar mantém a caixa (ela sabe, mas
 * ainda está contando nos dedos). Erro desce duas — voltar ao começo por um
 * deslize é desanimador, e deixar quase intacto não corrige nada.
 */
export function applyResult(
  skill: SkillState,
  correct: boolean,
  elapsedMs: number,
  now: number,
): SkillState {
  let box = skill.box;
  if (correct) {
    if (elapsedMs <= FAST_ANSWER_MS || skill.streak >= 1) box = Math.min(MAX_BOX, box + 1);
  } else {
    box = Math.max(0, box - 2);
  }

  const seen = skill.seen + 1;
  return {
    box,
    streak: correct ? skill.streak + 1 : 0,
    seen,
    correct: skill.correct + (correct ? 1 : 0),
    avgMs: Math.round((skill.avgMs * skill.seen + elapsedMs) / seen),
    lastSeenAt: now,
    dueAt: now + BOX_DAYS[box] * DAY,
  };
}

/** Caracteres dos grupos ligados, na ordem em que devem ser apresentados. */
export function poolFor(settings: Settings): string[] {
  const enabled = new Set(settings.enabledGroups);
  const basics = INTRO_ORDER.filter((c) => enabled.has(KANA_BY_CHAR.get(c)!.group));
  const extras = ALL_KANA.filter((k) => k.group !== 'basic' && enabled.has(k.group)).map((k) => k.char);
  return [...basics, ...extras];
}

/** Yōon (きゃ) são dois caracteres e não têm traçado próprio — fora dos modos de desenho. */
export function supportsChar(type: ExerciseType, char: string): boolean {
  return !isDrawMode(type) || canDraw(char);
}

/** Caracteres que o modo pode usar, respeitando os grupos ligados. */
export function poolForMode(settings: Settings, type: ExerciseType): string[] {
  return poolFor(settings).filter((char) => supportsChar(type, char));
}

/** Caracteres já apresentados naquele modo, filtrados pelos grupos ligados. */
export function introducedIn(progress: Progress, settings: Settings, type: ExerciseType): string[] {
  const pool = new Set(poolForMode(settings, type));
  return progress.introduced[type].filter((char) => pool.has(char));
}

/**
 * Decide quais caracteres novos entram nesta sessão, **naquele modo**.
 *
 * Vazamento controlado: nada de despejar 46 caracteres de uma vez. Um novo só
 * entra quando o que já está em jogo naquele modo está razoavelmente firme — e
 * como a conta é por modo, empacar no traçado não segura mais a leitura.
 */
export function unlockNext(progress: Progress, settings: Settings, type: ExerciseType): string[] {
  const introduced = introducedIn(progress, settings, type);
  const known = new Set(introduced);
  const candidates = poolForMode(settings, type).filter((c) => !known.has(c));
  if (candidates.length === 0) return [];

  const weak = introduced.filter((char) => getSkill(progress, char, type).box < WEAK_BOX).length;

  if (introduced.length > 0 && weak > MAX_WEAK_BEFORE_UNLOCK) return [];

  // Primeira sessão começa com um punhado; depois vai de pouco em pouco.
  const room = introduced.length === 0 ? MAX_NEW_PER_SESSION : MAX_NEW_PER_SESSION - weak;
  return candidates.slice(0, Math.max(1, room));
}

/**
 * Peso de uma carta no sorteio. Quanto mais fraca e mais atrasada, mais provável.
 */
function cardWeight(progress: Progress, card: Card, now: number): number {
  const skill = getSkill(progress, card.char, card.type);
  let weight = (MAX_BOX + 1 - skill.box) ** 1.5;
  if (skill.seen === 0) weight *= 3;
  else if (skill.dueAt <= now) weight *= 2.5;

  // Acertar sempre esfria; errar muito esquenta.
  if (skill.seen >= 3) {
    const accuracy = skill.correct / skill.seen;
    weight *= 1 + (1 - accuracy) * 2;
  }
  return weight;
}

function weightedPick(cards: Card[], weights: number[], rng: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(rng() * cards.length);
  let roll = rng() * total;
  for (let i = 0; i < cards.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return cards.length - 1;
}

/**
 * Tudo que aquele modo pode perguntar agora: o que já foi apresentado nele mais o
 * que entra nesta sessão.
 *
 * Também é de onde as alternativas de múltipla escolha têm de sair. Oferecer um
 * caractere que ela nunca viu não testa nada — ela elimina por não reconhecer, e
 * o exercício vira sorte em vez de leitura.
 */
export function knownChars(progress: Progress, settings: Settings, type: ExerciseType): string[] {
  return [...new Set([...introducedIn(progress, settings, type), ...unlockNext(progress, settings, type)])];
}

/** As cartas possíveis de um modo. */
export function candidatesFor(progress: Progress, settings: Settings, type: ExerciseType): Card[] {
  return knownChars(progress, settings, type).map((char) => ({ char, type }));
}

/**
 * Monta o baralho da sessão.
 *
 * Sempre devolve `size` cartas, mesmo que nada esteja vencido — é aqui que este
 * SRS difere de um agendador puro. Nunca repete o mesmo caractere dentro de uma
 * janela de 3 cartas, para não virar "clique no mesmo botão de novo".
 *
 * No modo `geral` os quatro tipos entram no mesmo baralho e o peso do sorteio
 * resolve o resto: como desenhar de memória fica em caixas baixas por muito mais
 * tempo que ler, ele aparece mais sem precisar de nenhuma regra especial.
 */
export function buildDeck(
  progress: Progress,
  settings: Settings,
  mode: SessionMode,
  now: number = Date.now(),
  rng: () => number = Math.random,
): Card[] {
  const types = mode === 'geral' ? EXERCISE_TYPES : [mode];
  const candidates = types.flatMap((type) => candidatesFor(progress, settings, type));
  if (candidates.length === 0) return [];

  const deck: Card[] = [];
  const recent: string[] = [];

  while (deck.length < settings.sessionSize) {
    const allowed = candidates.filter((c) => !recent.includes(c.char));
    const usable = allowed.length > 0 ? allowed : candidates;
    const weights = usable.map((c) => cardWeight(progress, c, now));
    const card = usable[weightedPick(usable, weights, rng)];

    deck.push(card);
    recent.push(card.char);
    if (recent.length > NO_REPEAT_WINDOW) recent.shift();
  }

  return deck;
}

/**
 * A sessão em andamento. Guarda o baralho e reinjeta o que ela errou algumas
 * cartas adiante — treinar de novo na hora não prova nada, o valor está em
 * lembrar depois de um intervalo curto.
 */
export class SessionRunner {
  private index = 0;
  private reinjected = new Set<string>();

  readonly deck: Card[];
  answered = 0;
  correct = 0;
  readonly startedAt: number;

  constructor(deck: Card[], now: number = Date.now()) {
    this.deck = [...deck];
    this.startedAt = now;
  }

  get current(): Card | null {
    return this.deck[this.index] ?? null;
  }

  get total(): number {
    return this.deck.length;
  }

  get position(): number {
    return this.index;
  }

  get done(): boolean {
    return this.index >= this.deck.length;
  }

  /**
   * Registra a resposta, avança e devolve o progresso atualizado.
   * Não muta `progress` — devolve um novo objeto.
   */
  submit(progress: Progress, correct: boolean, elapsedMs: number, now: number = Date.now()): Progress {
    const card = this.current;
    if (!card) return progress;

    const key = skillKey(card.char, card.type);
    const seenInMode = progress.introduced[card.type];
    const updated: Progress = {
      ...progress,
      skills: {
        ...progress.skills,
        [key]: applyResult(getSkill(progress, card.char, card.type), correct, elapsedMs, now),
      },
      // O caractere entra na lista do modo em que apareceu, não numa lista global:
      // ter lido あ não significa que ela já sabe desenhá-lo.
      introduced: seenInMode.includes(card.char)
        ? progress.introduced
        : { ...progress.introduced, [card.type]: [...seenInMode, card.char] },
    };

    this.answered++;
    if (correct) this.correct++;

    // Uma reinjeção por carta: errar duas vezes não deve empilhar a sessão.
    if (!correct && !this.reinjected.has(key)) {
      this.reinjected.add(key);
      const offset = 2 + (this.answered % 2); // 2 ou 3 cartas adiante
      this.deck.splice(Math.min(this.index + offset, this.deck.length), 0, card);
    }

    this.index++;
    return updated;
  }
}

export type ModeProgress = {
  type: ExerciseType;
  /** Quantos caracteres o modo já apresentou. */
  introduced: number;
  /** Quantos chegaram à caixa de domínio. */
  mastered: number;
  /** Total possível naquele modo com os grupos ligados. */
  total: number;
  seen: number;
  correct: number;
};

/** Números por modo — a base da tela inicial e das estatísticas. */
export function modeProgress(progress: Progress, settings: Settings, type: ExerciseType): ModeProgress {
  const introduced = introducedIn(progress, settings, type);
  let mastered = 0;
  let seen = 0;
  let correct = 0;

  for (const char of introduced) {
    const skill = getSkill(progress, char, type);
    if (skill.box >= MASTERED_BOX) mastered++;
    seen += skill.seen;
    correct += skill.correct;
  }

  return {
    type,
    introduced: introduced.length,
    mastered,
    total: poolForMode(settings, type).length,
    seen,
    correct,
  };
}

/**
 * O número do 稽古 na tela inicial: caracteres dominados em *todos* os modos que
 * os suportam.
 *
 * Somar os quatro modos daria "0 / 184", que não quer dizer nada para ela. Isto
 * responde a pergunta real — quantas letras eu já sei de verdade, sabendo ler,
 * lembrar e escrever.
 */
export function overallProgress(
  progress: Progress,
  settings: Settings,
): { mastered: number; total: number } {
  const chars = poolFor(settings);
  const mastered = chars.filter((char) =>
    EXERCISE_TYPES.filter((type) => supportsChar(type, char)).every(
      (type) => getSkill(progress, char, type).box >= MASTERED_BOX,
    ),
  ).length;
  return { mastered, total: chars.length };
}

/**
 * Progresso salvo por uma versão anterior, quando havia um só conjunto de
 * caracteres e um único modo de desenho.
 */
export type ProgressV1 = {
  version: 1;
  skills: Record<string, SkillState>;
  introduced: string[];
  studyDays: string[];
};

/** Qualquer formato que já tenha sido gravado em disco. */
export type StoredProgress = ProgressV1 | Progress;

/**
 * Converte o formato antigo. O que ela já treinou desenhando vira "aprender a
 * desenhar", que é o que aquele modo de fato era; "desenhar de memória" começa
 * do zero, porque é um exercício que ainda não existia.
 */
export function migrateProgress(stored: StoredProgress): Progress {
  if (stored.version === 2) return stored;

  const skills: Record<string, SkillState> = {};
  for (const [key, skill] of Object.entries(stored.skills)) {
    const [char, type] = key.split('|');
    skills[skillKey(char, type === 'draw' ? 'draw_guided' : (type as ExerciseType))] = skill;
  }

  const drawn = stored.introduced.filter((char) => skills[skillKey(char, 'draw_guided')]?.seen > 0);

  return {
    version: 2,
    skills,
    introduced: {
      recognize: [...stored.introduced],
      recall: [...stored.introduced],
      draw_guided: drawn,
      draw_free: [],
    },
    studyDays: stored.studyDays ?? [],
  };
}

/** Marca o dia de hoje como estudado (para a sequência na tela de estatísticas). */
export function recordStudyDay(progress: Progress, now: number = Date.now()): Progress {
  const today = new Date(now).toISOString().slice(0, 10);
  if (progress.studyDays.includes(today)) return progress;
  return { ...progress, studyDays: [...progress.studyDays, today].slice(-400) };
}

/** Dias seguidos de estudo terminando hoje (ou ontem, se ainda não estudou hoje). */
export function currentStreak(progress: Progress, now: number = Date.now()): number {
  const days = new Set(progress.studyDays);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
