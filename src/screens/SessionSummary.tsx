/**
 * Fim de sessão. Diz o que aconteceu e o que ainda está pendurado, sem
 * comemoração inflada — a única informação que ajuda amanhã é quais caracteres
 * ainda estão fracos.
 */

import { KANA_BY_CHAR } from '../data/kana';
import { KanaGlyph } from '../components/KanaGlyph';
import {
  EXERCISE_TYPES,
  currentStreak,
  getSkill,
  type Card,
  type Progress,
  type SessionMode,
} from '../lib/srs';

type Props = {
  answered: number;
  correct: number;
  durationMs: number;
  progress: Progress;
  mode: SessionMode;
  /** Cartas da sessão, para listar as fracas só do que ela acabou de treinar. */
  deck: Card[];
  onExit: () => void;
};

/**
 * Os caracteres ainda fracos, os piores primeiro — restritos aos modos que
 * apareceram na sessão. Numa sessão só de leitura não faz sentido cobrar que ela
 * não sabe desenhar.
 */
function weakest(progress: Progress, mode: SessionMode, deck: Card[], limit = 6): string[] {
  const types = mode === 'geral' ? EXERCISE_TYPES : [mode];
  const chars = [...new Set(deck.map((card) => card.char))];

  return chars
    .map((char) => {
      const skills = types.map((t) => getSkill(progress, char, t)).filter((s) => s.seen > 0);
      if (skills.length === 0) return null;
      return { char, box: skills.reduce((sum, s) => sum + s.box, 0) / skills.length };
    })
    .filter((entry): entry is { char: string; box: number } => entry !== null && entry.box < 2)
    .sort((a, b) => a.box - b.box)
    .slice(0, limit)
    .map((entry) => entry.char);
}

export function SessionSummary({ answered, correct, durationMs, progress, mode, deck, onExit }: Props) {
  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  const streak = currentStreak(progress);
  const pendentes = weakest(progress, mode, deck);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-10 p-6">
      <div>
        <p className="text-sm tracking-[0.25em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          sessão encerrada
        </p>
        <p className="mt-3 text-7xl" style={{ fontFamily: 'var(--font-mono)' }}>
          {correct}
          <span className="text-3xl" style={{ color: 'var(--ink-dim)' }}>
            /{answered}
          </span>
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-dim)' }}>
          {accuracy}% em {minutes} min · {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
        </p>
      </div>

      {pendentes.length > 0 && (
        <div>
          <p className="mb-3 text-sm" style={{ color: 'var(--ink-dim)' }}>
            Ainda escorregando:
          </p>
          <div className="flex flex-wrap gap-2">
            {pendentes.map((char) => (
              <span
                key={char}
                className="flex items-center gap-2 px-3 py-2"
                style={{ border: '1px solid var(--rule)' }}
              >
                <KanaGlyph char={char} className="h-7 w-7" weight={5} />
                <span className="text-sm lowercase" style={{ color: 'var(--ink-dim)' }}>
                  {KANA_BY_CHAR.get(char)?.romaji}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onExit}
        className="w-full py-4 text-lg"
        style={{
          background: 'var(--panel-raised)',
          border: '1px solid var(--color-ai-deep)',
          color: 'var(--ink-on-panel)',
        }}
      >
        Voltar ao início
      </button>
    </div>
  );
}
