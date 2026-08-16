/**
 * Gera as artes em PNG de `public/art/`, renderizando no Chrome.
 *
 * São arquivos de nome fixo, feitos para serem SUBSTITUÍDOS: o app procura por
 * eles e nada mais. Trocar `paper-light.png` por uma pintura sua muda o fundo do
 * app inteiro sem tocar em uma linha de código.
 *
 * O que este script produz é um ponto de partida — a mesma textura procedural
 * que o app tinha em SVG, agora achatada em imagem. Ver `public/art/LEIAME.md`
 * para as especificações de cada peça.
 *
 * Uso: node scripts/build-artwork.mjs   (precisa de `npx playwright` disponível)
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/art');

/** Ruído fractal como data URI, do mesmo jeito que o CSS fazia. */
const noise = (freq, octaves, size) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='${size}' height='${size}' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** Folha de papel: cor de base, mancha larga, fibra miúda e vinheta. */
const paper = (base, edge, mottle, grain) => `
  <div style="position:absolute;inset:0;background:${base}"></div>
  <div style="position:absolute;inset:0;opacity:${mottle};mix-blend-mode:multiply;
    background-image:radial-gradient(120% 90% at 50% 38%, transparent 52%, ${edge} 100%), ${noise(0.011, 3, 420)};
    background-size:100% 100%, 420px 420px"></div>
  <div style="position:absolute;inset:0;opacity:${grain};mix-blend-mode:overlay;
    background-image:${noise(0.85, 4, 180)}"></div>`;

/** Faixa 青海波 repetida, para o rodapé. */
const seigaiha = (opacity) => `
  <svg style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none" viewBox="0 0 480 120">
    <defs><pattern id="s" width="24" height="12" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#dfe6f0" stroke-width="1" opacity="${opacity}">
        <path d="M-12 12 a12 12 0 0 1 24 0"/><path d="M-12 12 a8 8 0 0 1 16 0"/><path d="M-12 12 a4 4 0 0 1 8 0"/>
        <path d="M12 12 a12 12 0 0 1 24 0"/><path d="M12 12 a8 8 0 0 1 16 0"/><path d="M12 12 a4 4 0 0 1 8 0"/>
        <path d="M0 24 a12 12 0 0 1 24 0"/><path d="M0 24 a8 8 0 0 1 16 0"/><path d="M0 24 a4 4 0 0 1 8 0"/>
      </g></pattern></defs>
    <rect width="480" height="120" fill="url(#s)"/>
  </svg>`;

/**
 * As duas formas são usadas como MÁSCARA no app: só o canal alfa importa, a cor
 * vem do tema. Por isso saem em preto sobre transparente — assim a textura da
 * pincelada (bordas macias, falhas de pincel seco) sobrevive na máscara.
 */
const brushShape = (inner) => `
  <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100">
    <defs>
      <filter id="dry" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="11" result="n"/>
        <feColorMatrix in="n" type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.5 0 0 0.5" result="m"/>
        <feComposite in="SourceGraphic" in2="m" operator="in" result="d"/>
        <feGaussianBlur in="d" stdDeviation="0.4"/>
      </filter>
    </defs>
    ${inner}
  </svg>`;

const ASSETS = [
  {
    file: 'paper-light.png',
    width: 1200,
    height: 2000,
    body: paper('#ece0c8', '#b39a6e', 0.16, 0.05),
  },
  {
    file: 'paper-dark.png',
    width: 1200,
    height: 2000,
    body: paper('#16171c', '#000000', 0.24, 0.07),
  },
  {
    file: 'footer.png',
    width: 1200,
    height: 360,
    body: `${paper('#1e3050', '#0b1526', 0.3, 0.06)}
      <div style="position:absolute;left:0;right:0;bottom:0;height:33%">${seigaiha(0.5)}</div>`,
  },
  {
    file: 'panel-training.png',
    width: 1200,
    height: 640,
    body: paper('#1e3050', '#0b1526', 0.28, 0.06),
  },
  {
    file: 'blot.png',
    width: 512,
    height: 512,
    transparent: true,
    body: brushShape('<circle cx="50" cy="50" r="46" fill="#000" filter="url(#dry)"/>'),
  },
  {
    file: 'ensou.png',
    width: 800,
    height: 800,
    transparent: true,
    body: brushShape(
      `<path d="M62 12 C 30 6, 8 30, 10 56 C 12 82, 40 96, 64 90 C 88 84, 96 58, 88 36 C 82 20, 68 11, 55 10"
         fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" filter="url(#dry)"/>`,
    ),
  },
];

const browser = await chromium.launch({ channel: 'chrome' });
await mkdir(OUT, { recursive: true });

for (const asset of ASSETS) {
  const page = await browser.newPage({
    viewport: { width: asset.width, height: asset.height },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>
     <div style="position:relative;width:${asset.width}px;height:${asset.height}px">${asset.body}</div>`,
  );
  await page.screenshot({ path: `${OUT}/${asset.file}`, omitBackground: !!asset.transparent });
  await page.close();
  console.log(`  ${asset.file} (${asset.width}×${asset.height})`);
}

await browser.close();
await writeFile(`${OUT}/.gitkeep`, '');
console.log(`\n${ASSETS.length} artes em ${OUT}`);
