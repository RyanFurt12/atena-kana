/**
 * Desenha uma sequência de traços do KanjiVG como SVG.
 *
 * É a base de tudo que é japonês na tela — hiragana dos exercícios e kanji da
 * interface. Nenhuma fonte japonesa é carregada em lugar nenhum do app: num
 * aparelho sem fonte instalada, 稽古 escrito como texto viraria dois
 * quadradinhos, e o caractere do exercício viraria um terceiro.
 */

import type { CSSProperties } from 'react';
import { pathLength } from '../lib/strokePath';

/** Todo o KanjiVG vive num viewBox 109×109. */
export const KVG_SIZE = 109;

/** Tempo entre o início de um traço e o do seguinte. */
export const STROKE_STEP_MS = 240;

export type GlyphPiece = {
  paths: string[];
  transform?: string;
};

type Props = {
  pieces: GlyphPiece[];
  /** Largura do viewBox; a altura é sempre KVG_SIZE. */
  width: number;
  className?: string;
  weight?: number;
  /** Mostra só os N primeiros traços do conjunto todo. */
  visible?: number;
  /** Traços ainda não desenhados aparecem apagados em vez de sumirem. */
  ghost?: boolean;
  animate?: boolean;
  /** Espera antes de começar a escrever, para encadear caracteres. */
  delay?: number;
  color?: string;
  label?: string;
  style?: CSSProperties;
};

export function InkGlyph({
  pieces,
  width,
  className,
  weight = 4.5,
  visible,
  ghost = false,
  animate = false,
  delay = 0,
  color = 'currentColor',
  label,
  style,
}: Props) {
  let index = 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${KVG_SIZE}`}
      className={className}
      style={style}
      fill="none"
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      // A sangria dá ao traço a borda absorvida pela fibra, em vez do recorte
      // vetorial. É sutil de propósito: legibilidade vem antes da textura.
      filter="url(#ink-bleed)"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {pieces.map((piece, p) => (
        <g key={p} transform={piece.transform}>
          {piece.paths.map((d) => {
            const i = index++;
            const drawn = visible === undefined || i < visible;
            if (!drawn && !ghost) return null;

            const length = Math.ceil(pathLength(d));
            return (
              <path
                key={i}
                d={d}
                opacity={drawn ? 1 : 0.18}
                className={animate && drawn ? 'stroke-animate' : undefined}
                style={
                  animate && drawn
                    ? ({
                        '--stroke-length': length,
                        '--stroke-delay': `${delay + i * STROKE_STEP_MS}ms`,
                        '--stroke-duration': `${Math.max(200, length * 3)}ms`,
                      } as CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
