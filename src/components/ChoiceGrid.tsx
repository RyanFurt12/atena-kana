/**
 * As quatro alternativas.
 *
 * Ao errar, a opção escolhida fica marcada em vermelho E a certa acende — ver as
 * duas lado a lado é o que corrige a confusão. Cor nunca é o único sinal: o
 * estado também aparece no rótulo lido por leitor de tela e na espessura da borda.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { RoughFrame } from './RoughInk';

export type Option = {
  id: string;
  label: string;
  node: ReactNode;
  correct: boolean;
};

type Props = {
  options: Option[];
  onPick: (option: Option) => void;
  /** Trava a grade e revela a resposta. */
  revealed: boolean;
};

export function ChoiceGrid({ options, onPick, revealed }: Props) {
  const [picked, setPicked] = useState<string | null>(null);

  const handle = (option: Option) => {
    if (picked || revealed) return;
    setPicked(option.id);
    onPick(option);
  };

  // Teclas 1–4 respondem, para quando ela usar no computador.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slot = Number(event.key);
      if (!Number.isInteger(slot) || slot < 1 || slot > options.length) return;
      handle(options[slot - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, i) => {
        const isPicked = picked === option.id;
        const showRight = (revealed || picked !== null) && option.correct;
        const showWrong = isPicked && !option.correct;

        const border = showRight
          ? 'var(--color-matcha)'
          : showWrong
            ? 'var(--seal)'
            : 'var(--rule)';

        return (
          <button
            key={option.id}
            onClick={() => handle(option)}
            disabled={picked !== null || revealed}
            aria-label={
              showRight ? `${option.label}, correta` : showWrong ? `${option.label}, errada` : option.label
            }
            className={`relative flex min-h-24 items-center justify-center px-4 py-5 ${
              showWrong ? 'nudge' : ''
            }`}
            style={{
              background: 'var(--panel)',
              color: showWrong ? 'var(--seal)' : 'var(--ink)',
              opacity: picked !== null && !showRight && !showWrong ? 0.4 : 1,
            }}
          >
            <RoughFrame color={border} width={showRight || showWrong ? 2 : 1} />
            {/* Atalho de teclado, para quando ela usar no computador. */}
            <span className="sr-only">{i + 1}</span>
            <span className="relative">{option.node}</span>
          </button>
        );
      })}
    </div>
  );
}
