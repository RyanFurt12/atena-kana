/**
 * A tela inicial: a folha, a assinatura, o treino geral em destaque e os quatro
 * modos com o próprio progresso ao lado do nome.
 *
 * Esse número é o que faz a progressão *aparecer*: antes ela subia de caixa em
 * silêncio e só a grade do gojūon dava algum sinal. Ver "ler 12/46" e "de
 * memória 0/46" na mesma tela também explica sozinho por que os modos andam em
 * ritmos diferentes.
 */

import { KanaWordmark } from '../components/KanaWordmark';
import { KanjiWord } from '../components/KanjiWord';
import { Seal } from '../components/Seal';
import { RoughFrame } from '../components/RoughInk';
import { InkBlot } from '../components/InkArt';
import { ART } from '../lib/artwork';
import { Bamboo, MountainSun } from '../components/sumie';
import {
  EXERCISE_HINTS,
  EXERCISE_KANJI,
  EXERCISE_LABELS,
  EXERCISE_TYPES,
  currentStreak,
  modeProgress,
  overallProgress,
  type ExerciseType,
  type Progress,
  type SessionMode,
  type Settings,
} from '../lib/srs';

type Props = {
  progress: Progress;
  settings: Settings;
  onStart: (mode: SessionMode) => void;
  onStats: () => void;
  onSettings: () => void;
};

/** A assinatura do app, em hiragana: a-te-na. */
const WORDMARK = 'あてな';
const WORDMARK_ROMAJI = 'atena';

function ModeRow({
  type,
  progress,
  settings,
  onStart,
}: {
  type: ExerciseType;
  progress: Progress;
  settings: Settings;
  onStart: (mode: SessionMode) => void;
}) {
  const stats = modeProgress(progress, settings, type);

  return (
    <button
      onClick={() => onStart(type)}
      className="relative flex w-full items-center gap-3 px-3 py-3 text-left"
    >
      <RoughFrame />

      {/* Medalhão de tinta com o kanji do modo — 読 覚 書 白. */}
      <span className="relative grid h-11 w-11 shrink-0 place-items-center p-2.5">
        <InkBlot />
        <KanjiWord
          word={EXERCISE_KANJI[type]}
          className="relative h-full w-full"
          weight={5}
          color="var(--surface)"
        />
      </span>

      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="text-base leading-tight">{EXERCISE_LABELS[type]}</span>
        <span className="text-xs leading-snug" style={{ color: 'var(--ink-dim)' }}>
          {EXERCISE_HINTS[type]}
        </span>
      </span>

      <span className="relative shrink-0" style={{ fontFamily: 'var(--font-mono)', color: 'var(--seal)' }}>
        <span className="text-base">{stats.mastered}</span>
        <span className="text-xs opacity-70">/{stats.total}</span>
      </span>
      <span aria-hidden="true" className="relative shrink-0 text-sm" style={{ color: 'var(--ink-dim)' }}>
        ›
      </span>
    </button>
  );
}

export function HomeScreen({ progress, settings, onStart, onStats, onSettings }: Props) {
  const streak = currentStreak(progress);
  const primeiraVez = EXERCISE_TYPES.every((t) => progress.introduced[t].length === 0);

  const geral = overallProgress(progress, settings);
  const fracao = geral.total === 0 ? 0 : geral.mastered / geral.total;

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col overflow-hidden">
      <MountainSun className="pointer-events-none absolute -top-1 -left-5 h-24 w-44" />
      <Bamboo className="pointer-events-none absolute -top-6 -right-3 h-36 w-20" opacity={0.3} />

      <div className="relative flex flex-1 flex-col gap-5 px-5 pt-12 pb-4">
        <div className="flex flex-col items-center gap-3">
          <KanaWordmark word={WORDMARK} caption={WORDMARK_ROMAJI} className="h-14" />
          <p className="text-center text-sm" style={{ color: 'var(--ink-dim)' }}>
            {primeiraVez
              ? 'Cinco caracteres por vez, até os 46.'
              : streak > 0
                ? `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}`
                : 'Bom te ver de volta.'}
          </p>
          <Seal word="稽古" className="h-7 w-7" />
        </div>

        {/* 稽古 (keiko) — o treino. O painel índigo é a única superfície escura
            da folha, então é para onde o polegar vai primeiro. */}
        <button
          onClick={() => onStart('geral')}
          className="art-panel relative flex w-full flex-col items-center gap-2 px-5 py-4"
          style={{
            backgroundImage: `url(${ART.panelTraining})`,
            color: 'var(--ink-on-panel)',
            boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
          }}
        >
          <KanjiWord word="稽古" className="relative h-6" weight={4.5} color="var(--ink-on-panel)" />
          <span className="relative text-sm tracking-[0.3em] uppercase">
            {primeiraVez ? 'Começar' : 'Treino geral'}
          </span>
          <span className="relative text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
            {geral.mastered} / {geral.total}
          </span>
          <span className="relative h-1 w-full" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <span
              className="block h-full transition-[width] duration-500"
              style={{ width: `${Math.max(fracao * 100, fracao > 0 ? 2 : 0)}%`, background: 'var(--ink-on-panel)' }}
            />
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: 'var(--ink-dim)' }}>
            ou um modo só
          </p>
          {EXERCISE_TYPES.map((type) => (
            <ModeRow key={type} type={type} progress={progress} settings={settings} onStart={onStart} />
          ))}
        </div>
      </div>

      {/* Rodapé em índigo com a faixa de ondas, como a barra do mockup. */}
      {/*
        A arte entra como <img> no fluxo, e é ela que dá a altura do rodapé.
        Com `background-size: cover` era o contrário — a caixa mandava e a
        imagem era recortada, comendo o degradê de cima.
        Também não há cor de fundo aqui: o topo transparente da arte precisa
        deixar o papel aparecer para o desbotado funcionar.
      */}
      <div
        className="relative mt-auto"
        // Piso de altura: se a arte não carregar, o rodapé não colapsa em cima
        // dos próprios botões.
        style={{ color: 'var(--ink-on-panel)', minHeight: '6.5rem' }}
      >
        <img
          src={ART.footer}
          alt=""
          aria-hidden="true"
          className="pointer-events-none block w-full select-none"
        />

        {/* A pintura é uma só, do rodapé inteiro. A divisória entre os botões é
            um tique curto no meio, não uma régua de altura total: a régua
            cortava a faixa ao meio e fazia cada metade parecer um painel
            separado, com imagem própria. */}
        <div className="absolute inset-x-0 bottom-0 flex items-stretch pb-7">
          {[
            { kanji: '記録', label: 'Progresso', onClick: onStats },
            { kanji: '設定', label: 'Ajustes', onClick: onSettings },
          ].map((item) => (
            <button key={item.label} onClick={item.onClick} className="flex flex-1 flex-col items-center gap-1.5 py-4">
              <KanjiWord word={item.kanji} className="h-5" weight={4.5} color="var(--ink-on-panel)" />
              <span className="text-xs tracking-widest">{item.label}</span>
            </button>
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          />
        </div>
      </div>
    </div>
  );
}
