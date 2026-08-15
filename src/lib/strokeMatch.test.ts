import { describe, expect, it } from 'vitest';
import { canDraw, getMedians, matchCharacter, matchStroke, strokeCount } from './strokeMatch';
import { polylineLength, resample, type Point } from './strokePath';

/** Ruído determinístico, para os testes não dependerem de Math.random. */
function jitter(points: Point[], amount: number): Point[] {
  return points.map((p, i) => ({
    x: p.x + Math.sin(i * 12.9898) * amount,
    y: p.y + Math.cos(i * 78.233) * amount,
  }));
}

describe('dados de traço', () => {
  it('tem as contagens conhecidas', () => {
    expect(strokeCount('あ')).toBe(3);
    expect(strokeCount('ん')).toBe(1);
    expect(strokeCount('が')).toBe(5);
    expect(strokeCount('ぱ')).toBe(4);
  });

  it('só considera desenháveis os caracteres simples', () => {
    expect(canDraw('あ')).toBe(true);
    expect(canDraw('きゃ')).toBe(false);
  });

  it('amostra medianas dentro do viewBox 109', () => {
    for (const median of getMedians('あ')) {
      expect(median).toHaveLength(24);
      for (const p of median) {
        expect(p.x).toBeGreaterThanOrEqual(-1);
        expect(p.x).toBeLessThanOrEqual(110);
        expect(p.y).toBeGreaterThanOrEqual(-1);
        expect(p.y).toBeLessThanOrEqual(110);
      }
    }
  });
});

describe('matchStroke', () => {
  it('aceita o traço exato', () => {
    const medians = getMedians('あ');
    for (let i = 0; i < medians.length; i++) {
      expect(matchStroke(medians[i], 'あ', i, 'exigente').ok).toBe(true);
    }
  });

  it('aceita um traço trêmulo mas parecido', () => {
    const median = getMedians('あ')[1];
    const verdict = matchStroke(jitter(median, 4), 'あ', 1, 'tranquilo');
    expect(verdict.ok).toBe(true);
  });

  it('reprova por sentido quando o traço vai ao contrário', () => {
    const median = getMedians('あ')[1];
    const verdict = matchStroke([...median].reverse(), 'あ', 1, 'tranquilo');
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('direction');
  });

  it('reprova um traço de outro caractere', () => {
    const alheio = getMedians('ぬ')[0];
    const verdict = matchStroke(alheio, 'ん', 0, 'exigente');
    expect(verdict.ok).toBe(false);
  });

  it('diz "ordem" quando o traço certo vem na hora errada', () => {
    // O 2º traço de あ desenhado quando esperávamos o 1º.
    const verdict = matchStroke(getMedians('あ')[1], 'あ', 0, 'tranquilo');
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toBe('order');
      expect(verdict.matchedIndex).toBe(1);
    }
  });

  it('reprova um toque sem traço', () => {
    const verdict = matchStroke([{ x: 50, y: 50 }], 'ん', 0);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('empty');
  });

  it('reprova um traço curto demais', () => {
    const median = getMedians('ん')[0];
    const metade = resample(median.slice(0, 8), 24);
    const verdict = matchStroke(metade, 'ん', 0, 'exigente');
    expect(verdict.ok).toBe(false);
  });

  it('não deixa o pingo do dakuten passar em qualquer lugar', () => {
    // が = か (3) + os dois traços do dakuten. O 4º é um pingo curto no alto.
    const dakuten = getMedians('が')[3];
    expect(polylineLength(dakuten)).toBeLessThan(20);

    const deslocado = dakuten.map((p) => ({ x: p.x - 40, y: p.y + 40 }));
    const verdict = matchStroke(deslocado, 'が', 3, 'tranquilo');
    expect(verdict.ok).toBe(false);
  });

  it('aceita o traço inteiro desenhado mais devagar (mais pontos)', () => {
    // Reamostrar com muito mais pontos simula um traço lento: a comparação é por
    // fração de percurso, então a quantidade de amostras não pode importar.
    const denso = resample(getMedians('あ')[2], 300);
    expect(matchStroke(denso, 'あ', 2, 'exigente').ok).toBe(true);
  });
});

describe('matchCharacter — veredito do caractere inteiro', () => {
  it('aprova o caractere desenhado corretamente', () => {
    const verdict = matchCharacter(getMedians('あ'), 'あ', 'exigente');
    expect(verdict.ok).toBe(true);
    expect(verdict.countOff).toBe(0);
    expect(verdict.strokes.every((s) => s.ok)).toBe(true);
  });

  it('aponta qual traço saiu do lugar, sem reprovar os outros', () => {
    const medians = getMedians('あ');
    const errado = [medians[0], medians[1].map((p) => ({ x: p.x - 35, y: p.y })), medians[2]];

    const verdict = matchCharacter(errado, 'あ', 'tranquilo');
    expect(verdict.ok).toBe(false);
    expect(verdict.strokes.map((s) => s.ok)).toEqual([true, false, true]);
    expect(verdict.outOfOrder).toBe(false);
  });

  it('reconhece traços certos feitos fora de ordem', () => {
    const [um, dois, tres] = getMedians('あ');
    const verdict = matchCharacter([dois, um, tres], 'あ', 'tranquilo');

    expect(verdict.ok).toBe(false);
    expect(verdict.outOfOrder).toBe(true);
  });

  it('acusa traço faltando e traço sobrando', () => {
    const medians = getMedians('あ');
    expect(matchCharacter(medians.slice(0, 2), 'あ').countOff).toBe(-1);
    expect(matchCharacter([...medians, medians[0]], 'あ').countOff).toBe(1);
    expect(matchCharacter(medians.slice(0, 2), 'あ').ok).toBe(false);
  });

  it('não chama de "fora de ordem" um desenho que está só errado', () => {
    const verdict = matchCharacter(getMedians('ぬ'), 'め', 'exigente');
    expect(verdict.ok).toBe(false);
    expect(verdict.outOfOrder).toBe(false);
  });

  it('aceita traços trêmulos, como saem de um dedo', () => {
    const tremido = getMedians('う').map((median) => jitter(median, 3.5));
    expect(matchCharacter(tremido, 'う', 'tranquilo').ok).toBe(true);
  });
});
