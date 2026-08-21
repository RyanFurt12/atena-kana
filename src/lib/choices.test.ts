import { describe, expect, it } from 'vitest';
import { buildChoices, pickDistractors } from './choices';
import { ALL_KANA, KANA_BY_CHAR, INTRO_ORDER } from '../data/kana';

/**
 * `INTRO_ORDER` carrega os dois silabários, mas um conjunto real nunca mistura —
 * `poolFor` filtra por silabário antes de chegar aqui. Os testes usam um lado por
 * vez para medir o que o app de fato monta.
 */
const BASICOS = INTRO_ORDER.filter((c) => KANA_BY_CHAR.get(c)!.script === 'hiragana');
const BASICOS_KATAKANA = INTRO_ORDER.filter((c) => KANA_BY_CHAR.get(c)!.script === 'katakana');
const kana = (char: string) => KANA_BY_CHAR.get(char)!;

/** Com que frequência `char` aparece entre os distratores de `target`. */
function frequency(target: string, char: string, pool: string[] = BASICOS, rounds = 200): number {
  let hits = 0;
  for (let i = 0; i < rounds; i++) {
    if (pickDistractors(kana(target), pool).some((k) => k.char === char)) hits++;
  }
  return hits / rounds;
}

describe('pickDistractors', () => {
  it('prioriza os caracteres que ela confunde', () => {
    // お é o confusável declarado de あ e deve aparecer quase sempre — é isso
    // que separa um exercício útil de um sorteio entre 46 caracteres.
    expect(frequency('あ', 'お')).toBeGreaterThan(0.8);
    expect(frequency('い', 'り')).toBeGreaterThan(0.8);
  });

  it('cai para a mesma linha quando faltam confusáveis', () => {
    // ふ não tem confusável declarado entre os básicos além de う.
    const distratores = pickDistractors(kana('へ'), BASICOS);
    expect(distratores).toHaveLength(3);
  });

  it('nunca repete romaji nem devolve o próprio alvo', () => {
    for (const target of ALL_KANA) {
      const pool = ALL_KANA.map((k) => k.char);
      const distratores = pickDistractors(target, pool);
      const romajis = distratores.map((k) => k.romaji);
      expect(new Set(romajis).size).toBe(romajis.length);
      expect(romajis).not.toContain(target.romaji);
      expect(distratores.map((k) => k.char)).not.toContain(target.char);
    }
  });

  it('nunca põe ぢ junto de じ, que teriam o mesmo romaji', () => {
    const pool = ALL_KANA.map((k) => k.char);
    for (let i = 0; i < 100; i++) {
      expect(pickDistractors(kana('じ'), pool).map((k) => k.char)).not.toContain('ぢ');
      expect(pickDistractors(kana('ず'), pool).map((k) => k.char)).not.toContain('づ');
    }
  });

  it('devolve menos opções quando o conjunto é pequeno, sem inventar', () => {
    const distratores = pickDistractors(kana('あ'), ['あ', 'い']);
    expect(distratores.map((k) => k.char)).toEqual(['い']);
  });
});

describe('pickDistractors em katakana', () => {
  it('usa os confusáveis do katakana, que são outros', () => {
    // As duas piores do silabário: mesmos traços, direção trocada. Se estes dois
    // não vierem quase sempre, o exercício virou sorteio.
    expect(frequency('シ', 'ツ', BASICOS_KATAKANA)).toBeGreaterThan(0.8);
    expect(frequency('ソ', 'ン', BASICOS_KATAKANA)).toBeGreaterThan(0.8);
  });

  it('não herda os confusáveis do hiragana', () => {
    // お é confusável de あ, mas オ não é de ア — a semelhança era da silhueta do
    // hiragana. Deslocar a lista de codepoint teria produzido exatamente isso.
    expect(kana('ア').confusable).not.toContain('オ');
    expect(kana('あ').confusable).toContain('お');
  });

  it('dá a cada silabário uma lista própria e não vazia nos básicos', () => {
    for (const char of [...BASICOS, ...BASICOS_KATAKANA]) {
      const alvo = kana(char);
      for (const outro of alvo.confusable) {
        expect(kana(outro).script).toBe(alvo.script);
      }
    }
  });
});

describe('buildChoices', () => {
  it('inclui exatamente uma resposta certa', () => {
    for (let i = 0; i < 50; i++) {
      const choices = buildChoices(kana('き'), BASICOS);
      expect(choices).toHaveLength(4);
      expect(choices.filter((c) => c.correct)).toHaveLength(1);
    }
  });

  it('não deixa a resposta certa fixa numa posição', () => {
    const posicoes = new Set<number>();
    for (let i = 0; i < 60; i++) {
      posicoes.add(buildChoices(kana('き'), BASICOS).findIndex((c) => c.correct));
    }
    expect(posicoes.size).toBeGreaterThan(1);
  });
});
