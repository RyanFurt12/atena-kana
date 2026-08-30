# Kana Trainer

Treino de hiragana **ou** katakana em quatro modos, cada um com progresso próprio:

| modo | o que faz |
| --- | --- |
| **Ler** | vê a letra, escolhe o som |
| **Lembrar** | vê o som, escolhe a letra |
| **Aprender a desenhar** | traça por cima do guia, traço a traço, corrigido na hora |
| **Desenhar de memória** | folha em branco, sem interrupção, correção só no fim |
| **Geral** | mistura os quatro no mesmo baralho |

O silabário é escolhido em Ajustes, um por vez — nunca os dois misturados, o que
tornaria "Lembrar" ambíguo (あ e ア são as duas o som "a"). Cada um guarda o
próprio progresso, então trocar não apaga nada e você volta onde parou.

Site estático, sem backend. O progresso fica no aparelho e o app funciona offline
depois da primeira visita.

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
```

Para testar no celular, na mesma rede:

```bash
npm run build && npx vite preview --host
```

Desenhar com o dedo é diferente de desenhar com o mouse — vale abrir no celular
antes de publicar.

| comando | o que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção em `dist/` |
| `npm run check` | typecheck |
| `npm test` | testes (41) |
| `npm run build:strokes` | rebaixa os dados de traço do KanjiVG |

Publicar: qualquer host de estáticos serve o `dist/`. O `base` é relativo, então
funciona em subdiretório (GitHub Pages) sem configuração extra.

## Como funciona

**Kana é desenhado, nunca escrito com fonte.** Todo caractere na tela — o
enunciado, as alternativas, a grade de progresso — é renderizado a partir dos
paths de traço do KanjiVG (`src/components/KanaGlyph.tsx`). Isso significa que o
caractere que ela lê é o mesmo esqueleto que vai reproduzir no exercício de
desenho, e que o app não baixa nenhuma fonte japonesa: 52 KB de JSON cobrem os 173
kana dos dois silabários e o PWA fica realmente offline.

**Os dois silabários saem da mesma grade.** Hiragana e katakana ocupam faixas
paralelas do Unicode, deslocadas de 0x60 (あ U+3042 / ア U+30A2), e a
correspondência é exata em todo o gojūon — então `src/data/kana.ts` deriva o
katakana da mesma tabela em vez de manter uma segunda cópia que poderia divergir.
O que **não** se deriva é a lista de confusáveis: o katakana embaralha outras
letras (シ/ツ, ソ/ン, ク/タ), e deslocar os pares do hiragana daria ruído.

**A correção do desenho é geométrica, não IA.** Cada traço é reamostrado em 24
pontos por comprimento de arco e comparado com a linha central do traço real
(`src/lib/strokeMatch.ts`). Além de aceitar ou recusar, isso permite dizer *o
quê* saiu errado — sentido invertido, começo fora do lugar, ou traço certo na
posição errada da sequência. Um reconhecedor de imagem responderia "isso é um あ"
e aceitaria o caractere desenhado em qualquer ordem.

**Os distratores são os caracteres que ela confunde.** `src/lib/choices.ts` monta
as alternativas por camadas: confusáveis declarados (あ/お e い/り no hiragana,
シ/ツ e ソ/ン no katakana), depois mesma linha do gojūon, depois mesma vogal.
Sortear quatro caracteres entre 46 deixaria a resposta certa óbvia sem precisar
ler nada.

**Cada modo progride sozinho.** `src/lib/srs.ts` usa Leitner por
(caractere × modo), e a liberação de caracteres novos também é por modo: ela pode
estar em ら na leitura e ainda em か no desenho. Com um conjunto único, o modo
mais lento segurava todos os outros — empacar no traçado de さ travava a entrada
de caracteres novos até para ler.

**O agendamento define prioridade, não presença.** A sessão sempre entrega o
número de cartas pedido, mesmo que nada esteja "vencido" — um SRS que some com o
caractere por 24h depois de um acerto inviabiliza treinar dez minutos à noite.
Caracteres errados voltam duas ou três cartas depois, e caracteres novos entram
de cinco em cinco, só quando os anteriores estão firmes.

No modo geral, os quatro tipos entram no mesmo baralho sem regra especial: como o
peso do sorteio é `(6 − caixa)^1,5`, desenhar de memória — que fica em caixas
baixas por muito mais tempo que ler — naturalmente aparece mais.

**A dosagem é o padrão, não uma regra.** Quem já conhece o silabário pula tudo em
Ajustes → Ritmo (`unlockAll`), com confirmação, e volta atrás depois se quiser —
`relockUntouched` re-esconde só o que nunca foi respondido, então desfazer não
custa progresso real. Liberar mexe apenas em `introduced`: as letras entram na
caixa 0 e continuam a ser conquistadas.

**Dá para treinar só um pedaço.** Ajustes → Caracteres → Fileiras desliga linhas
inteiras do gojūon ("só K e T"). `Settings.disabledRows` guarda o que está *fora*,
não o que está dentro, para que ligar um grupo novo traga as fileiras dele já
ligadas; os nomes são romaji e valem nos dois silabários. Uma fileira desligada
some do baralho mas continua na grade do progresso, riscada — e o progresso dela
fica guardado para quando voltar.

A grade do gojūon mostra as três situações em marcas separadas, porque as causas
são diferentes: moldura cheia (em treino), tracejada (o SRS ainda não liberou) e
riscada (você desligou). Confundir "espere" com "você desligou" faria a grade
pedir a ação errada.

## Estrutura

```
scripts/build-strokes.mjs   baixa o KanjiVG → src/data/strokes.json
src/data/kana.ts            tabela dos dois silabários, linhas, vogais, confusáveis
src/lib/strokePath.ts       parser e amostragem de path SVG
src/lib/strokeMatch.ts      validação de traço
src/lib/srs.ts              progresso e montagem da sessão
src/lib/choices.ts          alternativas de múltipla escolha
src/lib/storage.ts          IndexedDB + export/import + migração de versão
src/components/             KanaGlyph, GenkoCell, DrawCanvas, StrokeGuide…
src/exercises/              ChoiceExercise, GuidedDrawExercise, FreeDrawExercise
src/screens/                Home, Session, Stats, Settings, Summary
```

`migrateProgress` converte o formato antigo (conjunto único de caracteres, um só
modo de desenho): o que já foi treinado desenhando vira "aprender a desenhar", e
"desenhar de memória" começa do zero, porque o exercício não existia.

O parser de path (`strokePath.ts`) foi conferido contra o `getPointAtLength` do
Chrome nos 83 caracteres: desvio máximo de 0,12 numa escala de 109.

## Backup

Não há servidor, então o progresso vive só naquele aparelho. Ajustes → Backup
exporta e importa um JSON. Vale exportar antes de trocar de celular.

## Licença dos dados

Os dados de traço vêm do [KanjiVG](https://kanjivg.tagaini.net), de Ulrich Apel,
sob CC BY-SA 3.0. `src/data/strokes.json` é obra derivada e segue a mesma licença.
Ver `NOTICE`.
