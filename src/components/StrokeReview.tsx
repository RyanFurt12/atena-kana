/**
 * A correção do modo sem tutorial: o desenho dela fica na tela, com os traços
 * reprovados em vermelho, e o modelo apagado por trás para comparar.
 *
 * Mostrar o que ela fez ao lado do que era esperado ensina mais do que apagar e
 * exibir só o certo — o erro precisa ficar visível para ser reconhecido.
 */

import { getStrokePaths, KVG_SIZE, type CharacterVerdict } from '../lib/strokeMatch';
import type { Point } from '../lib/strokePath';

type Props = {
  char: string;
  strokes: Point[][];
  verdict: CharacterVerdict;
};

function toPolyline(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function StrokeReview({ char, strokes, verdict }: Props) {
  return (
    <svg
      viewBox={`0 0 ${KVG_SIZE} ${KVG_SIZE}`}
      className="absolute inset-0 h-full w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Seu desenho comparado ao modelo"
      role="img"
    >
      {getStrokePaths(char).map((d, i) => (
        <path key={`modelo-${i}`} d={d} stroke="var(--ink)" strokeWidth={4.5} opacity={0.16} />
      ))}

      {strokes.map((points, i) => (
        <polyline
          key={`meu-${i}`}
          points={toPolyline(points)}
          stroke={verdict.strokes[i]?.ok ? 'var(--ink)' : 'var(--seal)'}
          strokeWidth={5}
        />
      ))}
    </svg>
  );
}
