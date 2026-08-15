/**
 * A célula de 原稿用紙 (genkō yōshi) — o papel quadriculado com a cruz no meio que
 * toda criança japonesa usa para aprender a escrever.
 *
 * É a moldura fixa do app: ler, escolher e desenhar acontecem todos dentro dela,
 * no mesmo lugar da tela. O conteúdo muda entre um exercício e outro, o quadrado
 * não — então a atenção nunca precisa procurar onde olhar.
 */

import type { ReactNode } from 'react';
import { RoughFrame } from './RoughInk';

type Props = {
  children: ReactNode;
  /** Muda só a moldura; o conteúdo se vira sozinho. */
  tone?: 'neutral' | 'correct' | 'wrong';
  className?: string;
};

const TONE_BORDER: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'var(--rule)',
  correct: 'var(--color-matcha)',
  wrong: 'var(--seal)',
};

export function GenkoCell({ children, tone = 'neutral', className = '' }: Props) {
  return (
    <div
      className={`relative aspect-square w-full ${className}`}
      style={{ background: 'var(--panel)' }}
    >
      <RoughFrame color={TONE_BORDER[tone]} width={1.5} />

      {/* Guias em cruz, tracejadas e trêmulas — como o papel de verdade, que é
          impresso torto e amassa. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g
          stroke="var(--rule)"
          strokeWidth="0.5"
          strokeDasharray="2.5 3.5"
          opacity="0.7"
          filter="url(#ink-edge-soft)"
        >
          <line x1="50" y1="0" x2="50" y2="100" />
          <line x1="0" y1="50" x2="100" y2="50" />
        </g>
      </svg>
      {children}
    </div>
  );
}
