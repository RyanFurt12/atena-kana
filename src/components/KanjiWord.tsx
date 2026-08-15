/**
 * Kanji da interface — 稽古, 記録, 設定, e os medalhões dos modos.
 *
 * Decorativo: sempre acompanhado do rótulo em português, nunca sozinho como
 * única informação. Ela está aprendendo hiragana; kanji aqui é ambientação, e
 * quem não lê não perde nada.
 */

import { useMemo } from 'react';
import kanjiData from '../data/ui-kanji.json';
import { InkGlyph, KVG_SIZE, type GlyphPiece } from './InkGlyph';

const KANJI = kanjiData as Record<string, string[]>;

type Props = {
  /** Uma ou mais palavras em kanji, ex.: "稽古". */
  word: string;
  className?: string;
  weight?: number;
  color?: string;
  /** Espaço entre caracteres, na escala 109. */
  tracking?: number;
};

export function KanjiWord({ word, className, weight = 4, color, tracking = 8 }: Props) {
  const { pieces, width } = useMemo(() => {
    const chars = [...word].filter((c) => KANJI[c]);
    const step = KVG_SIZE + tracking;
    return {
      pieces: chars.map<GlyphPiece>((char, i) => ({
        paths: KANJI[char],
        transform: i === 0 ? undefined : `translate(${i * step} 0)`,
      })),
      width: chars.length === 0 ? KVG_SIZE : chars.length * step - tracking,
    };
  }, [word, tracking]);

  if (pieces.length === 0) return null;
  return <InkGlyph pieces={pieces} width={width} className={className} weight={weight} color={color} />;
}
