/**
 * Validação de traço, traço a traço, contra os dados do KanjiVG.
 *
 * Determinístico e offline: nada de IA. A vantagem não é só custo — comparar com
 * a linha central real do traço permite dizer *o que* saiu errado (ordem, sentido,
 * posição), que é a informação que ensina. Um reconhecedor que só devolve "isso é
 * um あ" aceita o caractere desenhado em qualquer ordem e não corrige nada.
 */

import strokesData from '../data/strokes.json';
import { distance, polylineLength, resample, samplePath, smooth, type Point } from './strokePath';

/** Todo o KanjiVG vive num viewBox 109×109. */
export const KVG_SIZE = 109;

/** Pontos por traço na comparação. 24 é fino o bastante e barato. */
const SAMPLE_POINTS = 24;

/** Abaixo disso o traço é um pingo (dakuten) e o sentido vira ruído. */
const TINY_STROKE = 12;

export type Leniency = 'tranquilo' | 'exigente';

export type StrokeMetrics = {
  avgDist: number;
  startDist: number;
  endDist: number;
  dirCos: number;
  lengthRatio: number;
};

/** `order` = o traço está certo, mas é de outra posição da sequência. */
export type StrokeFailure = 'order' | 'direction' | 'position' | 'shape' | 'length' | 'empty';

export type StrokeVerdict =
  | { ok: true; metrics: StrokeMetrics }
  | {
      ok: false;
      reason: StrokeFailure;
      /** Em `order`, qual índice de traço isso realmente é (base 0). */
      matchedIndex?: number;
      metrics: StrokeMetrics;
    };

const STROKES = strokesData as Record<string, string[]>;

const medianCache = new Map<string, Point[][]>();

/** Só caracteres simples têm traçado próprio; yōon (きゃ) são dois caracteres. */
export function canDraw(char: string): boolean {
  return [...char].length === 1 && char in STROKES;
}

/** Medianas de cada traço do caractere, em coordenadas 109×109 e na ordem certa. */
export function getMedians(char: string): Point[][] {
  const cached = medianCache.get(char);
  if (cached) return cached;

  const paths = STROKES[char];
  if (!paths) throw new Error(`Sem dados de traço para "${char}"`);

  const medians = paths.map((d) => samplePath(d, SAMPLE_POINTS));
  medianCache.set(char, medians);
  return medians;
}

export function strokeCount(char: string): number {
  return STROKES[char]?.length ?? 0;
}

/** Paths originais, para desenhar o guia e a animação. */
export function getStrokePaths(char: string): string[] {
  return STROKES[char] ?? [];
}

