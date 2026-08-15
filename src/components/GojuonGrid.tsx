/**
 * O gojūon (五十音) como medidor de progresso.
 *
 * Vale mais do que "63% concluído": a grade é a estrutura real do hiragana, então
 * um buraco na linha ら aparece como um buraco na linha ら. Cada caractere ganha
 * tinta conforme sobe de caixa — a folha vai sendo escrita.
 */

import { ALL_KANA, KANA_BY_CHAR, type Vowel } from '../data/kana';
import { KanaGlyph } from './KanaGlyph';
import { getSkill, supportsChar, type ExerciseType, type Progress } from '../lib/srs';

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o'];

const ROW_LABELS: [row: string, label: string][] = [
  ['a', '—'],
  ['ka', 'k'],
  ['sa', 's'],
  ['ta', 't'],
  ['na', 'n'],
  ['ha', 'h'],
  ['ma', 'm'],
  ['ya', 'y'],
  ['ra', 'r'],
  ['wa', 'w'],
];

type Props = {
  progress: Progress;
  /** A grade mostra um modo por vez — a média dos quatro esconderia a defasagem. */
  type: ExerciseType;
};

/** Quanto de tinta o caractere já ganhou naquele modo, de 0 a 1. */
function inkLevel(progress: Progress, char: string, type: ExerciseType): number {
  if (!supportsChar(type, char)) return 0;
  return getSkill(progress, char, type).box / 5;
}

export function GojuonGrid({ progress, type }: Props) {
  const byPosition = new Map(ALL_KANA.filter((k) => k.group === 'basic').map((k) => [`${k.row}${k.vowel}`, k.char]));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[1.25rem_repeat(5,1fr)] gap-1.5">
        <span />
        {VOWELS.map((vowel) => (
          <span key={vowel} className="text-center text-xs" style={{ color: 'var(--ink-dim)' }}>
            {vowel}
          </span>
        ))}
      </div>

      {ROW_LABELS.map(([row, label]) => (
        <div key={row} className="grid grid-cols-[1.25rem_repeat(5,1fr)] items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {label}
          </span>
          {VOWELS.map((vowel) => {
            const char = byPosition.get(`${row}${vowel}`);
            if (!char) return <span key={vowel} />;

            const level = inkLevel(progress, char, type);
            return (
              <span
                key={vowel}
                className="grid aspect-square place-items-center p-1"
                style={{ border: '1px solid var(--rule)' }}
                title={KANA_BY_CHAR.get(char)!.romaji}
              >
                <KanaGlyph
                  char={char}
                  className="h-full w-full"
                  weight={6}
                  color={`color-mix(in srgb, var(--ink) ${Math.round(12 + level * 88)}%, transparent)`}
                />
              </span>
            );
          })}
        </div>
      ))}

      {/* ん não cabe na grade: não tem linha nem vogal. */}
      <div className="grid grid-cols-[1.25rem_repeat(5,1fr)] items-center gap-1.5">
        <span />
        <span className="grid aspect-square place-items-center p-1" style={{ border: '1px solid var(--rule)' }}>
          <KanaGlyph
            char="ん"
            className="h-full w-full"
            weight={6}
            color={`color-mix(in srgb, var(--ink) ${Math.round(12 + inkLevel(progress, 'ん', type) * 88)}%, transparent)`}
          />
        </span>
      </div>
    </div>
  );
}
