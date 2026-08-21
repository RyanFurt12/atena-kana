/**
 * Tabela de hiragana e katakana.
 *
 * Montada a partir de uma grade compacta em vez de 104 objetos escritos à mão:
 * a posição na linha do gojūon já define a vogal, então `row` e `vowel` saem de
 * graça e não dá para errar digitando.
 *
 * Os dois silabários saem da *mesma* grade. Hiragana e katakana ocupam faixas
 * paralelas do Unicode, deslocadas de 0x60 — あ U+3042 e ア U+30A2, ん U+3093 e
 * ン U+30F3 —, e a correspondência é exata em tudo que o gojūon usa. Uma segunda
 * tabela escrita à mão seria 104 chances de divergir desta em silêncio.
 *
 * O que *não* se deriva é a lista de confusáveis: as letras que o katakana
 * embaralha são outras (シ/ツ, ソ/ン, ク/タ), e deslocar os pares do hiragana
 * daria ruído — お/あ não vira オ/ア. Essa parte é escrita à mão, por silabário.
 *
 * Romaji em Hepburn (shi, chi, tsu, fu). `accepts` guarda as grafias alternativas
 * que também são aceitas quando ela digita, para não reprovar quem escreve "si".
 */

export type Group = 'basic' | 'dakuten' | 'handakuten' | 'yoon';
export type Vowel = 'a' | 'i' | 'u' | 'e' | 'o';
export type Script = 'hiragana' | 'katakana';

export type Kana = {
  char: string;
  romaji: string;
  accepts: string[];
  row: string;
  vowel: Vowel | null;
  group: Group;
  script: Script;
  /** Caracteres visualmente parecidos — a fonte dos bons distratores. */
  confusable: string[];
};

export const SCRIPTS: Script[] = ['hiragana', 'katakana'];

export const SCRIPT_LABELS: Record<Script, string> = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
};

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o'];

/** Distância entre as duas faixas: ぁ U+3041 → ァ U+30A1, ん U+3093 → ン U+30F3. */
const KATAKANA_OFFSET = 0x60;

/** Converte um ou dois caracteres — きゃ vira キャ de uma vez só. */
function toKatakana(hiragana: string): string {
  return [...hiragana]
    .map((c) => String.fromCodePoint(c.codePointAt(0)! + KATAKANA_OFFSET))
    .join('');
}

/** Grafias alternativas aceitas além do Hepburn canônico. */
const ALTERNATES: Record<string, string[]> = {
  し: ['si'],
  ち: ['ti'],
  つ: ['tu'],
  ふ: ['hu'],
  じ: ['zi'],
  ぢ: ['di', 'dji'],
  づ: ['du', 'dzu'],
  を: ['o'],
  ん: ['nn'],
  しゃ: ['sya'],
  しゅ: ['syu'],
  しょ: ['syo'],
  ちゃ: ['tya'],
  ちゅ: ['tyu'],
  ちょ: ['tyo'],
  じゃ: ['zya'],
  じゅ: ['zyu'],
  じょ: ['zyo'],
};

/**
 * Pares que se confundem de verdade na leitura. Declarados uma vez e espelhados
 * automaticamente nos dois sentidos, porque a confusão nunca é de mão única.
 */
const HIRAGANA_CONFUSABLE_PAIRS: [string, string][] = [
  ['あ', 'お'],
  ['あ', 'め'],
  ['あ', 'ぬ'],
  ['い', 'り'],
  ['い', 'こ'],
  ['う', 'つ'],
  ['う', 'ら'],
  ['え', 'ん'],
  ['か', 'や'],
  ['く', 'へ'],
  ['け', 'は'],
  ['け', 'ほ'],
  ['こ', 'に'],
  ['さ', 'き'],
  ['さ', 'ち'],
  ['さ', 'ら'],
  ['し', 'つ'],
  ['し', 'も'],
  ['す', 'む'],
  ['す', 'お'],
  ['せ', 'は'],
  ['そ', 'ろ'],
  ['そ', 'ん'],
  ['た', 'な'],
  ['ち', 'き'],
  ['ち', 'ら'],
  ['て', 'へ'],
  ['な', 'は'],
  ['ぬ', 'め'],
  ['ぬ', 'ね'],
  ['ね', 'れ'],
  ['ね', 'わ'],
  ['の', 'め'],
  ['は', 'ほ'],
  ['は', 'ま'],
  ['ほ', 'ま'],
  ['ま', 'も'],
  ['み', 'め'],
  ['む', 'お'],
  ['も', 'き'],
  ['や', 'ゆ'],
  ['よ', 'ま'],
  ['る', 'ろ'],
  ['る', 'ら'],
  ['れ', 'わ'],
  ['を', 'お'],
  ['ん', 'ぬ'],
];

