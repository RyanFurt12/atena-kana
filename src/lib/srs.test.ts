import { describe, expect, it } from 'vitest';
import { KANA_BY_CHAR } from '../data/kana';
import {
  DEFAULT_SETTINGS,
  EXERCISE_TYPES,
  SessionRunner,
  applyResult,
  buildDeck,
  currentStreak,
  emptyProgress,
  emptySkill,
  getSkill,
  introducedIn,
  knownChars,
  migrateProgress,
  modeProgress,
  poolFor,
  poolForMode,
  recordStudyDay,
  skillKey,
  unlockNext,
  type ExerciseType,
  type Progress,
  type ProgressV1,
  type Settings,
} from './srs';

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

/** Gerador determinístico, para os testes não dependerem da sorte. */
function seeded(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Progresso com os caracteres já apresentados em `types`, todos na mesma caixa. */
function progressWith(chars: string[], box: number, types: ExerciseType[] = EXERCISE_TYPES): Progress {
  const progress = emptyProgress();
  for (const type of types) {
    progress.introduced[type] = [...chars];
    for (const char of chars) {
      progress.skills[skillKey(char, type)] = { ...emptySkill(), box, seen: 5, correct: 5 };
    }
  }
  return progress;
}

describe('applyResult', () => {
  it('sobe de caixa quando acerta rápido', () => {
    const next = applyResult(emptySkill(), true, 1200, NOW);
    expect(next.box).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.dueAt).toBe(NOW + DAY);
  });

  it('não sobe no primeiro acerto lento', () => {
    const next = applyResult(emptySkill(), true, 9000, NOW);
    expect(next.box).toBe(0);
    expect(next.dueAt).toBe(NOW);
  });

  it('sobe no acerto lento se já vinha acertando', () => {
    const warm = { ...emptySkill(), box: 2, streak: 1 };
    expect(applyResult(warm, true, 9000, NOW).box).toBe(3);
  });

  it('desce duas caixas no erro, sem passar de zero', () => {
    expect(applyResult({ ...emptySkill(), box: 3 }, false, 4000, NOW).box).toBe(1);
    expect(applyResult({ ...emptySkill(), box: 1 }, false, 4000, NOW).box).toBe(0);
  });

  it('zera a sequência no erro e guarda a média de tempo', () => {
    const skill = { ...emptySkill(), streak: 4, seen: 1, avgMs: 2000 };
    const next = applyResult(skill, false, 4000, NOW);
    expect(next.streak).toBe(0);
    expect(next.avgMs).toBe(3000);
  });
});

describe('escopo de cada modo', () => {
  it('tira yōon dos modos de desenho, porque são dois caracteres', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, enabledGroups: ['basic', 'yoon'] };
    expect(poolFor(settings)).toContain('きゃ');
    expect(poolForMode(settings, 'recognize')).toContain('きゃ');
    expect(poolForMode(settings, 'draw_free')).not.toContain('きゃ');
    expect(poolForMode(settings, 'draw_guided')).not.toContain('きゃ');
  });

  it('respeita os grupos ligados', () => {
    expect(poolFor({ ...DEFAULT_SETTINGS, enabledGroups: ['basic', 'dakuten'] })).toContain('が');
    expect(poolFor(DEFAULT_SETTINGS)).not.toContain('が');
  });

  it('esconde caracteres de um grupo desligado sem apagar o progresso deles', () => {
    const progress = progressWith(['が'], 3);
    expect(introducedIn(progress, DEFAULT_SETTINGS, 'recognize')).toEqual([]);
    expect(getSkill(progress, 'が', 'recognize').box).toBe(3);
  });
});

