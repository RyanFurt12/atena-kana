/**
 * Converte as artes de `art-src/` para WebP em `public/art/`.
 *
 * `art-src/` guarda os originais e **não** vai para o build; `public/art/` tem só
 * o que é servido. Quando você trocar uma arte, ponha o arquivo novo em
 * `art-src/` e rode este script.
 *
 * WebP porque PNG comprime mal textura pintada: PNG é sem perdas e gasta bits
 * descrevendo cada grão de papel. WebP com perdas joga fora o que o olho não vê
 * e ainda guarda o canal alfa — que é o que as máscaras (blot, ensou) precisam.
 *
 * A reconversão também limpa metadados de brinde, porque o canvas exporta só os
 * pixels. Na prática isso economiza uns 100 bytes por arquivo; o ganho de
 * verdade é a compressão.
 *
 * Uso: npm i -D playwright && node scripts/optimize-art.mjs
 */

import { chromium } from 'playwright';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'art-src');
const OUT = resolve(ROOT, 'public/art');

/**
 * Qualidade por arquivo. As máscaras (blot, ensou) pedem mais, porque o que
 * importa nelas é o degradê do alfa nas bordas — artefato ali vira serrilha
 * visível no contorno da pincelada.
 */
const QUALITY = {
  'paper-light': 0.82,
  'paper-dark': 0.82,
  'panel-training': 0.85,
  footer: 0.88,
  blot: 0.92,
  ensou: 0.92,
};
const DEFAULT_QUALITY = 0.85;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await mkdir(OUT, { recursive: true });

const arquivos = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let antes = 0;
let depois = 0;

for (const arquivo of arquivos) {
  const nome = basename(arquivo, extname(arquivo));
  const origem = await readFile(resolve(SRC, arquivo));
  const quality = QUALITY[nome] ?? DEFAULT_QUALITY;

  const resultado = await page.evaluate(
    async ([base64, tipo, q]) => {
      const img = new Image();
      img.src = `data:${tipo};base64,${base64}`;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Amostra de pixels, para conferir que a cor não escorregou na conversão.
      const amostra = [];
      for (const [x, y] of [
        [1, 1],
        [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)],
        [canvas.width - 2, canvas.height - 2],
      ]) {
        amostra.push([...ctx.getImageData(x, y, 1, 1).data]);
      }

      return {
        dataUrl: canvas.toDataURL('image/webp', q),
        w: canvas.width,
        h: canvas.height,
        amostra,
      };
    },
    [origem.toString('base64'), 'image/png', quality],
  );

  const destino = Buffer.from(resultado.dataUrl.split(',')[1], 'base64');
  await writeFile(resolve(OUT, `${nome}.webp`), destino);

  antes += origem.length;
  depois += destino.length;
  const corte = (1 - destino.length / origem.length) * 100;
  console.log(
    `  ${nome.padEnd(16)} ${String(resultado.w + '×' + resultado.h).padEnd(11)} ` +
      `${kb(origem.length).padStart(8)} → ${kb(destino.length).padStart(8)}  (−${corte.toFixed(0)}%, q=${quality})`,
  );
}

await browser.close();
console.log(`\ntotal: ${kb(antes)} → ${kb(depois)} (−${((1 - depois / antes) * 100).toFixed(0)}%)`);
