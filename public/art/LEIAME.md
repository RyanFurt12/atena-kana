# Artes do app

Estas seis artes são **feitas para serem trocadas**. O app procura por elas pelo
nome exato e não faz mais nada. Nenhum código precisa ser tocado.

## Como trocar uma arte

Os originais moram em **`art-src/`** (na raiz do projeto), em PNG. Esta pasta tem
só os `.webp` servidos, gerados a partir de lá.

```bash
# 1. ponha o arquivo novo em art-src/, com o mesmo nome
# 2. converta
npm i -D playwright          # só na primeira vez
node scripts/optimize-art.mjs
```

`art-src/` fica fora de `public/`, então os originais pesados não vão para o
build. Não edite os `.webp` daqui à mão — eles são regerados.

## As seis peças

| arquivo | onde aparece | tamanho sugerido | fundo |
| --- | --- | --- | --- |
| `paper-light` | folha de fundo do app inteiro | 1200 × 2000 | opaco |
| `paper-dark` | idem, no modo noturno | 1200 × 2000 | opaco |
| `footer` | barra de Progresso / Ajustes na tela inicial | 1200 × 386 | pode desbotar no topo |
| `panel-training` | botão grande de 稽古 / Treino geral | 1200 × 640 | opaco |
| `blot` | mancha atrás do kanji de cada modo | 512 × 512 | **transparente** |
| `ensou` | círculo atrás do caractere em Ler e Lembrar | 800 × 800 | **transparente** |

## As regras de cada peça

### A folha (`paper-light`, `paper-dark`)

Cobre a tela inteira com `cover`, então **pode ser recortada nas bordas** —
deixe o assunto importante longe das beiradas. Proporção alta (retrato).

### O rodapé (`footer`)

**Nunca é recortado.** A imagem entra no fluxo e é ela que define a altura do
rodapé, então a arte manda na caixa e não o contrário.

- **Pode ter degradê para transparente no topo.** É o que faz a faixa desbotar
  sobre o papel. O arquivo atual fica transparente nos ~15% de cima.
- Os rótulos (記録 / 設定) são ancorados na parte de baixo. Deixe a faixa opaca
  alta o bastante para caber uns 70 px de texto na largura de um celular.
- **As ondas moram na parte de baixo do arquivo.** Se a sua arte não tiver nada
  ali, o rodapé fica só com a cor de fundo dela.
- Quanto mais alta a arte, mais alto o rodapé. É o seu controle direto.

### O painel de treino (`panel-training`)

A caixa é definida pelo texto dentro dela, então a imagem é **esticada** para
preencher (`100% 100%`), nunca recortada. Textura aguenta esticar; se você puser
uma pincelada com direção muito marcada, ela vai deformar um pouco.

### Formas de pincel (`blot`, `ensou`)

Estes **não** entram como imagem — entram como máscara. Só o canal alfa é usado e
a cor vem do tema.

- **Desenhe em preto sobre transparente.** A cor do arquivo é ignorada.
- **O alfa é a pintura.** Borda macia, falha de pincel seco, variação de carga —
  tudo isso sobrevive, porque está no alfa. Não é um recorte duro.
- **É por isso que funcionam nos dois temas.** A mesma pincelada sai escura no
  papel e clara no modo noturno, sem você fazer duas versões.
- Quadrado, centralizado, com uma folga de uns 5% nas bordas.

Se você preferir que alguma dessas duas seja imagem colorida em vez de máscara,
me avise — é uma linha em `src/components/InkArt.tsx`, mas aí precisa de duas
versões (clara e escura) de cada.

## Peso

O `optimize-art.mjs` cuida disso: os originais somam 3,3 MB em PNG e saem em
330 KB de WebP. Vale acompanhar mesmo assim — tudo isso é baixado de uma vez,
porque o PWA guarda em cache para funcionar offline. Se uma peça passar de
150 KB depois de convertida, baixe a qualidade dela no `QUALITY` do script.

As máscaras (`blot`, `ensou`) usam qualidade mais alta de propósito: nelas o que
importa é o degradê do alfa nas bordas, e artefato ali vira serrilha visível no
contorno da pincelada.

## Gerar artes de exemplo do zero

Se quiser recomeçar dos placeholders procedurais:

```bash
node scripts/build-artwork.mjs   # escreve PNGs em public/art/
```
