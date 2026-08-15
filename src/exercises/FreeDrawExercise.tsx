/**
 * "Desenhar de memória": folha em branco, nenhuma interrupção, veredito no fim.
 *
 * A diferença para o modo tutorial não é só esconder o guia — é não cortar o
 * gesto. Aqui o app aceita todos os traços como ela os fez e só depois do
 * "Pronto" diz o que saiu do lugar. É o mais perto de escrever no papel, e é o
 * único jeito de descobrir se ela lembra da ordem: um validador que recusa o
 * traço errado na hora entrega a resposta junto com a correção.
 *
 * Por isso também não mostramos quantos traços o caractere tem. O total é parte
 * do que ela precisa lembrar.
 */

import { useState } from 'react';
import { GenkoCell } from '../components/GenkoCell';
import { DrawCanvas, type Stroke } from '../components/DrawCanvas';
import { KanaGlyph } from '../components/KanaGlyph';
import { ExerciseHeading } from '../components/ExerciseHeading';
import { StrokeReview } from '../components/StrokeReview';
import { RoughFrame } from '../components/RoughInk';
import { matchCharacter, strokeCount, type CharacterVerdict, type Leniency } from '../lib/strokeMatch';
import { speakKana } from '../lib/speech';
import type { Kana } from '../data/kana';

type Props = {
  kana: Kana;
  leniency: Leniency;
  sound: boolean;
  onDone: (correct: boolean, elapsedMs: number) => void;
};

/** Mensagem de correção a partir do veredito do caractere inteiro. */
function critique(verdict: CharacterVerdict, char: string): string {
  if (verdict.ok) return 'certo';
  if (verdict.outOfOrder) return 'Os traços estão certos, mas fora de ordem.';

  if (verdict.countOff < 0) {
    const faltam = -verdict.countOff;
    return faltam === 1 ? 'Faltou um traço.' : `Faltaram ${faltam} traços.`;
  }
  if (verdict.countOff > 0) {
    return verdict.countOff === 1 ? 'Sobrou um traço.' : `Sobraram ${verdict.countOff} traços.`;
  }

  const errados = verdict.strokes.filter((s) => !s.ok).length;
  const total = strokeCount(char);
  if (errados === total) return 'Compare com o modelo e tente de novo.';
  return errados === 1 ? 'Um traço saiu do lugar — o vermelho.' : `${errados} traços saíram do lugar.`;
}

export function FreeDrawExercise({ kana, leniency, sound, onDone }: Props) {
  const [startedAt] = useState(() => Date.now());
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [verdict, setVerdict] = useState<CharacterVerdict | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  const finished = verdict !== null || gaveUp;

  const evaluate = () => {
    if (finished || strokes.length === 0) return;

    const result = matchCharacter(strokes, kana.char, leniency);
    setVerdict(result);
    if (result.ok && sound) speakKana(kana.char);
    setTimeout(() => onDone(result.ok, Date.now() - startedAt), result.ok ? 1700 : 3200);
  };

  const undo = () => {
    if (finished) return;
    setStrokes(strokes.slice(0, -1));
  };

  const giveUp = () => {
    if (finished) return;
    setGaveUp(true);
    setTimeout(() => onDone(false, Date.now() - startedAt), 3200);
  };

  const tone = verdict ? (verdict.ok ? 'correct' : 'wrong') : gaveUp ? 'wrong' : 'neutral';
  const showModel = gaveUp || verdict?.ok;

  return (
    <div className="flex flex-col gap-5">
      <ExerciseHeading>{kana.romaji}</ExerciseHeading>

      <div className="mx-auto w-full max-w-[19rem]">
        <GenkoCell tone={tone}>
          {showModel ? (
            <div className="absolute inset-0 p-6">
              <KanaGlyph char={kana.char} className="h-full w-full" weight={5} animate />
            </div>
          ) : (
            <>
              {/* Depois do veredito, o desenho dela fica na tela com os traços
                  errados em vermelho, e o modelo apagado por trás para comparar. */}
              {verdict && <StrokeReview char={kana.char} strokes={strokes} verdict={verdict} />}
              {!verdict && <DrawCanvas strokes={strokes} onStrokeEnd={(s) => setStrokes([...strokes, s])} />}
            </>
          )}
        </GenkoCell>
      </div>

      <p className="text-center text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-dim)' }}>
        {strokes.length === 0
          ? 'nenhum traço'
          : strokes.length === 1
            ? '1 traço'
            : `${strokes.length} traços`}
      </p>

      {/* Três botões numa linha: `flex-1` com padding curto, senão os rótulos
          quebram em duas linhas numa tela de 390px. */}
      <div className="mx-auto flex w-full max-w-[19rem] gap-2">
        <button
          onClick={undo}
          disabled={finished || strokes.length === 0}
          className="relative flex-1 px-2 py-3 text-sm whitespace-nowrap disabled:opacity-30"
          style={{ color: 'var(--ink)' }}
        >
          <RoughFrame />
          <span className="relative">Apagar</span>
        </button>
        <button
          onClick={evaluate}
          disabled={finished || strokes.length === 0}
          className="flex-1 px-2 py-3 text-sm whitespace-nowrap disabled:opacity-30"
          // Ação principal: painel índigo, então a tinta tem de ser a do papel.
          style={{ background: 'var(--panel-raised)', color: 'var(--ink-on-panel)' }}
        >
          <RoughFrame color="rgba(255,255,255,0.3)" />
          <span className="relative">Pronto</span>
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
        className="flex min-h-10 items-center justify-center gap-2 px-4 text-center text-sm"
        style={{ color: finished && !verdict?.ok ? 'var(--seal)' : 'var(--ink-dim)' }}
        aria-live="polite"
      >
        {gaveUp ? (
          <>
            <KanaGlyph char={kana.char} className="h-6 w-6" weight={6} color="var(--seal)" />
            <span>= {kana.romaji}</span>
          </>
        ) : (
          <span>{verdict ? critique(verdict, kana.char) : 'Desenhe o caractere e toque em Pronto.'}</span>
        )}
      </div>
    </div>
  );
}