describe('silabário', () => {
  const katakana: Settings = { ...DEFAULT_SETTINGS, script: 'katakana' };

  it('entrega um silabário por vez, sem vazar o outro', () => {
    const hira = poolFor(DEFAULT_SETTINGS);
    const kata = poolFor(katakana);

    expect(hira).toContain('あ');
    expect(hira).not.toContain('ア');
    expect(kata).toContain('ア');
    expect(kata).not.toContain('あ');
  });

  it('dá aos dois o mesmo tamanho e a mesma ordem do gojūon', () => {
    expect(poolFor(katakana)).toHaveLength(poolFor(DEFAULT_SETTINGS).length);
    expect(poolFor(katakana).slice(0, 5)).toEqual(['ア', 'イ', 'ウ', 'エ', 'オ']);
    // ン fecha a lista dos básicos, como ん do outro lado.
    expect(poolFor(katakana).at(-1)).toBe('ン');
  });

  it('mantém os grupos funcionando dentro do katakana', () => {
    expect(poolFor({ ...katakana, enabledGroups: ['basic', 'dakuten'] })).toContain('ガ');
    expect(poolFor(katakana)).not.toContain('ガ');
    // キャ são dois caracteres nos dois silabários, então segue fora do desenho.
    const comYoon: Settings = { ...katakana, enabledGroups: ['basic', 'yoon'] };
    expect(poolForMode(comYoon, 'recognize')).toContain('キャ');
    expect(poolForMode(comYoon, 'draw_free')).not.toContain('キャ');
  });

  it('deixa o katakana desenhável, que é o que o KanjiVG precisava cobrir', () => {
    expect(poolForMode(katakana, 'draw_guided')).toHaveLength(poolFor(katakana).length);
  });

  it('guarda o progresso de cada silabário separado, e trocar não apaga nada', () => {
    // ア e あ são codepoints diferentes, então a chave do progresso já os separa
    // sozinha — é por isso que trocar de silabário não precisou de migração.
    const progress = progressWith(['あ', 'ア'], 5);

    expect(introducedIn(progress, DEFAULT_SETTINGS, 'recognize')).toEqual(['あ']);
    expect(introducedIn(progress, katakana, 'recognize')).toEqual(['ア']);
    expect(getSkill(progress, 'あ', 'recognize').box).toBe(5);
    expect(getSkill(progress, 'ア', 'recognize').box).toBe(5);
  });

  it('conta as estatísticas só do silabário escolhido', () => {
    const progress = progressWith(['あ', 'い', 'ア'], 5);
    expect(modeProgress(progress, DEFAULT_SETTINGS, 'recognize').mastered).toBe(2);
    expect(modeProgress(progress, katakana, 'recognize').mastered).toBe(1);
  });

  it('monta baralhos que nunca cruzam os dois', () => {
    const progress = progressWith(['あ', 'い', 'う', 'ア', 'イ', 'ウ'], 3);
    // Vale para o baralho inteiro, não só para o que já foi apresentado: o
    // `unlockNext` também injeta caracteres novos, e eles têm de vir do mesmo
    // lado. É a garantia que faz o modo `recall` ter uma resposta só.
    const deck = buildDeck(progress, katakana, 'geral', NOW, seeded(7));

    expect(deck).not.toHaveLength(0);
    for (const card of deck) {
      expect(KANA_BY_CHAR.get(card.char)!.script).toBe('katakana');
    }
  });

  it('nasce em hiragana, para quem já usava o app não trocar de silabário sozinho', () => {
    expect(DEFAULT_SETTINGS.script).toBe('hiragana');
  });
});

