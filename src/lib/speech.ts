/**
 * Pronúncia via SpeechSynthesis do próprio sistema.
 *
 * Sem arquivo de áudio e sem serviço: se o aparelho tem voz japonesa, ela ouve;
 * se não tem, o app segue calado. Nunca é a única fonte de informação, então
 * falhar em silêncio é o comportamento certo.
 */

let japaneseVoice: SpeechSynthesisVoice | null | undefined;

function findVoice(): SpeechSynthesisVoice | null {
  if (japaneseVoice !== undefined) return japaneseVoice;
  if (typeof speechSynthesis === 'undefined') return (japaneseVoice = null);

  const voices = speechSynthesis.getVoices();
  // A lista chega vazia no primeiro acesso em alguns navegadores; nesse caso não
  // guardamos o resultado, para tentar de novo na próxima vez.
  if (voices.length === 0) return null;

  japaneseVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ?? null;
  return japaneseVoice;
}

export function speakKana(char: string): void {
  const voice = findVoice();
  if (!voice) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(char);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

/** Há voz japonesa instalada? Usado para não oferecer um ajuste que não faz nada. */
export function hasJapaneseVoice(): boolean {
  return findVoice() !== null;
}
