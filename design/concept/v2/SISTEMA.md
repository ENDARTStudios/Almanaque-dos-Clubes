# Sistema visual FICHA — Almanaque dos Clubes

> Conceito geral da plataforma. **Cores e fontes são as já estabelecidas** em
> `apps/web/src/app/globals.css`: Barlow Condensed, Barlow, crimson `#be123c`, ocre `#94600a`,
> papel `#faf8f5` e a superfície escura do `.theme-dark` (`#12100f` / `#e8412f` / `#c9a227`).
> Nenhum token novo foi inventado. Nada de serifa — a fonte do projeto é condensada.

As telas em `design/concept/v2/*.png` são renderizações reais do FigCraft a partir de
`design/concept/ficha.py` (10 páginas, 1.009 camadas, 1440 px de largura, geometria validada).

---

## 1. O conceito

**Toda página do Almanaque é uma ficha.**

Um almanaque é um livro de fichas: cada verbete abre com um cabeçalho que diz o que é, quanto é e
de onde veio, e depois entrega o corpo. O produto herda essa estrutura — e é ela que faz 10 páginas
muito diferentes parecerem **um só sistema**.

### A espinha (idêntica em todas as páginas)

```
┌─ kicker ......... Barlow 600 · 10 px · caixa alta · tracking +2,2 · ink-3
├─ título ......... Barlow Condensed 700 · 52–68 px · tracking −0,5
├─ número-âncora .. Barlow Condensed 700 · 76 px · crimson · alinhado à direita
├─ subtítulo ...... Barlow 400 · 15 px · ink-2 · largura ≤ 760
├─ FIO ............ 2 px · ink  ← a única profundidade do sistema
├─ CORPO .......... varia por página (ver §4)
└─ procedência .... 1 px border + Barlow 400 11 px ink-3
```

O que muda entre páginas é **só o corpo**. O cabeçalho, o fio e a procedência nunca mudam.

---

## 2. Tipografia — três papéis, nenhum decorativo

| Papel | Fonte | Escala | Uso |
|---|---|---|---|
| **Display** | Barlow Condensed 700 | 26 / 34 / 52 / 68 / 120 | títulos, números-âncora, placar |
| **Texto** | Barlow 400 | 11 / 12 / 13 / 15 | corpo, células, legendas |
| **Rótulo** | Barlow 600 | 9 / 10 / 11 · caixa alta · tracking 1,6–2,2 | kicker, cabeçalho de coluna, metadado |

Duas regras que fazem a diferença:

- **Número grande é display, número miúdo é texto.** `1.932` no cabeçalho usa Barlow Condensed
  porque é *imagem*; `84` na coluna de pontos usa Barlow porque é *dado*. Misturar os dois produz
  aquele efeito de dashboard genérico.
- **Todo número alinhado à direita.** É o que permite comparar magnitude de relance. Numa coluna
  de pontos à esquerda, o olho lê dígito por dígito.

---

## 3. Cor — quatro papéis semânticos

| Token | Valor | Papel |
|---|---|---|
| `ink` / `ink-2` / `ink-3` | `#111` / `#57534e` / `#6b6560` | texto, texto secundário, metadado |
| `crimson` | `#be123c` | **registro**: número-âncora, título de seção, ano de feito, ação |
| `ochre` | `#94600a` | **honra e limite**: alcance mundial, pódio, critério declarado |
| `border` | `#e0dad3` | o fio — a única profundidade |

Sobre escuro: `#12100f` / `#f7f3ea` / `#e8412f` / `#c9a227`.

**Regra dura:** nenhuma informação é transmitida só por cor. A zona da tabela tem barra de forma;
o degrau de destaque tem borda de 2 px; a forma recente tem letras `V/E/D`. Tudo passa em
preto-e-branco.

---

## 4. As dez páginas e a mecânica de cada uma