describe('unlockNext, por modo', () => {
  it('começa com um punhado', () => {
    expect(unlockNext(emptyProgress(), DEFAULT_SETTINGS, 'recognize')).toEqual(['あ', 'い', 'う', 'え', 'お']);
  });

  it('segura caracteres novos enquanto sobram fracos naquele modo', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 0);
    expect(unlockNext(progress, DEFAULT_SETTINGS, 'recognize')).toEqual([]);
  });

  it('libera quando os antigos daquele modo estão firmes', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 3);
    expect(unlockNext(progress, DEFAULT_SETTINGS, 'recognize')).toContain('か');
  });

  it('não deixa um modo travar o outro', () => {
    // Ela lê bem os cinco primeiros, mas ainda não desenha nenhum deles.
    // A leitura tem de seguir em frente mesmo assim — era isso que o modelo
    // antigo, com um conjunto único, impedia.
    const progress = emptyProgress();
    for (const char of ['あ', 'い', 'う', 'え', 'お']) {
      progress.introduced.recognize.push(char);
      progress.introduced.draw_free.push(char);
      progress.skills[skillKey(char, 'recognize')] = { ...emptySkill(), box: 4, seen: 8, correct: 8 };
      progress.skills[skillKey(char, 'draw_free')] = { ...emptySkill(), box: 0, seen: 8, correct: 1 };
    }

    expect(unlockNext(progress, DEFAULT_SETTINGS, 'recognize')).toContain('か');
    expect(unlockNext(progress, DEFAULT_SETTINGS, 'draw_free')).toEqual([]);
  });
});

describe('buildDeck', () => {
  it('sempre entrega a sessão cheia, mesmo com tudo dominado', () => {
    // Com tudo na caixa máxima e nada vencido, um agendador puro devolveria zero
    // cartas e a sessão simplesmente não aconteceria.
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 5);
    for (const key of Object.keys(progress.skills)) {
      progress.skills[key] = { ...progress.skills[key], dueAt: NOW + 30 * DAY };
    }
    expect(buildDeck(progress, DEFAULT_SETTINGS, 'geral', NOW, seeded())).toHaveLength(20);
  });

  it('num modo só, todas as cartas são daquele tipo', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 2);
    const deck = buildDeck(progress, DEFAULT_SETTINGS, 'draw_free', NOW, seeded(5));
    expect(deck).toHaveLength(20);
    expect(deck.every((card) => card.type === 'draw_free')).toBe(true);
  });

  it('no geral, mistura os quatro tipos', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お', 'か', 'き'], 2);
    const deck = buildDeck(progress, DEFAULT_SETTINGS, 'geral', NOW, seeded(11));
    expect(new Set(deck.map((c) => c.type)).size).toBe(4);
  });

  it('nunca repete o mesmo caractere em janela de 3', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お', 'か', 'き'], 2);
    const deck = buildDeck(progress, DEFAULT_SETTINGS, 'geral', NOW, seeded(7));
    for (let i = 1; i < deck.length; i++) {
      const window = deck.slice(Math.max(0, i - 3), i).map((c) => c.char);
      expect(window).not.toContain(deck[i].char);
    }
  });

  it('favorece os caracteres fracos', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 5);
    for (const type of EXERCISE_TYPES) {
      progress.skills[skillKey('お', type)] = { ...emptySkill(), box: 0, seen: 6, correct: 1 };
    }
    const deck = buildDeck(progress, { ...DEFAULT_SETTINGS, sessionSize: 60 }, 'geral', NOW, seeded(3));
    const counts = new Map<string, number>();
    for (const card of deck) counts.set(card.char, (counts.get(card.char) ?? 0) + 1);
    const outros = ['あ', 'い', 'う', 'え'].map((c) => counts.get(c) ?? 0);
    expect(counts.get('お')!).toBeGreaterThan(Math.max(...outros));
  });

  it('no geral, o modo mais atrasado aparece mais que o dominado', () => {
    // Sem regra especial: o peso por caixa já cuida disso, que é o motivo de o
    // "geral" não precisar escolher entre com e sem tutorial.
    const progress = emptyProgress();
    for (const char of ['あ', 'い', 'う', 'え', 'お']) {
      for (const type of EXERCISE_TYPES) progress.introduced[type].push(char);
      progress.skills[skillKey(char, 'recognize')] = { ...emptySkill(), box: 5, seen: 9, correct: 9 };
      progress.skills[skillKey(char, 'draw_free')] = { ...emptySkill(), box: 0, seen: 9, correct: 2 };
    }

    const deck = buildDeck(progress, { ...DEFAULT_SETTINGS, sessionSize: 80 }, 'geral', NOW, seeded(13));
    const livres = deck.filter((c) => c.type === 'draw_free').length;
    const leitura = deck.filter((c) => c.type === 'recognize').length;
    expect(livres).toBeGreaterThan(leitura);
  });

  it('devolve baralho vazio quando o modo não tem caracteres', () => {
    // Só yōon ligado: os modos de desenho ficam sem nada para oferecer.
    const settings: Settings = { ...DEFAULT_SETTINGS, enabledGroups: ['yoon'] };
    expect(buildDeck(emptyProgress(), settings, 'draw_guided', NOW, seeded())).toEqual([]);
    expect(buildDeck(emptyProgress(), settings, 'recall', NOW, seeded()).length).toBe(20);
  });
});

