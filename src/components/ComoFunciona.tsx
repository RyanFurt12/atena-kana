/**
 * As regras do treino, escritas.
 *
 * Vem recolhido: é material de consulta, não algo para ler toda vez que abre a
 * tela. Usa `<details>` nativo em vez de estado no React — abre sem JavaScript,
 * o leitor de tela anuncia sozinho e o navegador já cuida do teclado.
 *
 * O texto explica o que a grade acima não consegue mostrar: por que a caixa
 * desce quando erra e quando entram letras novas.
 */

import { MASTERED_BOX } from '../lib/srs';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs tracking-[0.2em] uppercase" style={{ color: 'var(--ink-dim)' }}>
        {titulo}
      </h3>
      <div className="flex flex-col gap-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function ComoFunciona({ sessionSize }: { sessionSize: number }) {
  return (
    <details className="group">
      <summary
        className="cursor-pointer list-none py-2 text-sm underline underline-offset-4"
        style={{ color: 'var(--ink-dim)' }}
      >
        Como funciona o treino
      </summary>

      <div className="flex flex-col gap-4 pt-3 pb-2">
        <Secao titulo="as caixas">
          <p>
            Cada letra tem uma caixa de 0 a 5 em <em>cada modo</em>. Acertar sobe uma caixa; a partir da
            caixa {MASTERED_BOX} a letra conta como dominada.
          </p>
          <ul className="ml-4 list-disc">
            <li>Acerto em até 3 segundos sobe uma caixa.</li>
            <li>Acerto mais demorado também sobe, desde que você já vinha acertando.</li>
            <li>Errar desce duas caixas.</li>
          </ul>
          <p>
            São no mínimo quatro acertos seguidos para dominar uma letra. Um erro custa duas caixas — o
            bastante para você reencontrar a letra logo, sem jogar todo o caminho fora.
          </p>
        </Secao>

        <Secao titulo="quando a letra volta">
          <p>
            A caixa decide a prioridade: hoje, 1, 2, 4, 8 e 16 dias. Mas o treino sempre completa as{' '}
            {sessionSize} cartas — nenhuma letra some da sessão só por estar em dia.
          </p>
        </Secao>

        <Secao titulo="quando entram letras novas">
          <p>
            Cinco por vez, na ordem do alfabeto japonês. Só entram quando no máximo duas das letras
            atuais ainda estão abaixo da caixa 2.
          </p>
          <p>
            Cada modo libera no próprio ritmo. Empacar no desenho não segura a leitura, e é normal ler
            trinta letras enquanto desenha dez.
          </p>
          <p>
            Na grade acima, as letras de moldura tracejada são as que ainda não entraram. Se você já
            conhece o silabário, dá para pular essa dosagem em Ajustes › Ritmo.
          </p>
        </Secao>

        <Secao titulo="treinar só um pedaço">
          <p>
            Em Ajustes › Caracteres › Fileiras você desliga as linhas que não quer agora — para
            treinar só o K e o T, por exemplo. Elas continuam na grade, riscadas, e o que já foi
            treinado nelas fica guardado para quando voltarem.
          </p>
        </Secao>

        <Secao titulo="os números">
          <p>
            Em cada modo, o número é de letras dominadas <em>naquele</em> modo. Na tela inicial, o número
            do treino geral é mais duro: conta só as letras dominadas nos quatro modos ao mesmo tempo.
          </p>
        </Secao>
      </div>
    </details>
  );
}