| Página | Mecânica | Arquivo |
|---|---|---|
| **Competições** | Hierarquia de alcance com **quatro formas de alvo** (cartão com borda ocre → cartão com fio → ficha cinza → ficha branca) + índice denso | `competicoes.png` |
| **Clube** | Ficha completa: identidade, 4 pilares, parede de honrarias, linha do tempo, elenco, últimos jogos | `clube.png` |
| **Jogador** | Biografia com carreira em tabela e feitos datados; retrato em moldura retangular (não avatar redondo) | `jogador.png` |
| **Rankings** | Tabela é o produto: posição, variação, últimos 5, e o **critério aberto** em bloco de nota | `rankings.png` |
| **Lendas** | Única superfície escura do produto. Panteão: números-âncora em ocre, ranking com retrato, recordes empilhados, faixa de times | `lendas.png` |
| **Tabela** | Classificação completa: 20 clubes, 11 colunas, forma recente em letras, legenda de zona por barra | `tabela.png` |
| **Partida** | Placar como display de 120 px; gols, escalações e ficha técnica em três colunas | `partida.png` |
| **Comparar** | Duas colunas compartilhando **a mesma linha de base** — ler na horizontal, não em dois cartões | `comparar.png` |
| **Mapa** | O mapa é **fundo**; a lista lateral com barra de intensidade é o produto | `mapa.png` |
| **Admin** | Mesma espinha, sem cenografia: barra escura fina, KPIs densos, fila de ingestão, moderação e log | `admin.png` |

### Como as dez se encaixam

Três eixos organizam o produto, e cada página é uma posição neles:

**Eixo 1 — superfície.** Papel (9 páginas) · Escuro (1: Lendas). O escuro é reservado ao panteão;
se aparecer em outra página, perde o significado.

**Eixo 2 — densidade.** Compacta (Tabela, Rankings, Admin) · Padrão (Competições, Jogador,
Partida, Comparar, Mapa) · Ampliada (Clube, Lendas). A densidade diz o que a página é: consulta,
leitura ou ritual.

**Eixo 3 — direção da leitura.** Vertical (listas e tabelas) · Horizontal (Comparar, pilares do
Clube) · Espacial (Mapa). Só Comparar e o Mapa usam leitura não-vertical, e é isso que os torna
memoráveis.

---

## 5. Componentes que se repetem

Todos definidos em `ficha.py` e reutilizados nas 10 telas:

| Componente | Onde aparece |
|---|---|
| `topbar` | todas |
| `ficha_head` (kicker + título + âncora + subtítulo + fio) | 6 |
| `pillar` (rótulo + número display + nota) | Clube, Jogador, Admin, Lendas |
| `table_header` / `table_row` (zebra `surface-2`, fio de 1 px) | 7 |
| `provenance` (fio + nota de fonte) | todas |
| `kicker` | todas |

---

## 6. O que garante que não é "design de IA"

1. **Nenhum gradiente.** A paleta é plana por decisão; profundidade é o fio.
2. **Nenhum cartão de vidro.** Raio máximo 4 px; sombra zero.
3. **Tipografia condensada**, que é a fonte do projeto — não a sans geométrica padrão.
4. **Densidade real.** Tabelas com 20 linhas e 11 colunas, não 3 cartões.
5. **Número como imagem**, e número como dado — papéis separados.
6. **Hierarquia por forma**, não por cor.
7. **Procedência em toda página.** O sistema exibe a fonte; isso é parte do desenho, não rodapé.

---

## 7. Como isto vira código

Os tokens **já existem** em `globals.css` — o conceito não os altera. O que muda é o **uso**:

1. `ficha_head` → componente `<FichaHead>` (kicker, título, âncora, subtítulo, fio).
2. `table_header` / `table_row` → `<DataTable>` com zebra e números tabulares.
3. `pillar` → `<Pillar>`.
4. `provenance` → `<Provenance>` (o `SourceNote` atual evolui para isto).
5. Cada página compõe esses quatro + seu corpo específico.

A projeção é de **5 componentes novos** e **10 páginas reescritas** em cima deles — não 10
layouts independentes. É o que torna a implementação viável e o produto coerente.

---

## 8. Limites deste material

- **Não é implementação.** Nenhum arquivo de `apps/web` foi alterado.
- **É uma tela por página.** Não cobre estado vazio, erro, carregando ou responsivo — que são a
  próxima camada de trabalho.
- **Jogadores, Rankings e Admin têm mecânica desenhada**, mas não têm variações (filtros, estado
  vazio).
- **Onde este documento divergir de `design-system-almanaque`**, a skill manda: ela carrega as
  regras medidas de contraste, movimento e acessibilidade que aqui não se repetem.
