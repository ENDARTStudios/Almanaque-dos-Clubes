# Almanaque dos Clubes — identidade visual

## Conceito

O símbolo reúne duas ideias:

- **o livro-escudo** — duas páginas planas formam o corpo e a ponta do escudo; as iniciais
  A e C assinam a capa: o almanaque, a memória, o arquivo de clubes, títulos e histórias;
- **a bola** — o futebol, o jogo, o presente que mantém essa memória viva. Ela se encaixa
  no V do livro e coroa o brasão.

A bola não é um ícone genérico: é a projeção ortográfica de um **icosaedro truncado**
(12 pentágonos e 20 hexágonos), o mesmo sólido que dá forma a uma bola de futebol.
O contorno é o das próprias páginas, em fio de ouro; a bola é cortada pelo V e vira o topo
do escudo. As iniciais A e C, também em ouro, marcam a capa. A leitura é imediata mesmo a
32 px: bola no topo, livro em V no centro e ponta de escudo embaixo.

## Construção

- **Silhueta:** duas páginas planas, com topo em V e ponta central. A bola se encaixa no V
  e é cortada pelas páginas; o contorno do livro é o contorno do escudo, sem anel.
- **Livro:** página esquerda e direita separadas por um vinco em cunha. Sem espessura: a
  geometria foi reduzida ao essencial para continuar legível no tamanho pequeno.
- **Capa:** fio de ouro no contorno das páginas e as iniciais **A** e **C** em Barlow
  Condensed Bold, em perspectiva, uma em cada página.
- **Grade:** símbolo em eixo vertical, com a bola apoiada no vinco; wordmark centralizado
  no mesmo eixo.
- **Contraste:** duas cores (carvão e papel) e um acento (carmim). O carmim é reservado à
  bola; o ouro aparece no contorno da capa, nas iniciais A/C e na linha "DOS CLUBES".
- **Tipografia:** Barlow Condensed Bold no wordmark, SemiBold na linha de apoio.
  A condensada grotesca é a mesma família dos títulos do site; em caixa-alta e com
  tracking fechado, ganha o tom de almanaque esportivo sem virar display decorativo.
- **Escala:** o lockup stacked foi desenhado em 1600 × 1000; a versão horizontal em
  1600 × 600; o símbolo em 800 × 800; o ícone em 1024 × 1024.

## Paleta

| Papel | Hex | Uso |
|---|---|---|
| Carvão | `#12100F` | fundo escuro, texto sobre papel, páginas na versão clara |
| Papel | `#FAF8F5` | fundo claro, páginas na versão escura, painéis |
| Carmim | `#BE123C` | bola, acento principal |
| Ouro | `#C9A227` | contorno da capa, iniciais A/C e linha de apoio; sobre papel, `#94600A` |

O carmim e o ouro são os tokens `--color-primary` e `--color-secondary` do design
system do site; o carvão e o papel são os extremos da camada editorial.

## Tipografia

- **Barlow Condensed Bold** — wordmark `ALMANAQUE`, caixa-alta, tracking óptico.
- **Barlow Condensed SemiBold** — `DOS CLUBES`, caixa-alta, tracking aberto (≈ 0,48 em).
- **Barlow Regular / SemiBold** — textos de apoio, legendas e apresentação.

## Arquivos

| Arquivo | Dimensão | Uso |
|---|---|---|
| `logo-principal-fundo-escuro.png` | 1600 × 1000 | apresentação da assinatura sobre carvão |
| `logo-principal-fundo-escuro-transparente.png` | 1012 × 789 | aplicação sobre fundo escuro |
| `logo-principal-fundo-escuro.svg` | vetor | mestre, sem fundo, texto em curvas |
| `logo-principal-fundo-claro.png` | 1600 × 1000 | apresentação da assinatura sobre papel |
| `logo-principal-fundo-claro-transparente.png` | 1012 × 789 | aplicação sobre fundo claro |
| `logo-principal-fundo-claro.svg` | vetor | mestre, sem fundo, texto em curvas |
| `logo-horizontal-fundo-escuro.png` / `.svg` | 1600 × 600 | cabeçalho e faixas sobre carvão |
| `logo-horizontal-fundo-claro.png` / `.svg` | 1600 × 600 | cabeçalho e faixas sobre papel |
| `simbolo-fundo-escuro.png` / `.svg` | 800 × 800 | símbolo isolado para fundo escuro |
| `simbolo-fundo-claro.png` / `.svg` | 800 × 800 | símbolo isolado para fundo claro |
| `icone-1024.png` / `.svg` | 1024 × 1024 | ícone de app / favicon / avatar |
| `brand-board.png` / `.svg` | 1920 × 1200 | prancha de apresentação |
| `almanaque-logo.vectorcraft` | — | fonte editável no VectorCraft Desktop |

## Uso

- **Área de respiro:** mantenha ao redor do lockup, no mínimo, a altura da letra `D`
  de `DOS CLUBES`. No símbolo isolado, use 1/4 da altura total.
- **Tamanhos mínimos:** símbolo 32 px; lockup horizontal 200 px de largura; stacked
  180 px de largura. Abaixo disso, use o símbolo.
- **Fundos:** `fundo-escuro` sobre carvão, fotografia escura ou cores com luminosidade
  baixa; `fundo-claro` sobre papel, branco e superfícies claras. Não use a versão de
  fundo escuro sobre fundo claro (o wordmark em papel desaparece).
- **Não:** esticar, rotacionar, aplicar sombra/brilho/gradiente, trocar a fonte do
  wordmark, separar a bola do escudo, redesenhar o padrão da bola com hexágonos
  genéricos ou colorir a bola com outra cor que não o carmim.

## Nota de produção

Os arquivos foram desenhados no **VectorCraft Desktop 0.13.1**, com o documento
`almanaque-logo.vectorcraft` organizado em camadas (Fundo, Símbolo, Logotipo). O símbolo
está em objetos separados: bola, costuras, páginas, contorno dourado, iniciais e wordmark.
As iniciais foram convertidas em contornos para preservar a perspectiva; cor, escala e
posição continuam editáveis como objetos independentes. Os SVGs foram exportados com o
texto em curvas para não depender da instalação da Barlow Condensed; o `.vectorcraft`
mantém o wordmark vivo para edição.





