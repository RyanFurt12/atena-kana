/**
 * As artes, num lugar só.
 *
 * Cada peça é um arquivo de nome fixo em `public/art/`, em WebP. O app não faz
 * mais nada além de apontar para eles.
 *
 * Os originais ficam em `art-src/`, fora de `public/`, e portanto fora do build:
 * troque o arquivo lá e rode `node scripts/optimize-art.mjs`. As especificações
 * de cada peça estão em `public/art/LEIAME.md`.
 *
 * `BASE_URL` entra no caminho porque o app pode ser servido de um subdiretório
 * (GitHub Pages), onde `/art/…` apontaria para o lugar errado.
 */

const base = import.meta.env.BASE_URL;

export const ART = {
  /** Folha de fundo do app inteiro. */
  paperLight: `${base}art/paper-light.webp`,
  paperDark: `${base}art/paper-dark.webp`,
  /** Faixa do rodapé da tela inicial. */
  footer: `${base}art/footer.webp`,
  /** Fundo do botão de treino geral (稽古). */
  panelTraining: `${base}art/panel-training.webp`,

  /*
   * As duas formas abaixo entram como MÁSCARA, não como imagem: só o canal alfa
   * é usado e a cor vem do tema. É o que deixa a mesma pincelada funcionar no
   * papel e no modo noturno — e o alfa preserva a textura do pincel seco, então
   * não se perde nada da pintura.
   */
  /** Mancha atrás do kanji de cada modo. */
  blot: `${base}art/blot.webp`,
  /** 円相 — o círculo, atrás do caractere nos dois exercícios de escolha. */
  ensou: `${base}art/ensou.webp`,
} as const;

/** Estilo de máscara: a forma vem do PNG, a cor vem do token. */
export function maskStyle(src: string, color: string): React.CSSProperties {
  return {
    backgroundColor: color,
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };
}
