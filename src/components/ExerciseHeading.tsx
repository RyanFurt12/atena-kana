/**
 * O enunciado do exercício: a pergunta, grande e centrada.
 *
 * O nome do modo não vem mais aqui — o cabeçalho da sessão já traz o kanji e o
 * rótulo, e repetir "APRENDER A DESENHAR" logo abaixo de "Aprender a desenhar"
 * só roubava altura da célula.
 *
 * Está separado porque os quatro modos precisam parecer o mesmo app: se cada um
 * escolhesse seu tamanho de fonte, trocar de modo pareceria trocar de tela.
 */

import type { ReactNode } from 'react';

export function ExerciseHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-center lowercase text-[clamp(3rem,17vw,4.5rem)]" style={{ letterSpacing: '0.04em' }}>
      {children}
    </p>
  );
}