/**
 * O mesmo para o katakana — e é uma lista *diferente*, não a de cima deslocada.
 *
 * O katakana confunde por outro motivo: as formas são poucos traços retos, então
 * o que separa duas letras costuma ser o ângulo de um traço ou o ponto de onde
 * ele sai. シ e ツ têm exatamente os mesmos três traços e diferem só na direção;
 * ソ e ン, nos mesmos dois. São as duas piores do silabário e não têm equivalente
 * no hiragana, onde a confusão é de silhueta inteira.
 *
 * Por isso a lista é mais densa em torno de poucas famílias — os quatro traços de
 * ク/タ/ケ/ワ, a pilha horizontal de ニ/ミ, a caixa de コ/ロ/ユ — em vez de espalhada
 * como a do hiragana.
 */
const KATAKANA_CONFUSABLE_PAIRS: [string, string][] = [
  // As duas famosas: mesmos traços, direção trocada.
  ['シ', 'ツ'],
  ['ソ', 'ン'],
  ['シ', 'ソ'],
  ['ツ', 'ノ'],
  ['ソ', 'ノ'],
  ['ノ', 'ン'],
  // A família dos quatro traços em diagonal.
  ['ク', 'タ'],
  ['ク', 'ケ'],
  ['ク', 'ワ'],
  ['ケ', 'タ'],
  ['カ', 'ク'],
  ['カ', 'タ'],
  // ワ e vizinhas: a mesma caixa aberta com um traço a mais ou a menos.
  ['ワ', 'ウ'],
  ['ワ', 'ロ'],
  ['ワ', 'フ'],
  ['フ', 'ラ'],
  ['フ', 'ヲ'],
  ['ウ', 'ラ'],
  ['ラ', 'ヲ'],
  ['テ', 'ラ'],
  // Pilhas de traços horizontais, que só o número distingue.
  ['ニ', 'ミ'],
  ['ミ', 'シ'],
  ['ニ', 'コ'],
  // A caixa: コ com um traço a mais vira outra letra três vezes.
  ['コ', 'ユ'],
  ['コ', 'ロ'],
  ['コ', 'ヨ'],
  ['ユ', 'エ'],
  ['ヨ', 'ヲ'],
  // Cruzamentos — um traço vertical cortando horizontais.
  ['キ', 'サ'],
  ['キ', 'チ'],
  ['チ', 'テ'],
  ['チ', 'ナ'],
  ['ナ', 'オ'],
  ['ナ', 'メ'],
  // O par de diagonais que se cruzam.
  ['ス', 'ヌ'],
  ['ヌ', 'メ'],
  ['エ', 'ス'],
  // Ombro à esquerda, perna à direita.
  ['ア', 'マ'],
  ['マ', 'ム'],
  ['オ', 'ホ'],
  ['ネ', 'ホ'],
  ['セ', 'モ'],
  ['サ', 'セ'],
  // Curva única, que só o sentido separa.
  ['ル', 'レ'],
  ['イ', 'ノ'],
  ['イ', 'ト'],
];

/** As duas listas, para o construtor pegar a do silabário que está montando. */
const CONFUSABLE_PAIRS: Record<Script, [string, string][]> = {
  hiragana: HIRAGANA_CONFUSABLE_PAIRS,
  katakana: KATAKANA_CONFUSABLE_PAIRS,
};

/**
 * Grade do gojūon. `null` marca um buraco na linha (ゆ não tem forma em -i),
 * então o índice continua valendo como vogal.
 */
type Cell = [char: string, romaji: string] | null;

