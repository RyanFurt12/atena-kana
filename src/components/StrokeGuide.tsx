/**
 * A camada de orientação por baixo do desenho: o caractere apagado ao fundo, o
 * traço da vez em vermelho quando ela trava, e um ponto marcando onde o traço
 * começa. O ponto de início é metade do que se erra em hiragana — さ e ち são o
 * mesmo desenho começando de lugares diferentes.
 */

import { getMedians, getStrokePaths, KVG_SIZE } from '../lib/strokeMatch';
import { pathLength } from '../lib/strokePath';

type Props = {
  char: string;
  /** Índice do traço esperado agora. */
  strokeIndex: number;
  /** Silhueta apagada do caractere inteiro. */
  showGuide: boolean;
  /** Destaca o traço da vez, animado, em vermelho de correção. */
  hint: boolean;
};

export function StrokeGuide({ char, strokeIndex, showGuide, hint }: Props) {
  const paths = getStrokePaths(char);
  const expected = paths[strokeIndex];
  const start = expected ? getMedians(char)[strokeIndex][0] : null;

  if (!showGuide && !hint) return null;

  return (
    <svg
      viewBox={`0 0 ${KVG_SIZE} ${KVG_SIZE}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {showGuide &&
        paths.map((d, i) => (
          <path key={i} d={d} stroke="var(--ink)" strokeWidth={4.5} opacity={0.14} />
        ))}

      {hint && expected && (
        <path
          key={`hint-${strokeIndex}`}
          d={expected}
          stroke="var(--seal)"
          strokeWidth={5}
          className="stroke-animate"
          style={
            {
              '--stroke-length': Math.ceil(pathLength(expected)),
              '--stroke-duration': '700ms',
            } as React.CSSProperties
          }
        />
      )}

      {(hint || showGuide) && start && (
        <circle cx={start.x} cy={start.y} r={4} fill="var(--seal)" opacity={hint ? 1 : 0.55} />
      )}
    </svg>
  );
}
