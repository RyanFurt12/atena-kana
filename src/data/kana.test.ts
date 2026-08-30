import { describe, expect, it } from 'vitest';
import { rowsOf } from './kana';

/**
 * A grade do progresso e os ajustes leem esta lista na ordem em que ela sai, sem
 * reordenar nada. `ALL_KANA` acrescenta ん fora do laço da grade — por não ter
 * linha nem vogal —, então sem o sort por grupo a fileira dele cairia entre os
 * dakuten e os yōon, no meio de uma seção a que não pertence.
 */
describe('rowsOf', () => {
  it('agrupa as fileiras por grupo, com ん fechando os básicos', () => {
    const rows = rowsOf('hiragana');
    expect(rows.map((row) => row.row).slice(0, 11)).toEqual([
      'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n',
    ]);
    expect(rows.map((row) => row.group)).toEqual([...rows].sort(
      (a, b) => ['basic', 'dakuten', 'handakuten', 'yoon'].indexOf(a.group)
        - ['basic', 'dakuten', 'handakuten', 'yoon'].indexOf(b.group),
    ).map((row) => row.group));
  });

  it('põe cada caractere na casa da vogal dele, e deixa o buraco vazio', () => {
    const ya = rowsOf('hiragana').find((row) => row.row === 'ya')!;
    expect(ya.cells.map((cell) => cell?.char ?? null)).toEqual(['や', null, 'ゆ', null, 'よ']);
    // ん não tem vogal: cai na primeira casa, que é onde a grade sempre o pôs.
    expect(rowsOf('hiragana').find((row) => row.row === 'n')!.cells[0]!.char).toBe('ん');
  });

  it('rotula a fileira pela consoante, que é como ela é chamada', () => {
    const label = (row: string) => rowsOf('hiragana').find((r) => r.row === row)!.label;
    expect(label('ka')).toBe('k');
    expect(label('kya')).toBe('ky');
    expect(label('a')).toBe('—');
    expect(label('n')).toBe('n');
  });

  it('dá ao katakana as mesmas fileiras, com as letras do outro silabário', () => {
    expect(rowsOf('katakana').map((row) => row.row)).toEqual(rowsOf('hiragana').map((row) => row.row));
    expect(rowsOf('katakana').find((row) => row.row === 'ka')!.cells[0]!.char).toBe('カ');
  });
});