describe('SessionRunner', () => {
  it('reinjeta o que ela errou algumas cartas adiante', () => {
    const deck = ['あ', 'い', 'う', 'え', 'お'].map((char) => ({ char, type: 'recognize' as const }));
    const runner = new SessionRunner(deck, NOW);
    runner.submit(emptyProgress(), false, 3000, NOW);

    expect(runner.total).toBe(6);
    const posicoes = runner.deck.map((c, i) => (c.char === 'あ' ? i : -1)).filter((i) => i >= 0);
    expect(posicoes[1]).toBeGreaterThanOrEqual(2);
    expect(posicoes[1]).toBeLessThanOrEqual(3);
  });

  it('reinjeta cada carta no máximo uma vez', () => {
    const deck = Array.from({ length: 4 }, () => ({ char: 'あ', type: 'recognize' as const }));
    const runner = new SessionRunner(deck, NOW);
    let progress = emptyProgress();
    for (let i = 0; i < 4; i++) progress = runner.submit(progress, false, 3000, NOW);
    expect(runner.total).toBe(5);
  });

  it('apresenta o caractere só no modo em que ele apareceu', () => {
    const runner = new SessionRunner([{ char: 'あ', type: 'recognize' }], NOW);
    const progress = runner.submit(emptyProgress(), true, 1000, NOW);

    expect(progress.introduced.recognize).toEqual(['あ']);
    expect(progress.introduced.draw_free).toEqual([]);
    expect(getSkill(progress, 'あ', 'recognize').box).toBe(1);
    expect(getSkill(progress, 'あ', 'draw_free').box).toBe(0);
  });

  it('não muta o progresso recebido', () => {
    const runner = new SessionRunner([{ char: 'あ', type: 'recognize' }], NOW);
    const original = emptyProgress();
    runner.submit(original, true, 1000, NOW);
    expect(original.introduced.recognize).toEqual([]);
    expect(original.skills).toEqual({});
  });
});

describe('modeProgress', () => {
  it('conta apresentados, dominados e acerto do modo', () => {
    const progress = progressWith(['あ', 'い'], 4, ['recognize']);
    progress.skills[skillKey('い', 'recognize')] = { ...emptySkill(), box: 1, seen: 4, correct: 2 };

    const stats = modeProgress(progress, DEFAULT_SETTINGS, 'recognize');
    expect(stats.introduced).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.total).toBe(46);
    expect(stats.correct / stats.seen).toBeCloseTo(7 / 9);
  });

  it('o total do desenho não inclui yōon', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, enabledGroups: ['basic', 'yoon'] };
    expect(modeProgress(emptyProgress(), settings, 'recognize').total).toBe(79);
    expect(modeProgress(emptyProgress(), settings, 'draw_free').total).toBe(46);
  });
});

