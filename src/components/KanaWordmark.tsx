/**
 * A assinatura do app: uma palavra em hiragana que se escreve sozinha, caractere
 * por caractere, traço por traço, na ordem correta.
 *
 * É a abertura mais honesta que a tela inicial pode ter — em vez de um título
 * explicando o que o app faz, ele faz na frente dela. E, como o resto do app,
 * sai dos traços do KanjiVG, não de uma fonte.
 */

import { useState } from 'react';
import { KanaGlyph, STROKE_STEP_MS } from './KanaGlyph';
import { strokeCount } from '../lib/strokeMatch';

type Props = {
  /** A palavra em hiragana, um caractere simples por posição. */
  word: string;
  /** Altura de cada caractere, em classes utilitárias. */
  className?: string;
  /** Romaji abaixo da palavra, como legenda. */
  caption?: string;
};

/** Respiro entre o fim de um caractere e o começo do próximo. */
const CHAR_GAP_MS = 160;

export function KanaWordmark({ word, className = 'h-24', caption }: Props) {
  const chars = [...word];
  // Reescrever ao toque: custa nada e é o tipo de detalhe que dá vontade de repetir.
  const [take, setTake] = useState(0);

  let delay = 0;
  const glyphs = chars.map((char, i) => {
    const start = delay;
    delay += strokeCount(char) * STROKE_STEP_MS + CHAR_GAP_MS;
    return <KanaGlyph key={`${take}-${i}`} char={char} className={className} weight={4} animate delay={start} />;
  });

  return (
    <button
      onClick={() => setTake((n) => n + 1)}
      className="flex flex-col items-center gap-3"
      aria-label={caption ? `${caption}, escrito em hiragana` : word}
    >
      <span className="flex items-end gap-1">{glyphs}</span>
      {caption && (
        <span className="text-sm lowercase tracking-[0.35em]" style={{ color: 'var(--ink-dim)' }}>
          {caption}
        </span>
      )}
    </button>
  );
}
