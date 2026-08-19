/**
 * A reconciliação entre IndexedDB e o espelho é o ponto onde a redundância vira
 * corrupção se estiver errada, e é justamente o que não aparece em teste manual:
 * o caso ruim só acontece num iPhone que acabou de acordar do background.
 */

import { describe, expect, it } from 'vitest';
import { reconcile, unwrap } from './storage';

describe('unwrap', () => {
  it('trata ausência como vazio, não como zero', () => {
    expect(unwrap(undefined)).toEqual({ state: 'empty' });
    expect(unwrap(null)).toEqual({ state: 'empty' });
  });

  it('lê o envelope atual', () => {
    expect(unwrap({ rev: 7, data: { version: 2 } })).toEqual({
      state: 'ok',
      rev: 7,
      data: { version: 2 },
    });
  });

  it('aceita registro anterior ao envelope como rev 0', () => {
    // O progresso que já está no aparelho dela foi gravado nu; se isto virasse
    // 'empty', a atualização apagaria tudo no primeiro carregamento.
    expect(unwrap({ version: 2, skills: {} })).toEqual({
      state: 'ok',
      rev: 0,
      data: { version: 2, skills: {} },
    });
  });
});

describe('reconcile', () => {
  it('vence o maior rev, venha de qual store vier', () => {
    expect(reconcile([{ state: 'ok', rev: 3, data: 'antigo' }, { state: 'ok', rev: 9, data: 'novo' }]).data)
      .toBe('novo');
    expect(reconcile([{ state: 'ok', rev: 9, data: 'novo' }, { state: 'ok', rev: 3, data: 'antigo' }]).data)
      .toBe('novo');
  });

  it('recupera do espelho quando o IndexedDB falha', () => {
    // O caso que apagou o progresso no iOS: IDB indisponível ao acordar.
    const resultado = reconcile([{ state: 'failed' }, { state: 'ok', rev: 4, data: 'salvo' }]);
    expect(resultado).toEqual({ rev: 4, data: 'salvo', trustworthy: true });
  });

  it('confia no vazio só quando os dois stores responderam', () => {
    expect(reconcile([{ state: 'empty' }, { state: 'empty' }]).trustworthy).toBe(true);
  });

  it('não confia no vazio se algum store falhou', () => {
    // Sem isto, a primeira carta da sessão grava o zero por cima do registro real.
    expect(reconcile([{ state: 'failed' }, { state: 'empty' }]).trustworthy).toBe(false);
    expect(reconcile([{ state: 'failed' }, { state: 'failed' }]).trustworthy).toBe(false);
  });
});
