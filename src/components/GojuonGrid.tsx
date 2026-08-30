/**
 * O gojūon (五十音) como medidor de progresso.
 *
 * Vale mais do que "63% concluído": a grade é a estrutura real do silabário,
 * então um buraco na linha ら aparece como um buraco na linha ら.
 *
 * Mostra o silabário dos ajustes, e só ele. Hiragana e katakana ocupam a mesma
 * grade — あ e ア são a mesma casa —, então não haveria onde pôr os dois; como o
 * treino já é de um por vez, a grade simplesmente segue a escolha.
 *
 * Cada célula carrega duas informações em dois canais separados, e a separação é
 * o ponto. A tinta do traço diz se a letra já entrou no jogo — bloqueada quase
 * some, recém-liberada já se lê. A barrinha na base diz em que caixa ela está,
 * um segmento por caixa. Um canal só não dava conta das duas: com a tinta
 * carregando tudo, caixa 0 e letra nunca vista ficavam idênticas, e caixas
 * vizinhas diferiam por um degrau de opacidade invisível sobre papel creme.
 *
 * São três situações, não duas, e cada uma tem uma causa diferente — por isso
 * cada uma tem uma marca diferente, e não três tons do mesmo cinza:
 *
 * - **em treino**: moldura cheia e régua de caixas. Está no baralho.
 * - **bloqueada**: moldura tracejada. O SRS ainda não a liberou; vai liberar
 *   sozinho, e os ajustes têm um atalho para adiantar.
 * - **desligada**: riscada. Ela mesma tirou a fileira nos ajustes, e só ela põe
 *   de volta. A distinção importa: "espere" e "você desligou" pedem coisas
 *   opostas de quem olha.
 */

import { useEffect, useState } from 'react';
import { KANA_BY_CHAR, type KanaRow, type Vowel } from '../data/kana';
import { KanaGlyph } from './KanaGlyph';
import {
  MASTERED_BOX,
  MAX_BOX,
  daysUntilDue,
  getSkill,
  introducedIn,
  isRowOn,
  rowsFor,
  supportsChar,
  type ExerciseType,
  type Progress,
  type Settings,
  type SkillState,
} from '../lib/srs';

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o'];

/**
 * Tinta de uma letra ainda não liberada. Bem abaixo do piso das liberadas: o
 * salto entre bloqueada e caixa 0 é a diferença mais importante da grade, e a
 * única que ela precisa comunicar sem ajuda de mais nada.
 */
const LOCKED_INK = 14;

/** Desligada é mais apagada ainda — o risco por cima é que faz a leitura. */
const OFF_INK = 9;

/** Piso e teto da tinta das liberadas — a barra faz a leitura fina do nível. */
const OPEN_INK_FLOOR = 32;

/** Cabe uma linha de rótulo por grupo além dos básicos, para separar as seções. */
const SECTION_LABELS: Record<string, string> = {
  dakuten: 'dakuten',
  handakuten: 'handakuten',
  yoon: 'yōon',
};

type CellState =
  /** Fileira desligada nos ajustes: fora do treino por escolha dela. */
  | { kind: 'off' }
  /** A letra existe na grade, mas o modo ainda não a apresentou. */
  | { kind: 'locked' }
  | { kind: 'open'; skill: SkillState };

function inkPercent(state: CellState): number {
  if (state.kind === 'off') return OFF_INK;
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

/**
 * O risco das desligadas, canto a canto.
 *
 * É um traço e não um cadeado: o app inteiro é desenhado a traço, e um ícone de
 * interface no meio da grade destoaria de tudo à volta. Riscar também é o gesto
 * certo — a letra continua existindo na tabela, só está fora desta temporada.
 */
function Risco() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span
        className="absolute top-1/2 left-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45"
        style={{ background: 'color-mix(in srgb, var(--ink) 28%, transparent)' }}
      />
    </span>
  );
}

function stateLabel(state: CellState): string {
  if (state.kind === 'off') return 'fileira desligada nos ajustes';
  if (state.kind === 'locked') return 'ainda não liberada neste modo';
  return `caixa ${state.skill.box} de ${MAX_BOX}`;
}

/** Moldura de cada situação: cheia, tracejada, ou quase apagada sob o risco. */
function borderOf(state: CellState): string {
  if (state.kind === 'open') return '1px solid var(--rule)';
  if (state.kind === 'locked') return '1px dashed color-mix(in srgb, var(--rule) 60%, transparent)';
  return '1px solid color-mix(in srgb, var(--rule) 35%, transparent)';
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
        border: borderOf(state),
        // Sombra interna em vez de borda mais grossa: marcar a seleção não pode
        // empurrar a grade um pixel para o lado.
        boxShadow: selected ? 'inset 0 0 0 1px var(--ink)' : undefined,
      }}
    >
      <KanaGlyph char={char} className="h-full w-full" weight={6} color={ink(inkPercent(state))} />
      {state.kind === 'open' && <BoxBar box={state.skill.box} />}
      {state.kind === 'off' && <Risco />}
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

/** Só para desenhar o quadradinho cheio da legenda — nenhuma letra real. */
const emptySkillForLegend: SkillState = {
  box: 0,
  streak: 0,
  seen: 0,
  correct: 0,
  avgMs: 0,
  lastSeenAt: 0,
  dueAt: 0,
};

