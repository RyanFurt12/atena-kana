/**
 * Baixa os dados de traço do KanjiVG e gera src/data/strokes.json.
 *
 * Roda uma vez (`npm run build:strokes`), não em runtime — o JSON vai versionado
 * no repo para o app funcionar 100% offline.
 *
 * O KanjiVG guarda cada traço como um path de LINHA CENTRAL (não contorno) em um
 * viewBox 109×109, numerado na ordem correta de escrita. É exatamente o formato
 * que a validação de traço precisa: dá para amostrar pontos ao longo do path e
 * comparar com o que a pessoa desenhou.
 *
 * Fonte: https://github.com/KanjiVG/kanjivg — licença CC BY-SA 3.0. Ver NOTICE.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/strokes.json');
const OUT_KANJI = resolve(ROOT, 'src/data/ui-kanji.json');
const CDN = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji';

/**
 * Kanji que aparecem na *interface*, não nos exercícios: os medalhões dos modos,
 * o título do treino e os itens do rodapé. Vêm da mesma fonte que o hiragana
 * porque o app não carrega fonte japonesa nenhuma — em um aparelho sem fonte
 * japonesa instalada, 稽古 escrito como texto viraria dois quadradinhos.
 *
 * Ficam num arquivo separado de propósito: `strokes.json` alimenta a validação de
 * traço dos exercícios, e kanji não podem vazar para lá.
 */
const UI_KANJI = [
  '読', // ler
  '覚', // lembrar
  '書', // escrever
  '白', // branco (folha em branco)
  '紙', // papel
  '稽', // 稽古 — treino
  '古',
  '記', // 記録 — registro/progresso
  '録',
  '設', // 設定 — ajustes
  '定',
];

/**
 * Contagens conhecidas, para o script falhar alto se o KanjiVG mudar de forma.
 *
 * Os pares hiragana/katakana da mesma sílaba servem de dobradiça: ぱ tem 4 traços
 * e パ tem 3, ゃ tem 3 e ャ tem 2. Se algum dia os dois lados baterem, é sinal de
 * que a faixa do katakana veio errada — provavelmente repetindo o hiragana.
 */
const EXPECTED = {
  あ: 3, ん: 1, が: 5, ぱ: 4, ゃ: 3, き: 4, ほ: 4,
  ア: 2, ン: 2, ガ: 4, パ: 3, ャ: 2, キ: 3, ホ: 4,
};

/** あ (U+3042) vira "03042.svg": codepoint em hex minúsculo, 5 dígitos. */
function svgName(char) {
  return `${char.codePointAt(0).toString(16).padStart(5, '0')}.svg`;
}

/**
 * Extrai os `d=` na ordem dos traços.
 *
 * Os ids são `kvg:03042-s1`, `-s2`… mas a ordem no arquivo nem sempre é a
 * numérica quando o caractere tem grupos aninhados, então ordenamos pelo número
 * do sufixo em vez de confiar na ordem do documento.
 */
function extractStrokes(svg) {
  const re = /<path\s+id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"/g;
  const found = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    found.push({ n: Number(m[1]), d: m[2] });
  }
  found.sort((a, b) => a.n - b.n);
  return found.map((s) => s.d);
}

async function fetchStrokes(char) {
  const url = `${CDN}/${svgName(char)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${char}: HTTP ${res.status} em ${url}`);
  const strokes = extractStrokes(await res.text());
  if (strokes.length === 0) throw new Error(`${char}: nenhum traço encontrado em ${url}`);
  return strokes;
}

async function main() {
  // ぁ (U+3041) até ん (U+3093) cobre tudo que o app usa em hiragana: os 46
  // básicos, dakuten, handakuten e os pequenos ゃゅょっ. Yōon são dois caracteres
  // (きゃ = き + ゃ), então guardamos cada componente separado e o app desenha um
  // depois do outro.
  //
  // ァ (U+30A1) até ヺ (U+30FA) é a mesma faixa em katakana, deslocada de 0x60 —
  // a correspondência de codepoint é exata do ぁ ao ん, e é dela que
  // `data/kana.ts` deriva a tabela inteira do katakana. ー (U+30FC) fica de fora
  // de propósito: é marca de alongamento, não uma letra do gojūon.
  const simple = [];
  for (let cp = 0x3041; cp <= 0x3093; cp++) simple.push(String.fromCodePoint(cp));
  for (let cp = 0x30a1; cp <= 0x30fa; cp++) simple.push(String.fromCodePoint(cp));

  console.log(`Baixando ${simple.length} caracteres do KanjiVG…`);

  const data = {};
  const failures = [];
  for (const char of simple) {
    try {
      data[char] = await fetchStrokes(char);
    } catch (err) {
      failures.push(err.message);
    }
  }

  // Confere as contagens conhecidas antes de gravar.
  const mismatches = Object.entries(EXPECTED)
    .filter(([char, n]) => data[char]?.length !== n)
    .map(([char, n]) => `${char}: esperado ${n}, veio ${data[char]?.length ?? 'nada'}`);

  if (failures.length) console.error(`\nFalhas:\n  ${failures.join('\n  ')}`);
  if (mismatches.length) {
    console.error(`\nContagem de traços não confere:\n  ${mismatches.join('\n  ')}`);
    process.exit(1);
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 0) + '\n');

  const counts = Object.entries(data)
    .map(([char, s]) => `${char}=${s.length}`)
    .join(' ');
  console.log(`\n${Object.keys(data).length} caracteres gravados em ${OUT}`);
  console.log(counts);

  console.log(`\nBaixando ${UI_KANJI.length} kanji da interface…`);
  const kanji = {};
  for (const char of UI_KANJI) {
    kanji[char] = await fetchStrokes(char);
  }
  await writeFile(OUT_KANJI, JSON.stringify(kanji, null, 0) + '\n');
  console.log(`${Object.keys(kanji).length} kanji gravados em ${OUT_KANJI}`);
  console.log(
    Object.entries(kanji)
      .map(([char, s]) => `${char}=${s.length}`)
      .join(' '),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
