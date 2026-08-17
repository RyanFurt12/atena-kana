/**
 * O gojūon (五十音) como medidor de progresso.
 *
 * Vale mais do que "63% concluído": a grade é a estrutura real do hiragana, então
 * um buraco na linha ら aparece como um buraco na linha ら.
 *
 * Cada célula carrega duas informações em dois canais separados, e a separação é
 * o ponto. A tinta do traço diz se a letra já entrou no jogo — bloqueada quase
 * some, recém-liberada já se lê. A barrinha na base diz em que caixa ela está,
 * um segmento por caixa. Um canal só não dava conta das duas: com a tinta
 * carregando tudo, caixa 0 e letra nunca vista ficavam idênticas, e caixas
 * vizinhas diferiam por um degrau de opacidade invisível sobre papel creme.
 */

import { useEffect, useState } from 'react';
import { ALL_KANA, KANA_BY_CHAR, type Vowel } from '../data/kana';
import { KanaGlyph } from './KanaGlyph';
import {
  MASTERED_BOX,
  MAX_BOX,
  daysUntilDue,
  getSkill,
  introducedIn,
  type ExerciseType,
  type Progress,
  type Settings,
  type SkillState,
} from '../lib/srs';

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o'];

const ROW_LABELS: [row: string, label: string][] = [
  ['a', '—'],
  ['ka', 'k'],
  ['sa', 's'],
  ['ta', 't'],
  ['na', 'n'],
  ['ha', 'h'],
  ['ma', 'm'],
  ['ya', 'y'],
  ['ra', 'r'],
  ['wa', 'w'],
];

/**
 * Tinta de uma letra ainda não liberada. Bem abaixo do piso das liberadas: o
 * salto entre bloqueada e caixa 0 é a diferença mais importante da grade, e a
 * única que ela precisa comunicar sem ajuda de mais nada.
 */
const LOCKED_INK = 8;

/** Piso e teto da tinta das liberadas — a barra faz a leitura fina do nível. */
const OPEN_INK_FLOOR = 32;

/** A letra existe na grade, mas o modo ainda não a apresentou. */
type CellState = { kind: 'locked' } | { kind: 'open'; skill: SkillState };

function inkPercent(state: CellState): number {
  if (state.kind === 'locked') return LOCKED_INK;
  return Math.round(OPEN_INK_FLOOR + (state.skill.box / MAX_BOX) * (100 - OPEN_INK_FLOOR));
}

function ink(percent: number): string {
  return `color-mix(in srgb, var(--ink) ${percent}%, transparent)`;
}

/**
 * A régua de caixas da letra: um segmento por caixa, não uma largura
 * proporcional. A caixa é um inteiro no modelo, e segmentos deixam contar —
 * largura proporcional embaralha a caixa 2 com a 3.
 *
 * Ao dominar, os segmentos passam de tinta média a tinta cheia. É o que dá o
 * bloco de letras prontas de relance, sem precisar de selo nem moldura extra.
 */
function BoxBar({ box }: { box: number }) {
  const dominada = box >= MASTERED_BOX;
  return (
    <span className="pointer-events-none absolute inset-x-1 bottom-1 grid h-[3px] grid-cols-5 gap-px">
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <span key={i} style={{ background: ink(box > i ? (dominada ? 100 : 55) : 10) }} />
      ))}
    </span>
  );
}

function stateLabel(state: CellState): string {
  if (state.kind === 'locked') return 'ainda não liberada neste modo';
  return `caixa ${state.skill.box} de ${MAX_BOX}`;
}

type CellProps = {
  char: string;
  state: CellState;
  selected: boolean;
  onSelect: (char: string) => void;
};

/** O próprio botão é o item da grade — não envolver num span, senão a célula
    vira uma caixa de bloco dentro de uma caixa inline e perde a largura 1fr. */