/**
 * A legenda das três marcas.
 *
 * Os quadradinhos são as próprias células em miniatura, com a mesma moldura e o
 * mesmo risco — uma legenda desenhada com outros meios seria uma segunda fonte
 * de verdade sobre o que a grade quer dizer.
 */
function Legenda({ contagem }: { contagem: { open: number; locked: number; off: number } }) {
  const itens: Array<{ state: CellState; texto: [um: string, varias: string]; n: number }> = [
    {
      state: { kind: 'open', skill: { ...emptySkillForLegend, box: MASTERED_BOX } },
      texto: ['em treino', 'em treino'],
      n: contagem.open,
    },
    { state: { kind: 'locked' }, texto: ['bloqueada', 'bloqueadas'], n: contagem.locked },
    { state: { kind: 'off' }, texto: ['desligada', 'desligadas'], n: contagem.off },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--ink-dim)' }}>
      {itens.map((item) => (
        // A desligada só aparece quando existe alguma: sem fileira desligada, a
        // marca não tem o que explicar e vira ruído.
        (item.state.kind !== 'off' || item.n > 0) && (
          <li key={item.texto[1]} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="relative inline-block h-3.5 w-3.5 shrink-0"
              style={{ border: borderOf(item.state) }}
            >
              {item.state.kind === 'open' && (
                <span
                  className="absolute inset-x-px bottom-px h-[2px]"
                  style={{ background: ink(100) }}
                />
              )}
              {item.state.kind === 'off' && <Risco />}
            </span>
            <span>
              {item.n} {item.texto[item.n === 1 ? 0 : 1]}
            </span>
          </li>
        )
      ))}
    </ul>
  );
}

type Props = {
  progress: Progress;
  settings: Settings;
  /** A grade mostra um modo por vez — a média dos quatro esconderia a defasagem. */
  type: ExerciseType;
};

const COLUMNS = 'grid grid-cols-[1.25rem_repeat(5,1fr)] items-center gap-1.5';

export function GojuonGrid({ progress, settings, type }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // A ficha é de um par letra × modo; trocar de aba invalida a seleção. Trocar de
  // silabário também: a letra selecionada nem existe mais na grade nova.
  useEffect(() => setSelected(null), [type, settings.script]);

  // As fileiras dos grupos ligados, na ordem da tabela. Grupo desligado some da
  // grade inteiro: ali a escolha é "isso nem faz parte do meu treino", enquanto
  // fileira desligada continua à vista, riscada, porque é uma exclusão dentro de
  // algo que ela quer treinar.
  const rows = rowsFor(settings);
  const liberadas = new Set(introducedIn(progress, settings, type));

  const stateOf = (char: string): CellState => {
    const row = KANA_BY_CHAR.get(char)!.row;
    if (!isRowOn(settings, row)) return { kind: 'off' };
    return liberadas.has(char) ? { kind: 'open', skill: getSkill(progress, char, type) } : { kind: 'locked' };
  };

  const toggle = (char: string) => setSelected((atual) => (atual === char ? null : char));

  // Só conta o que a grade desenha, e nesta aba: yōon não tem traçado, então no
  // modo de desenho as células dele não existem e não podem entrar na conta.
  const contagem = { open: 0, locked: 0, off: 0 };
  const visivel = (row: KanaRow) =>
    row.cells.map((kana) => (kana && supportsChar(type, kana.char) ? kana.char : null));

  for (const row of rows) {
    for (const char of visivel(row)) {
      if (char) contagem[stateOf(char).kind]++;
    }
  }

  let grupoAnterior: string | null = null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className={COLUMNS}>
        <span />
        {VOWELS.map((vowel) => (
          <span key={vowel} className="text-center text-xs" style={{ color: 'var(--ink-dim)' }}>
            {vowel}
          </span>
        ))}
      </div>

      {rows.map((row) => {
        const chars = visivel(row);
        // Uma fileira inteira fora do modo (yōon no desenho) não vira uma faixa
        // de casas vazias — simplesmente não se desenha.
        if (chars.every((char) => char === null)) return null;

        const cabecalho = row.group !== grupoAnterior && SECTION_LABELS[row.group];
        grupoAnterior = row.group;
        const desligada = !isRowOn(settings, row.row);

        return (
          <div key={row.row} className="contents">
            {cabecalho && (
              <p
                className="mt-2 text-xs tracking-[0.2em] uppercase"
                style={{ color: 'var(--ink-dim)' }}
              >
                {cabecalho}
              </p>
            )}
            <div className={COLUMNS}>
              <span
                className="text-xs"
                style={{
                  color: 'var(--ink-dim)',
                  opacity: desligada ? 0.5 : 1,
                  textDecoration: desligada ? 'line-through' : undefined,
                }}
              >
                {row.label}
              </span>
              {chars.map((char, i) =>
                char ? (
                  <Cell
                    key={i}
                    char={char}
                    state={stateOf(char)}
                    selected={selected === char}
                    onSelect={toggle}
                  />
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          </div>
        );
      })}

      <div className="mt-2 flex flex-col gap-1.5">
        <Legenda contagem={contagem} />
        <Ficha char={selected} state={selected ? stateOf(selected) : null} />
      </div>
    </div>
  );
}
