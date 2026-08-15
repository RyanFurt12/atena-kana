/**
 * Tabela de hiragana.
 *
 * Montada a partir de uma grade compacta em vez de 104 objetos escritos à mão:
 * a posição na linha do gojūon já define a vogal, então `row` e `vowel` saem de
 * graça e não dá para errar digitando.
 *
 * Romaji em Hepburn (shi, chi, tsu, fu). `accepts` guarda as grafias alternativas
 * que também são aceitas quando ela digita, para não reprovar quem escreve "si".
 */

export type Group = 'basic' | 'dakuten' | 'handakuten' | 'yoon';
export type Vowel = 'a' | 'i' | 'u' | 'e' | 'o';

export type Kana = {
  char: string;
  romaji: string;
  accepts: string[];
  row: string;
  vowel: Vowel | null;
  group: Group;
  /** Caracteres visualmente parecidos — a fonte dos bons distratores. */
  confusable: string[];
};

const VOWELS: Vowel[] = ['a', 'i', 'u', 'e', 'o'];

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
const CONFUSABLE_PAIRS: [string, string][] = [
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

function buildConfusableMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = map.get(a) ?? [];
    if (!list.includes(b)) list.push(b);
    map.set(a, list);
  };
  for (const [a, b] of CONFUSABLE_PAIRS) {
    add(a, b);
    add(b, a);
  }
  return map;
}

function buildKana(): Kana[] {
  const confusables = buildConfusableMap();
  const out: Kana[] = [];

  for (const { row, group, cells } of GRID) {
    cells.forEach((cell, i) => {
      if (!cell) return;
      const [char, romaji] = cell;
      out.push({
        char,
        romaji,
        accepts: ALTERNATES[char] ?? [],
        row,
        vowel: VOWELS[i],
        group,
        confusable: confusables.get(char) ?? [],
      });
    });
  }

  // ん não pertence a nenhuma linha e não tem vogal.
  out.push({
    char: 'ん',
    romaji: 'n',
    accepts: ALTERNATES['ん'],
    row: 'n',
    vowel: null,
    group: 'basic',
    confusable: confusables.get('ん') ?? [],
  });

  // Yōon: kya/kyu/kyo etc. Confundem-se entre si dentro da mesma consoante
  // (きゃ vs きょ) e com a base sem o pequeno (きゃ vs き).
  for (const [base, prefix] of YOON) {
    for (const [small, vowel] of SMALL_Y) {
      const char = base + small;
      const romaji = `${prefix}${vowel}`;
      const siblings = SMALL_Y.filter(([s]) => s !== small).map(([s]) => base + s);
      out.push({
        char,
        romaji,
        accepts: ALTERNATES[char] ?? [],
        row: `${prefix}a`,
        vowel,
        group: 'yoon',
        confusable: [...siblings, base],
      });
    }
  }

  return out;
}

export const ALL_KANA: Kana[] = buildKana();

export const KANA_BY_CHAR: Map<string, Kana> = new Map(ALL_KANA.map((k) => [k.char, k]));

/**
 * Ordem de introdução: a linha do gojūon, do jeito que qualquer livro ensina.
 * O SRS libera caracteres novos seguindo esta ordem.
 */
export const INTRO_ORDER: string[] = ALL_KANA.filter((k) => k.group === 'basic').map((k) => k.char);

/**
 * Rótulos com exemplos em romaji, não em kana: o app não carrega fonte japonesa
 * (todo hiragana é desenhado a partir dos traços), então kana solto no texto da
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
