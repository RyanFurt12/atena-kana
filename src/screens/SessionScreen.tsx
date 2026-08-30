/**
 * A sessão: percorre o baralho, entrega cada carta ao exercício certo e vai
 * guardando o progresso conforme ela responde — nada é salvo só no fim, então
 * fechar o app no meio não perde o que ela já acertou.
 */

import { useState } from 'react';
import { KANA_BY_CHAR } from '../data/kana';
import { ChoiceExercise } from '../exercises/ChoiceExercise';
import { GuidedDrawExercise } from '../exercises/GuidedDrawExercise';
import { FreeDrawExercise } from '../exercises/FreeDrawExercise';
import { SessionProgress } from '../components/SessionProgress';
import { KanjiWord } from '../components/KanjiWord';
import { BackArrow } from '../components/RoughInk';
import { Bamboo } from '../components/sumie';
import { SessionSummary } from './SessionSummary';
import {
  EXERCISE_KANJI,
  EXERCISE_TYPES,
  MODE_LABELS,
  SessionRunner,
  buildDeck,
  knownChars,
  recordStudyDay,
  type ExerciseType,
  type Progress,
  type SessionMode,
  type Settings,
} from '../lib/srs';

type Props = {
  progress: Progress;
  settings: Settings;
  mode: SessionMode;
  onProgressChange: (progress: Progress) => void;
  onExit: () => void;
};

export function SessionScreen({ progress, settings, mode, onProgressChange, onExit }: Props) {
  const [runner] = useState(() => new SessionRunner(buildDeck(progress, settings, mode)));
  const [, forceRender] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() =>
    Array.from({ length: runner.total }, () => null),
  );

  /**
   * De onde saem as alternativas, por modo — só o que ela já conhece naquele
   * modo. Congelado no início da sessão para as opções não mudarem de origem no
   * meio dela, conforme o progresso é gravado.
   */
  const [pools] = useState(() => {
    const byType = {} as Record<ExerciseType, string[]>;
    for (const type of EXERCISE_TYPES) byType[type] = knownChars(progress, settings, type);
    return byType;
  });

  const card = runner.current;

  const handleDone = (correct: boolean, elapsedMs: number) => {
    const position = runner.position;
    const updated = runner.submit(progress, correct, elapsedMs);

    setResults((previous) => {
      const next = [...previous];
      next[position] = correct;
      // Reinjeção aumenta o baralho: acompanha o tamanho novo.
      while (next.length < runner.total) next.push(null);
      return next;
    });

    onProgressChange(runner.done ? recordStudyDay(updated) : updated);
    forceRender((n) => n + 1);
  };

  if (runner.total === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6 text-center">
        <p style={{ color: 'var(--ink-dim)' }}>
          {/* Dois caminhos chegam aqui: ligar só yōon — きゃ são dois caracteres e
              não têm traçado próprio, então os modos de desenho ficam sem cartas —
              ou desligar fileiras até não sobrar nada para este modo. */}
          Não há caracteres para este modo com os grupos e as fileiras de agora. Ajuste em Ajustes ›
          Caracteres.
        </p>
        <button onClick={onExit} className="underline underline-offset-4">
          Voltar
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <SessionSummary
        answered={runner.answered}
        correct={runner.correct}
        durationMs={Date.now() - runner.startedAt}
        progress={progress}
        mode={mode}
        deck={runner.deck}
        onExit={onExit}
      />
    );
  }

  const kana = KANA_BY_CHAR.get(card.char)!;
  // No "geral" o tipo muda a cada carta, então o kanji do cabeçalho segue a carta.
  const kanjiDoModo = EXERCISE_KANJI[card.type];

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col gap-5 overflow-hidden p-5 pt-4">
      {/* Enfeite de canto: fica bem no rodapé para não passar por cima de botão. */}
      <Bamboo className="pointer-events-none absolute -right-8 -bottom-6 h-32 w-20" opacity={0.14} />

      <header className="relative flex flex-col gap-3">
        {/* Cabeçalho de três colunas: voltar, título, sair — o título fica
            centrado independentemente do tamanho dos dois lados. */}
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center">
          {/* Alvo de 44px, o mínimo para o polegar. O tipográfico "‹" fica
              pequeno demais como área clicável mesmo parecendo grande. */}
          <button
            onClick={onExit}
            className="-ml-2 flex h-11 w-11 items-center justify-center justify-self-start"
            aria-label="Voltar"
          >
            <BackArrow className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-1">
            {kanjiDoModo && <KanjiWord word={kanjiDoModo} className="h-5" weight={4.5} />}
            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
              {MODE_LABELS[mode]}
            </span>
          </div>
          <button
            onClick={onExit}
            className="justify-self-end text-sm underline underline-offset-4"
            style={{ color: 'var(--ink-dim)' }}
          >
            Sair
          </button>
        </div>
        <div className="flex justify-center">
          <SessionProgress results={results} position={runner.position} />
        </div>
      </header>

      {/* O exercício ocupa o resto da tela e fica centrado: assim a célula cai
          no mesmo lugar em qualquer aparelho, perto do polegar. */}
      <div className="flex flex-1 flex-col justify-center pb-4">
        {/* A `key` remonta o exercício a cada carta, zerando o estado interno. */}
        {card.type === 'draw_guided' ? (
          <GuidedDrawExercise
            key={`${runner.position}-${card.char}`}
            kana={kana}
            leniency={settings.leniency}
            sound={settings.sound}
            onDone={handleDone}
          />
        ) : card.type === 'draw_free' ? (
          <FreeDrawExercise
            key={`${runner.position}-${card.char}`}
            kana={kana}
            leniency={settings.leniency}
            sound={settings.sound}
            onDone={handleDone}
          />
        ) : (
          <ChoiceExercise
            key={`${runner.position}-${card.char}`}
            kana={kana}
            pool={pools[card.type]}
            mode={card.type}
            sound={settings.sound}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}
