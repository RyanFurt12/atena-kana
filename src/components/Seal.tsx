/**
 * 落款 (rakkan), o selo hanko que o autor carimba no canto da obra.
 *
 * Vermelhão sólido com o caractere vazado — é assim que um selo de pedra
 * funciona, e é por isso que os traços saem na cor do papel em vez de brancos.
 */

import kanjiData from '../data/ui-kanji.json';
import { InkGlyph, KVG_SIZE } from './InkGlyph';

const KANJI = kanjiData as Record<string, string[]>;

type Props = {
  /** Um ou dois kanji. Dois entram empilhados, como num selo de verdade. */
  word: string;
  className?: string;
};

export function Seal({ word, className = 'h-8 w-8' }: Props) {
  const chars = [...word].filter((c) => KANJI[c]).slice(0, 2);
  if (chars.length === 0) return null;

  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <span className="absolute inset-0" style={{ background: 'var(--seal)', borderRadius: '2px' }} />
      <span className="absolute inset-[15%] flex flex-col justify-center gap-[6%]">
        {chars.map((char) => (
          <InkGlyph
            key={char}
            pieces={[{ paths: KANJI[char] }]}
            width={KVG_SIZE}
            weight={7}
            color="var(--surface)"
            className="h-full w-full"
          />
        ))}
      </span>
    </span>
  );
}
