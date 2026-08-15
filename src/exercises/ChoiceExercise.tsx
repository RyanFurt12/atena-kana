/**
 * Os dois exercícios de múltipla escolha, que são o mesmo exercício de trás para
 * frente: `recognize` mostra o hiragana e pede o romaji, `recall` mostra o romaji
 * e pede o hiragana.
 *
 * Escrever os dois com o mesmo componente evita justamente o bug do
 * hiragana-trainer, em que o modo reverso continuava listando romaji nas opções
 * e só trocava a fonte — porque lá as duas metades viviam em lugares diferentes,
 * o backend e o front, e só uma foi virada.
 */

import { useState } from 'react';
import { KanaGlyph } from '../components/KanaGlyph';
import { ChoiceGrid, type Option } from '../components/ChoiceGrid';
import { Ensou, Sakura } from '../components/sumie';
import { buildChoices } from '../lib/choices';
import type { Kana } from '../data/kana';
import { speakKana } from '../lib/speech';

type Props = {
  kana: Kana;
  pool: string[];
  mode: 'recognize' | 'recall';
  sound: boolean;
  onDone: (correct: boolean, elapsedMs: number) => void;
};

const REVEAL_MS = { correct: 850, wrong: 2200 };

export function ChoiceExercise({ kana, pool, mode, sound, onDone }: Props) {
  const [startedAt] = useState(() => Date.now());
  const [choices] = useState(() => buildChoices(kana, pool));
  const [outcome, setOutcome] = useState<'correct' | 'wrong' | null>(null);

  const options: Option[] = choices.map((choice, i) => ({
    id: `${choice.kana.char}-${i}`,
    label: mode === 'recognize' ? choice.kana.romaji : `hiragana ${choice.kana.romaji}`,
    correct: choice.correct,
    node:
      mode === 'recognize' ? (
        <span className="text-3xl lowercase tracking-wide">{choice.kana.romaji}</span>
      ) : (
        <KanaGlyph char={choice.kana.char} className="h-16" weight={5} />
      ),
  }));

  const handlePick = (option: Option) => {
    const correct = option.correct;
    setOutcome(correct ? 'correct' : 'wrong');
    if (correct && sound) speakKana(kana.char);
    setTimeout(() => onDone(correct, Date.now() - startedAt), REVEAL_MS[correct ? 'correct' : 'wrong']);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sem o quadriculado aqui: o papel de escrita serve para escrever. Ler e
          lembrar são leitura, e a moldura só disputava atenção com o caractere.
          Fica o ensō, que emoldura sem cercar. */}
      <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
        {mode === 'recognize' && <Ensou className="pointer-events-none absolute inset-0 h-full w-full" />}
        <div className="absolute inset-0 grid place-items-center p-8">
          {mode === 'recognize' ? (
            <KanaGlyph char={kana.char} className="h-full w-full" weight={4} />
          ) : (
            // O romaji é a pergunta e precisa pesar tanto quanto o hiragana pesa
            // no outro sentido.
            <span className="lowercase text-[clamp(3.5rem,22vw,6rem)]" style={{ letterSpacing: '0.04em' }}>
              {kana.romaji}
            </span>
          )}
        </div>
      </div>

      <ChoiceGrid options={options} onPick={handlePick} revealed={outcome !== null} />

      <div
        className="flex min-h-10 items-center justify-center gap-2 text-center text-sm"
        style={{ color: outcome === 'wrong' ? 'var(--seal)' : 'var(--ink-dim)' }}
        aria-live="polite"
      >
        <Sakura className="h-3 w-3 shrink-0" opacity={outcome === 'wrong' ? 1 : 0.45} />
        {outcome === 'wrong' ? (
          <>
            {/* O caractere vai desenhado, não como texto: o app não depende de
                fonte japonesa em lugar nenhum. */}
            <KanaGlyph char={kana.char} className="h-6 w-6" weight={6} color="var(--seal)" />
            <span>se lê "{kana.romaji}"</span>
          </>
        ) : (
          <span>
            {outcome === 'correct'
              ? 'certo'
              : mode === 'recognize'
                ? 'Qual é o romaji?'
                : 'Qual hiragana é esse romaji?'}
          </span>
        )}
      </div>
    </div>
  );
}
