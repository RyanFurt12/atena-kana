/**
 * Ajustes.
 *
 * Exportar e importar não estão escondidos num canto: sem servidor, o arquivo é a
 * única forma de o progresso sobreviver a uma troca de celular, e é a primeira
 * coisa que ela vai precisar no dia em que precisar.
 */

import { useRef, useState } from 'react';
import {
  ALL_GROUPS,
  GROUP_LABELS,
  SCRIPTS,
  SCRIPT_LABELS,
  type Group,
  type KanaRow,
  type Script,
} from '../data/kana';
import { KanaGlyph } from '../components/KanaGlyph';
import {
  enabledRowCount,
  isRowOn,
  pendingUnlocks,
  relockUntouched,
  rowsFor,
  unlockAll,
  untouchedCount,
  type Progress,
  type Settings,
} from '../lib/srs';
import { makeBackup, parseBackup } from '../lib/storage';

type Props = {
  settings: Settings;
  progress: Progress;
  onChange: (settings: Settings) => void;
  onProgressChange: (progress: Progress) => void;
  onRestore: (progress: Progress, settings: Settings) => void;
  onBack: () => void;
};

/**
 * A escolha do silabário.
 *
 * Radio, e não dois interruptores como os grupos logo abaixo: os grupos somam e
 * este escolhe. Dois interruptores diriam que dá para ligar os dois, que é
 * justamente o que não dá — e a trava de "pelo menos um" que os grupos precisam
 * sai de graça aqui, porque um radio não tem estado vazio.
 */