describe('migração do formato antigo', () => {
  const v1: ProgressV1 = {
    version: 1,
    skills: {
      'あ|recognize': { ...emptySkill(), box: 3, seen: 6, correct: 5 },
      'あ|draw': { ...emptySkill(), box: 2, seen: 4, correct: 3 },
      'い|recognize': { ...emptySkill(), box: 1, seen: 2, correct: 1 },
    },
    introduced: ['あ', 'い'],
    studyDays: ['2026-08-14'],
  };

  it('leva o desenho antigo para "aprender a desenhar"', () => {
    const migrated = migrateProgress(v1);
    expect(migrated.version).toBe(2);
    expect(getSkill(migrated, 'あ', 'draw_guided').box).toBe(2);
    expect(migrated.introduced.draw_guided).toEqual(['あ']);
  });

  it('começa "desenhar de memória" do zero, porque o exercício é novo', () => {
    const migrated = migrateProgress(v1);
    expect(migrated.introduced.draw_free).toEqual([]);
    expect(getSkill(migrated, 'あ', 'draw_free').seen).toBe(0);
  });

  it('preserva leitura, escrita e dias estudados', () => {
    const migrated = migrateProgress(v1);
    expect(migrated.introduced.recognize).toEqual(['あ', 'い']);
    expect(migrated.introduced.recall).toEqual(['あ', 'い']);
    expect(getSkill(migrated, 'あ', 'recognize').box).toBe(3);
    expect(migrated.studyDays).toEqual(['2026-08-14']);
  });

  it('deixa o formato atual intacto', () => {
    const atual = progressWith(['あ'], 3);
    expect(migrateProgress(atual)).toBe(atual);
  });
});

describe('sequência de dias', () => {
  it('conta dias seguidos terminando hoje', () => {
    let progress = emptyProgress();
    progress = recordStudyDay(progress, NOW - 2 * DAY);
    progress = recordStudyDay(progress, NOW - DAY);
    progress = recordStudyDay(progress, NOW);
    expect(currentStreak(progress, NOW)).toBe(3);
  });

  it('ainda conta se ela estudou ontem e hoje não', () => {
    const progress = recordStudyDay(emptyProgress(), NOW - DAY);
    expect(currentStreak(progress, NOW)).toBe(1);
  });

  it('quebra quando pula um dia', () => {
    const progress = recordStudyDay(emptyProgress(), NOW - 3 * DAY);
    expect(currentStreak(progress, NOW)).toBe(0);
  });

  it('não duplica o mesmo dia', () => {
    let progress = recordStudyDay(emptyProgress(), NOW);
    progress = recordStudyDay(progress, NOW + 60_000);
    expect(progress.studyDays).toHaveLength(1);
  });
});

describe('knownChars — a fonte das alternativas', () => {
  it('na primeira sessão, só os cinco que ela vai ver', () => {
    // Regressão: as alternativas saíam de `poolFor`, ou seja, dos 46 caracteres
    // do grupo ligado. No primeiro card de "i" as opções vinham "u ko ri i" —
    // dois caracteres que ela nunca tinha visto, o que transforma o exercício
    // em eliminação por estranheza em vez de leitura.
    expect(knownChars(emptyProgress(), DEFAULT_SETTINGS, 'recognize')).toEqual(['あ', 'い', 'う', 'え', 'お']);
  });

  it('nunca devolve um caractere que aquele modo não apresentou', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 0, ['recognize']);
    const conhecidos = knownChars(progress, DEFAULT_SETTINGS, 'recognize');

    expect(conhecidos).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(conhecidos).not.toContain('か');
    // O mesmo modo, outro conjunto: desenhar ainda não apresentou nada.
    expect(knownChars(progress, DEFAULT_SETTINGS, 'draw_free')).toEqual(['あ', 'い', 'う', 'え', 'お']);
  });

  it('cresce junto com a liberação', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 3, ['recognize']);
    const conhecidos = knownChars(progress, DEFAULT_SETTINGS, 'recognize');
    expect(conhecidos).toHaveLength(10);
    expect(conhecidos).toContain('か');
    expect(conhecidos).not.toContain('さ');
  });

  it('cobre exatamente os caracteres que o baralho pode sortear', () => {
    const progress = progressWith(['あ', 'い', 'う', 'え', 'お'], 2, ['recognize']);
    const conhecidos = new Set(knownChars(progress, DEFAULT_SETTINGS, 'recognize'));
    const deck = buildDeck(progress, DEFAULT_SETTINGS, 'recognize', NOW, seeded(9));
    for (const card of deck) expect(conhecidos.has(card.char)).toBe(true);
  });
});
