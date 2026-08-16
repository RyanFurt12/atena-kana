/**
 * As formas de pincel que vêm de PNG: a mancha e o círculo.
 *
 * Entram como máscara CSS, não como `<img>`. A diferença importa: a máscara usa
 * só o canal alfa do arquivo, então a cor vem do tema e a mesma pincelada serve
 * no papel e no modo noturno. E, como o alfa guarda as bordas macias e as falhas
 * de pincel seco, nada da textura da pintura se perde no caminho.
 */

import { ART, maskStyle } from '../lib/artwork';

type Props = {
  className?: string;
  /** Token de cor. A arte não tem cor própria. */
  color?: string;
  opacity?: number;
};

/** Mancha cheia — atrás do kanji de cada modo na tela inicial. */
export function InkBlot({ className = '', color = 'var(--ink)', opacity = 1 }: Props) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ ...maskStyle(ART.blot, color), opacity }}
      aria-hidden="true"
    />
  );
}

/**
 * 円相 — o círculo, atrás do caractere nos dois exercícios de escolha.
 *
 * O mesmo círculo em ler e lembrar de propósito: são o mesmo exercício de trás
 * para frente, e uma forma só amarra os dois como uma coisa só.
 */
export function InkEnsou({ className = '', color = 'var(--ink)', opacity = 0.2 }: Props) {
  return (
    <span
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ ...maskStyle(ART.ensou, color), opacity }}
      aria-hidden="true"
    />
  );
}
