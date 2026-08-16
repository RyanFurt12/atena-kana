/**
 * Molduras e círculos com borda de tinta, não de CSS.
 *
 * Uma `border` de navegador é matematicamente reta, e ao lado de traços de
 * pincel isso denuncia a página web. Aqui a borda é um path SVG passado por um
 * deslocamento de ruído: a linha ganha a hesitação de quem desenhou o quadro a
 * mão, sem virar rabisco.
 *
 * O filtro é declarado uma vez em `InkFilterDefs`, montado na raiz do app — se
 * cada moldura trouxesse o seu, seriam dezenas de feTurbulence na página.
 */

/** Monte uma vez, na raiz. Não desenha nada. */
export function InkFilterDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        {/* Ruído de onda longa e amplitude curta: a linha ondula como mão firme.
            Frequência alta com amplitude grande dava borda rasgada, não desenhada. */}
        <filter id="ink-edge" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.017" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Um pouco mais solto, para os traços longos das guias. */}
        <filter id="ink-edge-soft" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/*
          Pincel seco: recorta a forma por uma máscara de ruído, para o
          preenchimento ganhar densidade irregular em vez de cor chapada. É o que
          separa uma aguada de um bloco de cor — e era o "sólido demais" das
          montanhas e do bambu.
        */}
        <filter id="dry-brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="11" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0.9 0.5 0 0 0.42"
            result="mottle"
          />
          <feComposite in="SourceGraphic" in2="mottle" operator="in" result="dry" />
          <feGaussianBlur in="dry" stdDeviation="0.35" />
        </filter>

        {/*
          Sangria de tinta no papel: desloca a borda do traço com ruído miúdo e
          borra meio pixel. O traço deixa de ter recorte vetorial e passa a
          parecer absorvido pela fibra — sem perder legibilidade.
        */}
        <filter id="ink-bleed" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="5" result="fibra" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="fibra"
            scale="0.9"
            xChannelSelector="R"
            yChannelSelector="G"
            result="deslocado"
          />
          <feGaussianBlur in="deslocado" stdDeviation="0.22" />
        </filter>
      </defs>
    </svg>
  );
}

type FrameProps = {
  /** Cor do traço. Aceita qualquer token. */
  color?: string;
  /**
   * Espessura em pixels de tela — `non-scaling-stroke` mantém uniforme,
   * independente do tamanho da caixa.
   */
  width?: number;
  /** Preenchimento interno, para a moldura também servir de fundo. */
  fill?: string;
  className?: string;
};

/**
 * Moldura retangular. O pai precisa ser `relative`; isto se encaixa atrás do
 * conteúdo e substitui a `border` do CSS.
 *
 * `preserveAspectRatio="none"` estica o path para o tamanho da caixa e
 * `vector-effect` mantém a espessura uniforme — o ruído estica junto, o que dá
 * variação de mão em vez de um padrão repetido.
 */
export function RoughFrame({ color = 'var(--rule)', width = 2, fill = 'none', className = '' }: FrameProps) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        x="1.2"
        y="1.2"
        width="97.6"
        height="97.6"
        fill={fill}
        stroke={color}
        strokeWidth={width}
        vectorEffect="non-scaling-stroke"
        filter="url(#ink-edge)"
      />
    </svg>
  );
}

/** Círculo de tinta — os medalhões dos modos. */
export function RoughCircle({ color = 'var(--ink)', className = '' }: { color?: string; className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="47" fill={color} filter="url(#ink-edge)" />
    </svg>
  );
}

/**
 * Seta de voltar desenhada a pincel — o "‹" tipográfico fica fino e pequeno
 * demais ao lado dos traços, e some numa tela cheia de tinta.
 */
export function BackArrow({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M15.5 3.5 C 11 7.5, 8 10.5, 7 12 C 8 13.5, 11 16.5, 15.5 20.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ink-edge-soft)"
      />
    </svg>
  );
}

/** Ponto de tinta, para a régua de progresso da sessão. */
export function InkDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-2.5 w-2.5" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r={filled ? 42 : 36}
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={16}
        filter="url(#ink-edge)"
      />
    </svg>
  );
}