function ScriptPicker({ value, onChange }: { value: Script; onChange: (script: Script) => void }) {
  return (
    <div role="radiogroup" aria-label="Silabário" className="grid grid-cols-2 gap-2">
      {SCRIPTS.map((script) => {
        const selected = value === script;
        return (
          <button
            key={script}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(script)}
            className="px-4 py-3 text-sm"
            style={{
              border: '1px solid var(--rule)',
              // Mesma superfície escura das abas do progresso: é o jeito do app
              // dizer "esta é a que vale" sem inventar um controle novo.
              background: selected ? 'var(--panel-raised)' : 'transparent',
              color: selected ? 'var(--ink-on-panel)' : 'var(--ink-dim)',
            }}
          >
            {SCRIPT_LABELS[script]}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{ border: '1px solid var(--rule)', opacity: disabled ? 0.4 : 1 }}
    >
      <span className="flex flex-col">
        <span className="text-sm">{label}</span>
        {hint && (
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        // Tinta comum: o vermelho fica reservado para correção.
        className="h-5 w-5 shrink-0 accent-[var(--ink)]"
      />
    </label>
  );
}

/**
 * As fileiras, uma a uma.
 *
 * Os grupos acima respondem "quais famílias de letra existem no meu treino"; isto
 * responde "e dentro delas, quais fileiras eu quero *agora*" — que é a pergunta
 * de quem está treinando só o K e o T. São perguntas diferentes e por isso são
 * dois controles: um grupo desligado tira a fileira daqui junto, e não o
 * contrário.
 *
 * Vem recolhido num `<details>` porque são até 27 interruptores, e a maioria das
 * pessoas nunca vai mexer neles. O resumo já diz o essencial — quantas ficaram
 * ligadas — sem precisar abrir.
 *
 * Cada botão desenha a primeira letra da fileira em vez de escrevê-la: o app não
 * carrega fonte japonesa, todo kana aqui é traço do KanjiVG, e "か" num <span>
 * viraria quadradinho em aparelho sem fonte instalada.
 */
function RowPicker({
  rows,
  settings,
  onToggle,
  onAll,
}: {
  rows: KanaRow[];
  settings: Settings;
  onToggle: (row: string, on: boolean) => void;
  onAll: () => void;
}) {
  const ligadas = rows.filter((row) => isRowOn(settings, row.row)).length;
  const todas = ligadas === rows.length;

  return (
    <details className="group" style={{ border: '1px solid var(--rule)' }}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
        <span className="flex flex-col">
          <span>Fileiras</span>
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {todas ? 'todas ligadas' : `${ligadas} de ${rows.length} ligadas`}
          </span>
        </span>
        <span aria-hidden="true" className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          {/* Gira ao abrir: é a única affordance de que há algo dentro. */}
          <span className="inline-block transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>

      <div className="flex flex-col gap-2 px-4 pt-1 pb-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          Desligue o que não quer ver agora. Elas continuam na grade do progresso, riscadas, e o que
          você já treinou nelas fica guardado.
        </p>

        <div className="grid grid-cols-4 gap-1.5">
          {rows.map((row) => {
            const on = isRowOn(settings, row.row);
            // A fileira sempre tem pelo menos uma casa preenchida — é dela que
            // sai o desenho do botão.
            const amostra = row.cells.find((cell) => cell)!.char;
            return (
              <button
                key={row.row}
                type="button"
                aria-pressed={on}
                aria-label={`Fileira ${row.row}`}
                onClick={() => onToggle(row.row, !on)}
                className="relative flex flex-col items-center gap-1 py-2"
                style={{
                  border: on ? '1px solid var(--rule)' : '1px dashed color-mix(in srgb, var(--rule) 60%, transparent)',
                  background: on ? 'transparent' : 'color-mix(in srgb, var(--ink) 3%, transparent)',
                }}
              >
                <KanaGlyph
                  char={amostra}
                  className="h-7"
                  weight={6}
                  color={`color-mix(in srgb, var(--ink) ${on ? 85 : 20}%, transparent)`}
                />
                <span
                  className="text-[0.65rem] leading-none"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-dim)',
                    textDecoration: on ? undefined : 'line-through',
                  }}
                >
                  {row.row}
                </span>
              </button>
            );
          })}
        </div>

        {!todas && (
          <button
            type="button"
            onClick={onAll}
            className="self-start text-xs underline underline-offset-4"
            style={{ color: 'var(--ink-dim)' }}
          >
            Ligar todas de novo
          </button>
        )}
      </div>
    </details>
  );
}

/**
 * O "tem certeza?" das ações que mexem no progresso.
 *
 * Inline, e não um `confirm()` do navegador: o app é uma PWA de tela cheia, onde
 * o diálogo nativo chega como uma caixa de sistema com o domínio no título e
 * quebra a ilusão inteira. Aqui a pergunta nasce no lugar do botão que a
 * disparou, com o mesmo papel e a mesma tinta.
 *
 * O botão de confirmar nunca é o primeiro do par: quem tocou por engano tem de
 * atravessar o "deixa pra lá" antes de chegar nele.
 */
function Confirmacao({
  pergunta,
  detalhe,
  confirmar,
  onConfirm,
  onCancel,
}: {
  pergunta: string;
  detalhe: string;
  confirmar: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={pergunta}
      className="flex flex-col gap-3 px-4 py-3"
      style={{ border: '1px solid var(--ink)' }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm">{pergunta}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          {detalhe}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm"
          style={{ border: '1px solid var(--rule)' }}
        >
          Deixa pra lá
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2 text-sm"
          style={{ background: 'var(--panel-raised)', color: 'var(--ink-on-panel)' }}
        >
          {confirmar}
        </button>
      </div>
    </div>
  );
}

export function SettingsScreen({
  settings,
  progress,
  onChange,
  onProgressChange,
  onRestore,
  onBack,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<'liberar' | 'voltar' | null>(null);
  // Recado próprio: o do backup mora noutra seção e apareceria no lugar errado.
  const [ritmoMessage, setRitmoMessage] = useState<string | null>(null);

  const rows = rowsFor(settings);
  const aLiberar = pendingUnlocks(progress, settings);
  const semResposta = untouchedCount(progress, settings);

  const toggleGroup = (group: Group, on: boolean) => {
    const next = on ? [...settings.enabledGroups, group] : settings.enabledGroups.filter((g) => g !== group);
    if (next.length === 0) return; // sempre pelo menos um grupo
    onChange({ ...settings, enabledGroups: next });
  };

  const toggleRow = (row: string, on: boolean) => {
    // Desligar a última deixaria o baralho vazio e a sessão sem nada a perguntar;
    // o toque simplesmente não faz nada, como no último grupo.
    if (!on && enabledRowCount(settings) <= 1) return;
    const next = on
      ? settings.disabledRows.filter((r) => r !== row)
      : [...settings.disabledRows, row];
    onChange({ ...settings, disabledRows: next });
  };

  // Só as fileiras à vista voltam: as de um grupo desligado não são assunto deste
  // botão, e ressuscitá-las mudaria o treino de um jeito que ninguém pediu.
  const ligarTodasAsFileiras = () => {
    const visiveis = new Set(rows.map((row) => row.row));
    onChange({ ...settings, disabledRows: settings.disabledRows.filter((r) => !visiveis.has(r)) });
  };

  const liberarTudo = () => {
    onProgressChange(unlockAll(progress, settings));
    setConfirmando(null);
    setRitmoMessage('Tudo liberado. As letras entram na caixa 0 — aparecer não é o mesmo que já saber.');
  };

  const voltarAoGradual = () => {
    onProgressChange(relockUntouched(progress));
    setConfirmando(null);
    setRitmoMessage('De volta ao ritmo gradual. O que você já respondeu continua no treino.');
  };

  const exportar = () => {
    const backup = makeBackup(progress, settings);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kana-trainer-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Arquivo salvo. Guarde num lugar que você ache depois.');
  };

  const importar = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      onRestore(backup.progress, backup.settings);
      setMessage(`Progresso de ${backup.exportedAt.slice(0, 10)} restaurado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não deu para ler esse arquivo.');
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-8 p-6 pb-28 pt-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl">Ajustes</h1>
        <button onClick={onBack} className="text-sm underline underline-offset-4" style={{ color: 'var(--ink-dim)' }}>
          Voltar
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          silabário
        </h2>
        <ScriptPicker value={settings.script} onChange={(script) => onChange({ ...settings, script })} />
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          Um de cada vez. Cada silabário tem o progresso dele: trocar aqui não apaga nada, e você
          volta exatamente onde parou no outro.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          caracteres
        </h2>
        {ALL_GROUPS.map((group) => (
          <Toggle
            key={group}
            label={GROUP_LABELS[group]}
            hint={group === 'yoon' ? 'Não entram nos modos de desenho.' : undefined}
            checked={settings.enabledGroups.includes(group)}
            onChange={(on) => toggleGroup(group, on)}
          />
        ))}
        <RowPicker
          rows={rows}
          settings={settings}
          onToggle={toggleRow}
          onAll={ligarTodasAsFileiras}
        />

        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          Cada modo libera caracteres no próprio ritmo, então ligar um grupo novo não despeja tudo de
          uma vez.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          ritmo
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          Normalmente o treino solta cinco letras por vez e só traz mais quando as atuais estão
          firmes. Se você já conhece o silabário e quer ele inteiro desde a primeira sessão, pule
          essa dosagem.
        </p>

        {confirmando === 'liberar' ? (
          <Confirmacao
            pergunta="Tem certeza?"
            detalhe={`Todas as letras do ${settings.script} passam a aparecer de uma vez, nos quatro modos — ${aLiberar} liberações. As caixas não mudam: elas entram na 0 e ainda têm de ser conquistadas. Dá para voltar atrás depois.`}
            confirmar="Liberar tudo"
            onConfirm={liberarTudo}
            onCancel={() => setConfirmando(null)}
          />
        ) : confirmando === 'voltar' ? (
          <Confirmacao
            pergunta="Voltar ao ritmo gradual?"
            detalhe={`Saem do treino as ${semResposta} letras que você ainda não respondeu nenhuma vez, e o app volta a soltá-las aos poucos. Nada do que você já treinou se perde.`}
            confirmar="Voltar ao gradual"
            onConfirm={voltarAoGradual}
            onCancel={() => setConfirmando(null)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={aLiberar === 0}
              onClick={() => setConfirmando('liberar')}
              className="py-3 text-sm"
              style={{ border: '1px solid var(--rule)', opacity: aLiberar === 0 ? 0.4 : 1 }}
            >
              {aLiberar === 0 ? 'Tudo já está liberado' : 'Liberar todas as letras'}
            </button>
            {semResposta > 0 && (
              <button
                type="button"
                onClick={() => setConfirmando('voltar')}
                className="self-start text-xs underline underline-offset-4"
                style={{ color: 'var(--ink-dim)' }}
              >
                Voltar ao ritmo gradual
              </button>
            )}
          </div>
        )}

        {ritmoMessage && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }} aria-live="polite">
            {ritmoMessage}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          sessão
        </h2>

        <label className="flex items-center justify-between gap-4 px-4 py-3" style={{ border: '1px solid var(--rule)' }}>
          <span className="text-sm">Cartas por sessão</span>
          <select
            value={settings.sessionSize}
            onChange={(event) => onChange({ ...settings, sessionSize: Number(event.target.value) })}
            className="px-2 py-1"
            style={{ border: '1px solid var(--rule)', color: 'var(--ink)' }}
          >
            {[10, 15, 20, 30, 40].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <Toggle
          label="Correção exigente no desenho"
          hint="Aperta a tolerância de posição e traçado."
          checked={settings.leniency === 'exigente'}
          onChange={(on) => onChange({ ...settings, leniency: on ? 'exigente' : 'tranquilo' })}
        />

        <Toggle
          label="Modo noturno"
          hint="Tinta escura no lugar do papel, para usar no escuro."
          checked={settings.theme === 'noite'}
          onChange={(on) => onChange({ ...settings, theme: on ? 'noite' : 'papel' })}
        />

        <Toggle
          // "Som" aqui é áudio de verdade, não romaji — mas "pronúncia" não
          // deixa margem para confundir os dois.
          label="Falar a pronúncia ao acertar"
          hint="Usa a voz japonesa do aparelho, se houver."
          checked={settings.sound}
          onChange={(on) => onChange({ ...settings, sound: on })}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          backup
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          O progresso fica guardado só neste aparelho. Exporte antes de trocar de celular ou limpar o navegador.
        </p>
        <div className="flex gap-3">
          <button
            onClick={exportar}
            className="flex-1 py-3 text-sm"
            style={{ border: '1px solid var(--rule)' }}
          >
            Exportar
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 py-3 text-sm"
            style={{ border: '1px solid var(--rule)' }}
          >
            Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importar(file);
            event.target.value = '';
          }}
        />
        {message && (
          <p className="text-xs" style={{ color: 'var(--ink)' }} aria-live="polite">
            {message}
          </p>
        )}
      </section>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
        Dados de traço do KanjiVG, de Ulrich Apel, sob licença CC BY-SA 3.0.
      </p>
    </div>
  );
}
