/**
 * Superfície de desenho.
 *
 * Trabalha inteiramente na escala 109×109 do KanjiVG, não em pixels: o que entra
 * já sai pronto para comparar com a mediana do traço, e o mesmo traço vale igual
 * num iPhone pequeno e num monitor grande.
 *
 * A ideia de alta resolução (canvas em devicePixelRatio + ResizeObserver) veio do
 * DrawingCanvas do JapaJunior; a suavização aqui é por ponto médio, que é mais
 * curta e não introduz overshoot nas curvas fechadas do hiragana.
 */

import { useCallback, useEffect, useRef } from 'react';
import { KVG_SIZE } from '../lib/strokeMatch';
import type { Point } from '../lib/strokePath';

export type Stroke = Point[];

type Props = {
  /** Traços já aceitos, em escala 109. O pai é dono deles. */
  strokes: Stroke[];
  onStrokeEnd: (stroke: Stroke) => void;
  disabled?: boolean;
};

/** Espessura do traço, também na escala 109, igual à do guia. */
const INK_WEIGHT = 5;

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function DrawCanvas({ strokes, onStrokeEnd, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<Stroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.getBoundingClientRect().width;
    if (size === 0) return;
    const scale = size / KVG_SIZE;

    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = INK_WEIGHT * scale;
    ctx.strokeStyle = cssColor('--ink') || '#ece6da';

    const all = liveRef.current ? [...strokesRef.current, liveRef.current] : strokesRef.current;
    for (const stroke of all) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          // Um toque ainda deixa marca — o veredito é quem diz que não vale.
          ctx.beginPath();
          ctx.arc(stroke[0].x * scale, stroke[0].y * scale, (INK_WEIGHT * scale) / 2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        }
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
      // Suavização por ponto médio: cada ponto vira o controle de uma quadrática
      // que termina no meio do caminho para o próximo.
      for (let i = 1; i < stroke.length - 1; i++) {
        const midX = ((stroke[i].x + stroke[i + 1].x) / 2) * scale;
        const midY = ((stroke[i].y + stroke[i + 1].y) / 2) * scale;
        ctx.quadraticCurveTo(stroke[i].x * scale, stroke[i].y * scale, midX, midY);
      }
      const last = stroke[stroke.length - 1];
      ctx.lineTo(last.x * scale, last.y * scale);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const size = canvas.getBoundingClientRect().width;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [paint]);

  useEffect(paint, [strokes, paint]);

  const toKvg = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = KVG_SIZE / rect.width;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    liveRef.current = [toKvg(event)];
    paint();
  };

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!liveRef.current) return;
    liveRef.current.push(toKvg(event));
    paint();
  };

  const handleUp = () => {
    const stroke = liveRef.current;
    liveRef.current = null;
    if (!stroke) return;
    paint();
    onStrokeEnd(stroke);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      // `touch-none` é o que impede o dedo de rolar a página ao desenhar.
      style={{ touchAction: 'none' }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    />
  );
}
