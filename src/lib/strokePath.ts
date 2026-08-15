/**
 * Leitura e amostragem dos paths de traço do KanjiVG.
 *
 * Os paths do KanjiVG são a LINHA CENTRAL do traço (não o contorno), então
 * amostrar pontos ao longo do path já dá a "espinha" contra a qual comparar o que
 * a pessoa desenhou. Na prática eles só usam `M` seguido de vários `c`, mas o
 * parser cobre os outros comandos de linha/cúbica para não quebrar em silêncio se
 * o KanjiVG mudar — comando desconhecido levanta erro em vez de gerar lixo.
 *
 * Fizemos o parser aqui em vez de usar `getPointAtLength()` do SVG por dois
 * motivos: roda em Node (dá para testar sem navegador) e não precisa de um
 * elemento oculto no DOM só para medir.
 */

export type Point = { x: number; y: number };

/** Quantos pedaços por curva cúbica ao achatar. 16 já fica abaixo de 1px em 109. */
const FLATTEN_STEPS = 16;

const NUMBER_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/**
 * Achata um path SVG numa polilinha densa em coordenadas absolutas.
 * O espaçamento entre pontos não é uniforme — `resample` cuida disso depois.
 */
export function flattenPath(d: string): Point[] {
  const out: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  // Segundo ponto de controle da última cúbica, para os comandos `s`/`S`.
  let lastControl: Point | null = null;

  const commands = d.matchAll(/([MmCcSsLlZz])([^MmCcSsLlZz]*)/g);

  for (const [, cmd, rawArgs] of commands) {
    const nums = (rawArgs.match(NUMBER_RE) ?? []).map(Number);
    const relative = cmd === cmd.toLowerCase();
    const abs = (x: number, y: number): Point =>
      relative ? { x: cursor.x + x, y: cursor.y + y } : { x, y };

    switch (cmd.toUpperCase()) {
      case 'M': {
        // Pares extras depois de um moveto são linhas implícitas.
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const p = abs(nums[i], nums[i + 1]);
          cursor = p;
          if (i === 0) start = p;
          out.push(p);
        }
        lastControl = null;
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          cursor = abs(nums[i], nums[i + 1]);
          out.push(cursor);
        }
        lastControl = null;
        break;
      }
      case 'C': {
        for (let i = 0; i + 5 < nums.length; i += 6) {
          const p1 = abs(nums[i], nums[i + 1]);
          const p2 = abs(nums[i + 2], nums[i + 3]);
          const p3 = abs(nums[i + 4], nums[i + 5]);
          for (let s = 1; s <= FLATTEN_STEPS; s++) {
            out.push(cubicAt(cursor, p1, p2, p3, s / FLATTEN_STEPS));
          }
          cursor = p3;
          lastControl = p2;
        }
        break;
      }
      case 'S': {
        for (let i = 0; i + 3 < nums.length; i += 4) {
          // Primeiro controle é o reflexo do último controle em torno do cursor.
          const p1 = lastControl
            ? { x: 2 * cursor.x - lastControl.x, y: 2 * cursor.y - lastControl.y }
            : cursor;
          const p2 = abs(nums[i], nums[i + 1]);
          const p3 = abs(nums[i + 2], nums[i + 3]);
          for (let s = 1; s <= FLATTEN_STEPS; s++) {
            out.push(cubicAt(cursor, p1, p2, p3, s / FLATTEN_STEPS));
          }
          cursor = p3;
          lastControl = p2;
        }
        break;
      }
      case 'Z': {
        out.push(start);
        cursor = start;
        lastControl = null;
        break;
      }
      default:
        throw new Error(`Comando SVG não suportado em path de traço: "${cmd}"`);
    }
  }

  return out;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Comprimento total de uma polilinha. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

/**
 * Reamostra uma polilinha em `n` pontos igualmente espaçados por comprimento de
 * arco. É isso que deixa a comparação ponto a ponto justa: ambas as curvas ficam
 * parametrizadas pela mesma fração de percurso, então o índice `i` de uma
 * corresponde ao índice `i` da outra independentemente da velocidade do traço.
 */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1 || n < 2) return Array.from({ length: n }, () => points[0]);

  const total = polylineLength(points);
  if (total === 0) return Array.from({ length: n }, () => points[0]);

  const step = total / (n - 1);
  const out: Point[] = [points[0]];
  let segment = 1;
  let walked = 0; // comprimento acumulado até o início do segmento atual

  for (let i = 1; i < n - 1; i++) {
    const target = step * i;
    while (segment < points.length - 1 && walked + distance(points[segment - 1], points[segment]) < target) {
      walked += distance(points[segment - 1], points[segment]);
      segment++;
    }
    const a = points[segment - 1];
    const b = points[segment];
    const segLen = distance(a, b);
    const t = segLen === 0 ? 0 : (target - walked) / segLen;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }

  out.push(points[points.length - 1]);
  return out;
}

/**
 * Média móvel de 3 pontos.
 *
 * Serve para medir o comprimento de um traço feito à mão: o tremor do dedo é um
 * zigue-zague de alta frequência que infla bastante o comprimento medido, e o
 * efeito é proporcionalmente pior nos traços curtos — o tique de cima do う tem
 * 27 unidades e um tremor normal o media como 40 e pouco. Suavizar antes de medir
 * pergunta o comprimento do traço que ela quis fazer, não o do tremor.
 */
export function smooth(points: Point[]): Point[] {
  if (points.length < 3) return points;
  return points.map((point, i) => {
    if (i === 0 || i === points.length - 1) return point;
    const before = points[i - 1];
    const after = points[i + 1];
    return {
      x: (before.x + point.x + after.x) / 3,
      y: (before.y + point.y + after.y) / 3,
    };
  });
}

/** Atalho: path do KanjiVG → `n` pontos equidistantes na escala 109×109. */
export function samplePath(d: string, n: number): Point[] {
  return resample(flattenPath(d), n);
}

/** Comprimento de um path, para dimensionar o `stroke-dasharray` da animação. */
export function pathLength(d: string): number {
  return polylineLength(flattenPath(d));
}