const GRID: Array<{ row: string; group: Group; cells: Cell[] }> = [
  { row: 'a', group: 'basic', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { row: 'ka', group: 'basic', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { row: 'sa', group: 'basic', cells: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { row: 'ta', group: 'basic', cells: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { row: 'na', group: 'basic', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { row: 'ha', group: 'basic', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { row: 'ma', group: 'basic', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { row: 'ya', group: 'basic', cells: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']] },
  { row: 'ra', group: 'basic', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { row: 'wa', group: 'basic', cells: [['わ', 'wa'], null, null, null, ['を', 'wo']] },
  { row: 'ga', group: 'dakuten', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { row: 'za', group: 'dakuten', cells: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { row: 'da', group: 'dakuten', cells: [['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do']] },
  { row: 'ba', group: 'dakuten', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { row: 'pa', group: 'handakuten', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
];

/** Yōon: consoante + ゃ/ゅ/ょ. Só as vogais a/u/o existem. */
const YOON: Array<[base: string, prefix: string]> = [
  ['き', 'ky'],
  ['し', 'sh'],
  ['ち', 'ch'],
  ['に', 'ny'],
  ['ひ', 'hy'],
  ['み', 'my'],
  ['り', 'ry'],
  ['ぎ', 'gy'],
  ['じ', 'j'],
  ['び', 'by'],
  ['ぴ', 'py'],
];

const SMALL_Y: Array<[small: string, vowel: Vowel]> = [
  ['ゃ', 'a'],
  ['ゅ', 'u'],
  ['ょ', 'o'],
];

function buildConfusableMap(pairs: [string, string][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = map.get(a) ?? [];
    if (!list.includes(b)) list.push(b);
    map.set(a, list);
  };
  for (const [a, b] of pairs) {
    add(a, b);
    add(b, a);
  }
  return map;
}

/**
 * Monta um silabário inteiro a partir da grade, que é sempre a do hiragana.
 *
 * `source` é o caractere da grade e `write()` o traduz para o silabário sendo
 * montado. Tudo que não é o desenho da letra — romaji, linha, vogal, grafias
 * aceitas — vem do `source` e é idêntico nos dois: ア se lê "a" tanto quanto あ,
 * e quem escreve "si" por シ merece o mesmo perdão que por し.
 */
function buildScript(script: Script): Kana[] {
  const write = script === 'hiragana' ? (char: string) => char : toKatakana;
  const confusables = buildConfusableMap(CONFUSABLE_PAIRS[script]);
  const out: Kana[] = [];

  const push = (source: string, rest: Omit<Kana, 'char' | 'accepts' | 'script' | 'confusable'>) => {
    const char = write(source);
    out.push({
      char,
      // Chaveado pelo caractere da grade: as grafias alternativas são do som, e
      // duplicá-las em katakana só criaria duas listas para manter em sincronia.
      accepts: ALTERNATES[source] ?? [],
      script,
      confusable: confusables.get(char) ?? [],
      ...rest,
    });
  };

  for (const { row, group, cells } of GRID) {
    cells.forEach((cell, i) => {
      if (!cell) return;
      const [source, romaji] = cell;
      push(source, { romaji, row, vowel: VOWELS[i], group });
    });
  }

  // ん não pertence a nenhuma linha e não tem vogal.
  push('ん', { romaji: 'n', row: 'n', vowel: null, group: 'basic' });

  // Yōon: kya/kyu/kyo etc. Confundem-se entre si dentro da mesma consoante
  // (きゃ vs きょ) e com a base sem o pequeno (きゃ vs き). Os confusáveis aqui
  // são estruturais, não de silhueta, então valem igual nos dois silabários —
  // e por isso saem de `write()` em vez das listas escritas à mão.
  for (const [base, prefix] of YOON) {
    for (const [small, vowel] of SMALL_Y) {
      const source = base + small;
      const siblings = SMALL_Y.filter(([s]) => s !== small).map(([s]) => write(base + s));
      out.push({
        char: write(source),
        romaji: `${prefix}${vowel}`,
        accepts: ALTERNATES[source] ?? [],
        row: `${prefix}a`,
        vowel,
        group: 'yoon',
        script,
        confusable: [...siblings, write(base)],
      });
    }
  }

  return out;
}

function buildKana(): Kana[] {
  return SCRIPTS.flatMap(buildScript);
}

export const ALL_KANA: Kana[] = buildKana();

export const KANA_BY_CHAR: Map<string, Kana> = new Map(ALL_KANA.map((k) => [k.char, k]));

/**
 * Ordem de introdução: a linha do gojūon, do jeito que qualquer livro ensina.
 * O SRS libera caracteres novos seguindo esta ordem.
 *
 * Os dois silabários vivem na mesma lista, um depois do outro. `poolFor` filtra
 * pelo silabário escolhido antes de usá-la, e filtrar preserva a ordem relativa —
 * então cada lado é lido como se o outro não estivesse aqui.
 */
export const INTRO_ORDER: string[] = ALL_KANA.filter((k) => k.group === 'basic').map((k) => k.char);

/**
 * Rótulos com exemplos em romaji, não em kana: o app não carrega fonte japonesa
 * (todo kana é desenhado a partir dos traços), então kana solto no texto da
 * interface viraria quadradinho num aparelho sem fonte instalada.
 */
export const GROUP_LABELS: Record<Group, string> = {
  basic: 'Básicos (46)',
  dakuten: 'Dakuten — ga, za, da, ba (20)',
  handakuten: 'Handakuten — pa (5)',
  yoon: 'Yōon — kya, shu, cho (33)',
};

/** Compara a resposta digitada com o romaji, aceitando as grafias alternativas. */
export function matchesRomaji(kana: Kana, answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === kana.romaji || kana.accepts.includes(normalized);
}
