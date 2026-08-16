/**
 * A régua de caixas: quantos caracteres estão em cada nível daquele modo.
 *
 * Faz duas coisas de uma vez. Mostra o quanto falta — a fila anda da esquerda
 * para a direita conforme ela acerta — e ensina o sistema sem precisar de texto,
 * porque a caixa deixa de ser um número abstrato e vira um lugar onde as letras
 * estão. O texto embaixo só preenche o que a figura não diz.
 */

import { BOX_COUNT, BOX_INTERVALS, MASTERED_BOX } from '../lib/srs';

type Props = {
  /** Quantidade de caracteres em cada caixa, do 0 ao 5. */
  distribution: number[];
};

/** Rótulo do intervalo de retorno de cada caixa. */
function intervalo(box: number): string {
  const dias = BOX_INTERVALS[box];
  return dias === 0 ? 'hoje' : `${dias}d`;
}

export function BoxLadder({ distribution }: Props) {
  const total = distribution.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1">
        {Array.from({ length: BOX_COUNT }, (_, box) => {
          const quantos = distribution[box] ?? 0;
          const dominado = box >= MASTERED_BOX;
          return (
            <div key={box} className="flex flex-col items-center gap-1">
              <span
                className="grid aspect-square w-full place-items-center text-base"
                style={{
                  // A tinta escurece com a caixa, como na grade do gojūon.
                  background: `color-mix(in srgb, var(--ink) ${6 + box * 14}%, transparent)`,
                  border: `1px solid ${dominado ? 'var(--ink)' : 'var(--rule)'}`,
                  fontFamily: 'var(--font-mono)',
                  color: quantos === 0 ? 'var(--ink-dim)' : 'var(--ink)',
                }}
              >
                {quantos}
              </span>
              <span className="text-[0.6rem]" style={{ color: 'var(--ink-dim)' }}>
                {intervalo(box)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between text-xs" style={{ color: 'var(--ink-dim)' }}>
        <span>caixa 0 — recém-vista</span>
        <span>caixa {MASTERED_BOX}+ — dominada</span>
      </div>

      {total === 0 && (
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          Nenhuma letra apresentada neste modo ainda.
        </p>
      )}
    </div>
  );
}
