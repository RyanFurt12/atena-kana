/**
 * "Aprender a desenhar": traçar por cima do guia, traço a traço, na ordem certa.
 *
 * Aqui o guia fica visível o tempo todo — é o modo de aprender o traçado, não de
 * provar que sabe. Cada traço é conferido na hora, porque corrigir o gesto
 * enquanto ele acontece é o que ensina; deixar para o fim ensinaria o erro junto.
 * Quem quer a folha em branco tem o modo "desenhar de memória".
 */

import { useState } from 'react';
import { GenkoCell } from '../components/GenkoCell';
import { DrawCanvas, type Stroke } from '../components/DrawCanvas';
import { StrokeGuide } from '../components/StrokeGuide';
import { KanaGlyph } from '../components/KanaGlyph';
import { ExerciseHeading } from '../components/ExerciseHeading';
import { RoughFrame } from '../components/RoughInk';
import { FAILURE_MESSAGES, matchStroke, strokeCount, type Leniency } from '../lib/strokeMatch';
import { speakKana } from '../lib/speech';
import type { Kana } from '../data/kana';

type Props = {
  kana: Kana;
  leniency: Leniency;
  sound: boolean;
  onDone: (correct: boolean, elapsedMs: number) => void;
};

/** Depois de tantas tentativas no mesmo traço, o app mostra e segue em frente. */
const ATTEMPTS_BEFORE_HINT = 3;

export function GuidedDrawExercise({ kana, leniency, sound, onDone }: Props) {
  const total = strokeCount(kana.char);

  const [startedAt] = useState(() => Date.now());
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [failures, setFailures] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [hinting, setHinting] = useState(false);
  const [finished, setFinished] = useState(false);

  const index = strokes.length;

  const finish = (correct: boolean) => {
    setFinished(true);
    if (correct && sound) speakKana(kana.char);
    setTimeout(() => onDone(correct, Date.now() - startedAt), correct ? 1600 : 2400);
  };

  const acceptStroke = (stroke: Stroke, failed: number) => {
    const next = [...strokes, stroke];
    setStrokes(next);
    setAttempts(0);
    setHinting(false);
    if (next.length >= total) finish(failed === 0);
  };

  const handleStroke = (stroke: Stroke) => {
    if (finished || index >= total) return;

    const remaining = Array.from({ length: total - index }, (_, i) => index + i);
    const verdict = matchStroke(stroke, kana.char, index, leniency, remaining);

    if (verdict.ok) {
      setMessage(null);
      acceptStroke(stroke, failures);
      return;
    }

    const tries = attempts + 1;
    const totalFailures = failures + 1;
    setAttempts(tries);
    setFailures(totalFailures);
    setMessage(FAILURE_MESSAGES[verdict.reason]);

    if (tries >= ATTEMPTS_BEFORE_HINT) {
      // Travou. Mostra o traço certo e passa adiante em vez de deixá-la presa.
      setHinting(true);
      setMessage('Esse é o traço. Siga o vermelho e continue.');
    }
  };

  const undo = () => {
    if (finished || strokes.length === 0) return;
    setStrokes(strokes.slice(0, -1));
    setMessage(null);
    setAttempts(0);
    setHinting(false);
  };

  const giveUp = () => {
    if (finished) return;
    setFailures(failures + 1);
    setHinting(true);
    setMessage('Siga o traço em vermelho, começando pelo ponto.');
  };

  const tone = finished ? (failures === 0 ? 'correct' : 'wrong') : 'neutral';

  return (
    <div className="flex flex-col gap-5">
      <ExerciseHeading>{kana.romaji}</ExerciseHeading>

      <div className="mx-auto w-full max-w-[19rem]">
        <GenkoCell tone={tone}>
          {finished && failures === 0 ? (
            // Recompensa: o caractere se reescreve na ordem certa, uma última vez.
            <div className="absolute inset-0 p-6">
              <KanaGlyph char={kana.char} className="h-full w-full" weight={5} animate />
            </div>
          ) : (
            <>
              <StrokeGuide
                char={kana.char}
                strokeIndex={index}
                showGuide={index < total}
                hint={hinting}
              />
              <DrawCanvas strokes={strokes} onStrokeEnd={handleStroke} disabled={finished} />
            </>
          )}
        </GenkoCell>
      </div>

      <p
        className="text-center text-sm"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-dim)' }}
      >
        traço {Math.min(index + 1, total)} de {total}
      </p>

      <div className="mx-auto flex w-full max-w-[19rem] gap-2">
        <button
          onClick={undo}
          disabled={finished || strokes.length === 0}
          className="relative flex-1 px-2 py-3 text-sm whitespace-nowrap disabled:opacity-30"
          style={{ color: 'var(--ink)' }}
        >
          <RoughFrame />
          <span className="relative">Apagar traço</span>
        </button>
        <button
          onClick={giveUp}
          disabled={finished}
          className="relative flex-1 px-2 py-3 text-sm whitespace-nowrap disabled:opacity-30"
          style={{ color: 'var(--ink-dim)' }}
        >
          <RoughFrame />
          <span className="relative">Não lembro</span>
        </button>
      </div>

      <div
        // Duas linhas reservadas: sem isso a célula pula quando a mensagem quebra.
        className="flex min-h-10 items-center justify-center gap-2 px-4 text-center text-sm"
        style={{ color: message ? 'var(--seal)' : 'var(--ink-dim)' }}
        aria-live="polite"
      >
        {finished && failures > 0 ? (
          <>
            <KanaGlyph char={kana.char} className="h-6 w-6" weight={6} color="var(--seal)" />
            <span>= {kana.romaji}</span>
          </>
        ) : (
          <span>
            {finished ? 'certo' : (message ?? 'Comece pelo ponto vermelho.')}
          </span>
        )}
      </div>
    </div>
  );
}
