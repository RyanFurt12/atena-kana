/**
 * Um hiragana desenhado a partir dos traços do KanjiVG.
 *
 * É a decisão central do app: o caractere que ela lê no exercício de leitura é o
 * mesmo esqueleto que vai reproduzir no exercício de desenho.
 */

import { useMemo } from 'react';
import { getStrokePaths } from '../lib/strokeMatch';
import { InkGlyph, KVG_SIZE, type GlyphPiece } from './InkGlyph';

type Props = {
  char: string;
  className?: string;
  weight?: number;
  visible?: number;
  ghost?: boolean;
  animate?: boolean;
  delay?: number;
  color?: string;
  title?: string;
};

/** Yōon são dois caracteres: o segundo entra menor e alinhado embaixo. */
const SMALL_SCALE = 0.58;

function layout(char: string): { pieces: GlyphPiece[]; width: number } {
  const parts = [...char];
  if (parts.length === 1) {
    return { pieces: [{ paths: getStrokePaths(parts[0]) }], width: KVG_SIZE };
  }

  const [base, small] = parts;
  const offsetY = KVG_SIZE * (1 - SMALL_SCALE);
  return {
    pieces: [
      { paths: getStrokePaths(base) },
      {
        paths: getStrokePaths(small),
        transform: `translate(${KVG_SIZE} ${offsetY}) scale(${SMALL_SCALE})`,
      },
    ],
    width: KVG_SIZE + KVG_SIZE * SMALL_SCALE,
  };
}

export function KanaGlyph({ char, title, ...rest }: Props) {
  const { pieces, width } = useMemo(() => layout(char), [char]);
  return <InkGlyph pieces={pieces} width={width} label={title ?? char} {...rest} />;
}

export { STROKE_STEP_MS } from './InkGlyph';
