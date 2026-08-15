/**
 * Os enfeites de tinta: montanha com sol, bambu, faixa de ondas, círculo ensō e
 * selo hanko.
 *
 * Desenhados em SVG e não importados como imagem — assim pesam quilobytes em vez
 * de megabytes, acompanham o tema (a mesma montanha funciona no papel e no
 * escuro, porque a cor vem dos tokens) e não estouram o orçamento do PWA
 * offline. São mais sóbrios que uma pintura sumi-ê de verdade; a ideia é
 * ambientar o canto da folha, não competir com o caractere no centro.
 */

type DecoProps = {
  className?: string;
  /** Opacidade base — todo enfeite é fundo, nunca conteúdo. */
  opacity?: number;
};

/** Montanhas em camadas com o sol nascente. Canto superior esquerdo. */
export function MountainSun({ className, opacity = 0.5 }: DecoProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMinYMin meet"
    >
      <defs>
        {/* Um borrão de meio pixel: sem isso a silhueta fica com cara de vetor
            recortado, e o que se quer é a borda molhada da aguada. */}
        <filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>
      <circle cx="132" cy="34" r="17" fill="var(--seal)" opacity={opacity * 1.4} />
      <g filter="url(#wash)">
        {/* Cume distante, mais claro — a profundidade vem da opacidade. */}
        <path
          d="M0 96 C 22 74, 34 58, 52 40 C 66 26, 78 30, 90 44 C 104 60, 118 78, 138 96 Z"
          fill="var(--ink)"
          opacity={opacity * 0.28}
        />
        <path
          d="M0 104 C 18 88, 30 76, 44 62 C 55 51, 64 54, 73 66 C 86 82, 98 94, 116 104 Z"
          fill="var(--ink)"
          opacity={opacity * 0.5}
        />
        <path
          d="M0 112 C 14 102, 24 94, 36 84 C 45 77, 52 79, 60 88 C 70 99, 82 106, 96 112 Z"
          fill="var(--ink)"
          opacity={opacity * 0.75}
        />
      </g>
    </svg>
  );
}

/** Bambu: colmos com nós e folhas. Canto superior direito. */
export function Bamboo({ className, opacity = 0.42 }: DecoProps) {
  const leaf = (d: string, o: number) => <path d={d} fill="var(--ink)" opacity={opacity * o} />;

  return (
    <svg viewBox="0 0 120 160" className={className} fill="none" aria-hidden="true">
      <g stroke="var(--ink)" strokeWidth="3.4" opacity={opacity} strokeLinecap="round">
        <path d="M78 0 C 80 34, 79 70, 74 118" />
        <path d="M99 6 C 102 40, 101 80, 96 132" />
        {/* Nós do colmo. */}
        <path d="M77 32 h7 M76 64 h7 M75 96 h7" strokeWidth="2.4" />
        <path d="M100 40 h7 M99 76 h7 M98 112 h7" strokeWidth="2.4" />
      </g>
      {leaf('M78 24 C 60 14, 42 12, 26 18 C 44 26, 62 30, 78 24 Z', 0.85)}
      {leaf('M78 46 C 62 44, 46 50, 34 62 C 52 62, 68 56, 78 46 Z', 0.7)}
      {leaf('M99 30 C 108 16, 116 8, 120 4 C 112 18, 106 26, 99 30 Z', 0.6)}
      {leaf('M76 78 C 58 76, 44 84, 34 96 C 52 96, 68 90, 76 78 Z', 0.55)}
      {leaf('M97 92 C 106 82, 114 78, 119 76 C 112 88, 104 94, 97 92 Z', 0.5)}
    </svg>
  );
}

/**
 * 青海波 (seigaiha), o padrão de ondas concêntricas. Vira faixa no rodapé.
 * Um `<pattern>` para não repetir dezenas de arcos no DOM.
 */
export function SeigaihaBand({ className, opacity = 0.3 }: DecoProps) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 120 24">
      <defs>
        <pattern id="seigaiha" width="24" height="12" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity}>
            <path d="M-12 12 a12 12 0 0 1 24 0" />
            <path d="M-12 12 a8 8 0 0 1 16 0" />
            <path d="M-12 12 a4 4 0 0 1 8 0" />
            <path d="M12 12 a12 12 0 0 1 24 0" />
            <path d="M12 12 a8 8 0 0 1 16 0" />
            <path d="M12 12 a4 4 0 0 1 8 0" />
            <path d="M0 24 a12 12 0 0 1 24 0" />
            <path d="M0 24 a8 8 0 0 1 16 0" />
            <path d="M0 24 a4 4 0 0 1 8 0" />
          </g>
        </pattern>
      </defs>
      <rect width="120" height="24" fill="url(#seigaiha)" />
    </svg>
  );
}

/**
 * 円相 (ensō), o círculo de um traço só. Emoldura o caractere na tela de leitura.
 * A abertura no traço é proposital — o ensō nunca fecha.
 */
export function Ensou({ className, opacity = 0.16 }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <defs>
        {/* Borrado de propósito: um anel nítido compete com o caractere; um anel
            macio fica atrás dele, que é o lugar do ensō. */}
        <filter id="ensou-wash" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
      <path
        d="M62 12 C 30 6, 8 30, 10 56 C 12 82, 40 96, 64 90 C 88 84, 96 58, 88 36 C 82 20, 68 11, 55 10"
        stroke="var(--ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity={opacity}
        filter="url(#ensou-wash)"
      />
    </svg>
  );
}

/** Flor de sakura, para marcar linha de texto. */
export function Sakura({ className, opacity = 1 }: DecoProps) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g opacity={opacity} fill="var(--seal)">
        {petals.map((angle) => (
          <ellipse key={angle} cx="12" cy="6.5" rx="3.1" ry="5" transform={`rotate(${angle} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="1.7" fill="var(--surface)" />
      </g>
    </svg>
  );
}
