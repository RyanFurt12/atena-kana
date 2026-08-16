/**
 * Ajustes.
 *
 * Exportar e importar não estão escondidos num canto: sem servidor, o arquivo é a
 * única forma de o progresso sobreviver a uma troca de celular, e é a primeira
 * coisa que ela vai precisar no dia em que precisar.
 */

import { useRef, useState } from 'react';
import { GROUP_LABELS, type Group } from '../data/kana';
import type { Progress, Settings } from '../lib/srs';
import { makeBackup, parseBackup } from '../lib/storage';

type Props = {
  settings: Settings;
  progress: Progress;
  onChange: (settings: Settings) => void;
  onRestore: (progress: Progress, settings: Settings) => void;
  onBack: () => void;
};

const GROUPS: Group[] = ['basic', 'dakuten', 'handakuten', 'yoon'];

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

export function SettingsScreen({ settings, progress, onChange, onRestore, onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleGroup = (group: Group, on: boolean) => {
    const next = on ? [...settings.enabledGroups, group] : settings.enabledGroups.filter((g) => g !== group);
    if (next.length === 0) return; // sempre pelo menos um grupo
    onChange({ ...settings, enabledGroups: next });
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
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-8 p-6 pb-28">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl">Ajustes</h1>
        <button onClick={onBack} className="text-sm underline underline-offset-4" style={{ color: 'var(--ink-dim)' }}>
          Voltar
        </button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
          caracteres
        </h2>
        {GROUPS.map((group) => (
          <Toggle
            key={group}
            label={GROUP_LABELS[group]}
            hint={group === 'yoon' ? 'Não entram nos modos de desenho.' : undefined}
            checked={settings.enabledGroups.includes(group)}
            onChange={(on) => toggleGroup(group, on)}
          />
        ))}
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          Cada modo libera caracteres no próprio ritmo, então ligar um grupo novo não despeja tudo de
          uma vez.
        </p>
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
