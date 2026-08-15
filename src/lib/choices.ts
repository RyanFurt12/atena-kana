/**
 * Montagem das opções de múltipla escolha.
 *
 * A parte que decide se o exercício ensina alguma coisa. Sortear 3 caracteres
 * quaisquer entre 46 faz a resposta certa saltar aos olhos: se o alvo é あ e as
 * opções são あ / ぬ / せ / り, dá para acertar sem ler nada. As opções precisam
 * ser justamente as que ela confunde — あ contra お, い contra り — e, na falta
 * dessas, caracteres da mesma linha (mesma consoante, testa a vogal) ou da mesma
 * coluna (mesma vogal, testa a consoante).
 */

import { KANA_BY_CHAR, type Kana } from '../data/kana';

/** Embaralhamento Fisher-Yates com gerador injetável (para os testes). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Escolhe distratores para `target` dentro de `pool`.
 *
 * Camadas, em ordem: confusáveis declarados → mesma linha → mesma vogal →
 * qualquer um. Nunca repete romaji, o que também resolve a ambiguidade de
 * じ/ぢ (ambos "ji") e ず/づ (ambos "zu") no modo romaji → hiragana.
 */
export function pickDistractors(
  target: Kana,
  pool: string[],
  count = 3,
  rng: () => number = Math.random,
): Kana[] {
  const available = pool
    .map((c) => KANA_BY_CHAR.get(c))
    .filter((k): k is Kana => !!k && k.char !== target.char && k.romaji !== target.romaji);

  const chosen: Kana[] = [];
  const usedRomaji = new Set([target.romaji]);

  const take = (candidates: Kana[]) => {
    for (const kana of shuffle(candidates, rng)) {
      if (chosen.length >= count) return;
      if (usedRomaji.has(kana.romaji)) continue;
      chosen.push(kana);
      usedRomaji.add(kana.romaji);
    }
  };

  const confusableSet = new Set(target.confusable);
  take(available.filter((k) => confusableSet.has(k.char)));
  take(available.filter((k) => k.row === target.row));
  take(available.filter((k) => k.vowel !== null && k.vowel === target.vowel));
  take(available);

  return chosen;
}

export type Choice = { kana: Kana; correct: boolean };

/** Alternativas prontas e embaralhadas, com a resposta certa incluída. */
export function buildChoices(
  target: Kana,
  pool: string[],
  count = 4,
  rng: () => number = Math.random,
): Choice[] {
  const distractors = pickDistractors(target, pool, count - 1, rng);
  return shuffle(
    [{ kana: target, correct: true }, ...distractors.map((kana) => ({ kana, correct: false }))],
    rng,
  );
}
