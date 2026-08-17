/**
 * Progresso, agora por modo.
 *
 * A grade do gojūon é o gráfico — mas uma grade só, com a média dos quatro
 * modos, mentiria: ela lê metade do alfabeto e desenha cinco caracteres, e a
 * média esconderia as duas coisas. Uma aba por modo mostra a defasagem, que é
 * justamente a informação útil.
 *
 * O `pb-28` é folga para a faixa escura da arte de papel, que fica fixa no pé da
 * tela: sem ela, a última linha de texto cai em cima da onda e some.
 */

import { useState } from 'react';
import { GojuonGrid } from '../components/GojuonGrid';
import { ComoFunciona } from '../components/ComoFunciona';
import {
  EXERCISE_HINTS,
  EXERCISE_LABELS,
  EXERCISE_TYPES,
  modeProgress,
  type ExerciseType,
  type Progress,
  type Settings,
} from '../lib/srs';

type Props = {
  progress: Progress;
  settings: Settings;
  onBack: () => void;
};

/** Rótulos curtos para as abas — os longos não cabem em quatro colunas. */
const TAB_LABELS: Record<ExerciseType, string> = {
  recognize: 'Ler',
  recall: 'Lembrar',
  draw_guided: 'Traçar',
  draw_free: 'Memória',
};

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function StatsScreen({ progress, settings, onBack }: Props) {
  const [tab, setTab] = useState<ExerciseType>('recognize');
  const stats = modeProgress(progress, settings, tab);
  const accuracy = stats.seen === 0 ? null : Math.round((stats.correct / stats.seen) * 100);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 p-6 pb-28">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl">Progresso</h1>
        <button onClick={onBack} className="text-sm underline underline-offset-4" style={{ color: 'var(--ink-dim)' }}>
          Voltar
        </button>
      </header>

      <div className="grid grid-cols-4 gap-1" role="tablist">
        {EXERCISE_TYPES.map((type) => (
          <button
            key={type}
            role="tab"
            aria-selected={tab === type}
            onClick={() => setTab(type)}
            className="px-1 py-2 text-xs"
            style={{
              border: '1px solid var(--rule)',
              background: tab === type ? 'var(--panel-raised)' : 'transparent',
              color: tab === type ? 'var(--ink-on-panel)' : 'var(--ink-dim)',
            }}
          >
            {TAB_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-sm">{EXERCISE_LABELS[tab]}</span>
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {EXERCISE_HINTS[tab]}
          </span>
        </div>
        <span className="text-right" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-2xl">{stats.mastered}</span>
          <span className="text-sm" style={{ color: 'var(--ink-dim)' }}>
            /{stats.total}
          </span>
        </span>
      </div>

      <p className="-mt-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
        {plural(stats.introduced, 'apresentado', 'apresentados')} ·{' '}
        {accuracy === null
          ? 'sem respostas ainda'
          : `${accuracy}% de acerto em ${plural(stats.seen, 'resposta', 'respostas')}`}
      </p>

      <GojuonGrid progress={progress} settings={settings} type={tab} />

      <ComoFunciona sessionSize={settings.sessionSize} />

      <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
        Dados de traço do KanjiVG, de Ulrich Apel, sob licença CC BY-SA 3.0.
      </p>
    </div>
  );
}
