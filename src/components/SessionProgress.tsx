/**
 * O progresso da sessão como uma fileira de pontos de tinta.
 *
 * Carrega mais informação que uma barra: cada ponto é uma carta, cheio quando
 * acertou e vazado quando errou. Dá para ver de relance se o tropeço foi no
 * começo ou se está acontecendo agora.
 */

import { InkDot } from './RoughInk';

type Props = {
  results: (boolean | null)[];
  position: number;
};

export function SessionProgress({ results, position }: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="img"
      aria-label={`Carta ${position + 1} de ${results.length}`}
    >
      {results.map((result, i) => {
        const atual = result === null && i === position;
        // Pingo cheio quando acertou, anel quando errou, anel pálido no que
        // ainda vem. Desenhados em SVG para pegarem a borda trêmula de tinta.
        return (
          <InkDot
            key={i}
            filled={result === true || atual}
            color={
              result === true ? 'var(--seal)' : result === false ? 'var(--seal)' : atual ? 'var(--ink-dim)' : 'var(--rule)'
            }
          />
        );
      })}
    </div>
  );
}