function direction(points: Point[]): Point {
  const a = points[0];
  const b = points[points.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  return len === 0 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
}

function compare(user: Point[], reference: Point[]): StrokeMetrics {
  const u = resample(user, SAMPLE_POINTS);
  const r = reference;

  let sum = 0;
  for (let i = 0; i < SAMPLE_POINTS; i++) sum += distance(u[i], r[i]);

  // Comprimento medido no traço suavizado: o objetivo desta métrica é pegar
  // rabisco (ir e voltar por cima da linha), não tremor.
  const uLen = polylineLength(smooth(u));
  const rLen = polylineLength(r);
  const uDir = direction(u);
  const rDir = direction(r);

  return {
    avgDist: sum / SAMPLE_POINTS,
    startDist: distance(u[0], r[0]),
    endDist: distance(u[SAMPLE_POINTS - 1], r[SAMPLE_POINTS - 1]),
    dirCos: uDir.x * rDir.x + uDir.y * rDir.y,
    lengthRatio: Math.max(uLen, rLen) === 0 ? 1 : Math.min(uLen, rLen) / Math.max(uLen, rLen),
  };
}

/**
 * Limites de aceitação. As distâncias encolhem junto com o traço de referência:
 * 16px de erro é razoável num traço longo de あ, mas aceitaria o pingo do dakuten
 * desenhado em qualquer canto.
 */
function thresholds(refLength: number, leniency: Leniency) {
  const slack = leniency === 'tranquilo' ? 1.35 : 1;
  const scale = Math.min(1, Math.max(0.45, refLength / 45));
  return {
    avgDist: 16 * scale * slack,
    startDist: 25 * scale * slack,
    endDist: 25 * scale * slack,
    dirCos: leniency === 'tranquilo' ? 0.15 : 0.3,
    lengthRatio: leniency === 'tranquilo' ? 0.4 : 0.5,
  };
}

function passes(m: StrokeMetrics, refLength: number, leniency: Leniency): boolean {
  const t = thresholds(refLength, leniency);
  const directionOk = refLength < TINY_STROKE || m.dirCos > t.dirCos;
  return (
    m.avgDist < t.avgDist &&
    m.startDist < t.startDist &&
    m.endDist < t.endDist &&
    directionOk &&
    m.lengthRatio > t.lengthRatio
  );
}

function failureReason(m: StrokeMetrics, refLength: number, leniency: Leniency): StrokeFailure {
  const t = thresholds(refLength, leniency);
  if (refLength >= TINY_STROKE && m.dirCos <= t.dirCos) return 'direction';
  if (m.lengthRatio <= t.lengthRatio) return 'length';
  if (m.startDist >= t.startDist || m.endDist >= t.endDist) return 'position';
  return 'shape';
}

/**
 * Compara o traço desenhado com o traço esperado do caractere.
 *
 * @param userPoints pontos do traço já convertidos para a escala 109×109
 * @param strokeIndex qual traço da sequência era esperado (base 0)
 * @param remaining índices ainda não completados — usados para distinguir
 *   "traço errado" de "traço certo na hora errada"
 */
export function matchStroke(
  userPoints: Point[],
  char: string,
  strokeIndex: number,
  leniency: Leniency = 'tranquilo',
  remaining?: number[],
): StrokeVerdict {
  const medians = getMedians(char);
  const expected = medians[strokeIndex];
  if (!expected) throw new Error(`Traço ${strokeIndex} não existe em "${char}"`);

  const empty: StrokeMetrics = {
    avgDist: Infinity,
    startDist: Infinity,
    endDist: Infinity,
    dirCos: 0,
    lengthRatio: 0,
  };
  if (userPoints.length < 2) return { ok: false, reason: 'empty', metrics: empty };

  const metrics = compare(userPoints, expected);
  const refLength = polylineLength(expected);

  if (passes(metrics, refLength, leniency)) return { ok: true, metrics };

  // Não bateu com o esperado. Se bater bem com outro traço que ainda falta, o
  // problema é a ordem — e dizer isso vale muito mais do que um X genérico.
  const others = (remaining ?? medians.map((_, i) => i)).filter((i) => i !== strokeIndex);
  for (const i of others) {
    const alt = compare(userPoints, medians[i]);
    if (passes(alt, polylineLength(medians[i]), leniency)) {
      return { ok: false, reason: 'order', matchedIndex: i, metrics: alt };
    }
  }

  return { ok: false, reason: failureReason(metrics, refLength, leniency), metrics };
}

export type CharacterVerdict = {
  ok: boolean;
  /** Um veredito por traço desenhado, na ordem em que ela desenhou. */
  strokes: { ok: boolean; reason?: StrokeFailure }[];
  /** Faltaram traços (ou sobraram) em relação ao caractere. */
  countOff: number;
  /** Os traços estão certos, só foram feitos fora de ordem. */
  outOfOrder: boolean;
};

/**
 * Avalia o caractere inteiro de uma vez, para o modo sem tutorial: ela desenha
 * tudo sem ser interrompida e só então recebe o veredito.
 *
 * A comparação é posicional — traço 1 contra traço 1 — porque a ordem faz parte
 * do que se está aprendendo. Mas, se os mesmos traços passariam noutra ordem, o
 * app diz "ordem" em vez de marcar tudo como errado: são erros diferentes e
 * merecem correções diferentes.
 */
export function matchCharacter(
  drawn: Point[][],
  char: string,
  leniency: Leniency = 'tranquilo',
): CharacterVerdict {
  const medians = getMedians(char);
  const strokes = drawn.map((stroke, i) => {
    const expected = medians[i];
    if (!expected) return { ok: false, reason: 'shape' as StrokeFailure };
    if (stroke.length < 2) return { ok: false, reason: 'empty' as StrokeFailure };

    const metrics = compare(stroke, expected);
    const refLength = polylineLength(expected);
    return passes(metrics, refLength, leniency)
      ? { ok: true }
      : { ok: false, reason: failureReason(metrics, refLength, leniency) };
  });

  const countOff = drawn.length - medians.length;
  const failed = strokes.filter((s) => !s.ok).length;

  // Casamento guloso contra qualquer traço ainda livre: se todos acham par, o
  // desenho está certo e o problema foi só a sequência.
  let outOfOrder = false;
  if (failed > 0 && countOff === 0) {
    const free = medians.map((_, i) => i);
    outOfOrder = drawn.every((stroke) => {
      if (stroke.length < 2) return false;
      const hit = free.findIndex(
        (i) => passes(compare(stroke, medians[i]), polylineLength(medians[i]), leniency),
      );
      if (hit === -1) return false;
      free.splice(hit, 1);
      return true;
    });
  }

  return { ok: failed === 0 && countOff === 0, strokes, countOff, outOfOrder };
}

export const FAILURE_MESSAGES: Record<StrokeFailure, string> = {
  order: 'Esse traço está certo, mas vem depois. Comece pelo traço destacado.',
  direction: 'Traço no sentido contrário — comece pelo ponto vermelho.',
  position: 'Começou ou terminou fora do lugar.',
  length: 'O traço ficou curto demais.',
  shape: 'O formato fugiu do traço original.',
  empty: 'Faça um traço, não só um toque.',
};