function Cell({ char, state, selected, onSelect }: CellProps) {
  const romaji = KANA_BY_CHAR.get(char)!.romaji;
  return (
    <button
      type="button"
      onClick={() => onSelect(char)}
      aria-pressed={selected}
      aria-label={`${romaji} — ${stateLabel(state)}`}
      title={romaji}
      className="relative grid aspect-square place-items-center p-1 pb-2"
      style={{
        border:
          state.kind === 'locked'
            ? '1px dashed color-mix(in srgb, var(--rule) 60%, transparent)'
            : '1px solid var(--rule)',
        // Sombra interna em vez de borda mais grossa: marcar a seleção não pode
        // empurrar a grade um pixel para o lado.
        boxShadow: selected ? 'inset 0 0 0 1px var(--ink)' : undefined,
      }}
    >
      <KanaGlyph char={char} className="h-full w-full" weight={6} color={ink(inkPercent(state))} />
      {state.kind === 'open' && <BoxBar box={state.skill.box} />}
    </button>
  );
}

/** "hoje" quando já venceu, senão "4d". */
function quandoVolta(skill: SkillState): string {
  const dias = daysUntilDue(skill);
  return dias === 0 ? 'volta hoje' : `volta em ${dias}d`;
}

/**
 * A ficha da letra selecionada.
 *
 * É o que substitui a régua de caixas que ficava no topo da tela: em vez de
 * dizer que três letras estão na caixa 2 — o que não responde nada, porque não
 * diz *quais* —, responde sobre a letra que ela apontou.
 */
function Ficha({ char, state }: { char: string | null; state: CellState | null }) {
  // Altura reservada para a grade não pular quando ela toca numa letra.
  const box = 'flex min-h-10 flex-col justify-center text-xs';

  if (!char || !state) {
    return (
      <p className={box} style={{ color: 'var(--ink-dim)' }}>
        Toque numa letra para ver o nível dela.
      </p>
    );
  }

  const romaji = KANA_BY_CHAR.get(char)!.romaji;
  const acerto =
    state.kind === 'open' && state.skill.seen > 0
      ? `${state.skill.seen} ${state.skill.seen === 1 ? 'resposta' : 'respostas'} · ${Math.round(
          (state.skill.correct / state.skill.seen) * 100,
        )}% de acerto`
      : null;

  return (
    <div className={box} aria-live="polite">
      <span>
        {char} · {romaji} — {stateLabel(state)}
        {state.kind === 'open' && `, ${quandoVolta(state.skill)}`}
      </span>
      {acerto && <span style={{ color: 'var(--ink-dim)' }}>{acerto}</span>}
    </div>
  );
}

type Props = {
  progress: Progress;
  settings: Settings;
  /** A grade mostra um modo por vez — a média dos quatro esconderia a defasagem. */
  type: ExerciseType;
};

export function GojuonGrid({ progress, settings, type }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // A ficha é de um par letra × modo; trocar de aba invalida a seleção.
  useEffect(() => setSelected(null), [type]);

  const byPosition = new Map(ALL_KANA.filter((k) => k.group === 'basic').map((k) => [`${k.row}${k.vowel}`, k.char]));
  const liberadas = new Set(introducedIn(progress, settings, type));

  const stateOf = (char: string): CellState =>
    liberadas.has(char) ? { kind: 'open', skill: getSkill(progress, char, type) } : { kind: 'locked' };

  const toggle = (char: string) => setSelected((atual) => (atual === char ? null : char));

  const cell = (char: string, key: string) => (
    <Cell key={key} char={char} state={stateOf(char)} selected={selected === char} onSelect={toggle} />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[1.25rem_repeat(5,1fr)] gap-1.5">
        <span />
        {VOWELS.map((vowel) => (
          <span key={vowel} className="text-center text-xs" style={{ color: 'var(--ink-dim)' }}>
            {vowel}
          </span>
        ))}
      </div>

      {ROW_LABELS.map(([row, label]) => (
        <div key={row} className="grid grid-cols-[1.25rem_repeat(5,1fr)] items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {label}
          </span>
          {VOWELS.map((vowel) => {
            const char = byPosition.get(`${row}${vowel}`);
            return char ? cell(char, vowel) : <span key={vowel} />;
          })}
        </div>
      ))}

      {/* ん não cabe na grade: não tem linha nem vogal. Mesma célula das outras,
          para não divergir delas na próxima mudança. */}
      <div className="grid grid-cols-[1.25rem_repeat(5,1fr)] items-center gap-1.5">
        <span />
        {cell('ん', 'n')}
      </div>

      <Ficha char={selected} state={selected ? stateOf(selected) : null} />
    </div>
  );
}
