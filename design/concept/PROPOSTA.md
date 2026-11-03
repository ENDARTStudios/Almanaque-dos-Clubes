# Proposta — sistema visual FICHA

> **Trabalhado dentro do app FigCraft**, não em suposição: o projeto `design/concept/FICHA.figcraft`
> é um documento real, com **10 frames e 1.203 camadas agrupadas por página**, aberto no app via
> `--control 7979` e operado pelo servidor MCP. As capturas em `design/concept/app/*.png` saíram da
> ferramenta `screenshot` do próprio app — é o que está na tela, não uma re-renderização à parte.

---

## 1. Skills identificadas no projeto

**Instaladas (15 em `.dsh/skills`, espelhadas de `plugins/`):**

| Plugin | Skills |
|---|---|
| `almanaque-design` (10) | `design-system-almanaque` · `design-subagents` · `ui-library-choices` · `hero-and-landing-patterns` · `motion-craft` · `motion-review` · `conversion-copy` · `web-accessibility-wcag` · `visual-qa-playwright` · **`logo-design`** (instalada no turno anterior) |
| `almanaque-dev` (5) | `idempotent-seed` · `prod-railway` · `release-loop` · `wiki-table-parser` · `wikidata-entity` |

**Sobre as seis referências que você citou:**

| Referência | Situação | Equivalente no projeto |
|---|---|---|
| **Emil Kowalski** (motion) | não instalada | **`motion-craft` + `motion-review`** — a régua de movimento já existe e é medida (`ui:audit:ci`) |
| **Impeccable** (craft de UI) | não instalada | **`design-system-almanaque` + `ui-library-choices`** |
| **Taste Skill** (direção visual) | não instalada | **`hero-and-landing-patterns` + `conversion-copy`** |
| **FigmaToCode** | não instalada | **substituída pelo FigCraft**: o `.figcraft` é o arquivo-fonte, e o `figcraft-cli` exporta SVG/PNG/PDF |
| **Playwright** | **instalada** (pacote + skill `visual-qa-playwright`) | usada nas verificações de tela dos turnos anteriores |
| **Replit** | não aplicável | ambiente local + Docker 29.8 estão disponíveis; não há ganho em terceirizar |

Nenhuma das seis acrescenta capacidade que o projeto já não tenha — exceto o **Taste Skill**, cujo
valor real seria a régua de "evitar vício de design". Essa régua foi aplicada aqui **por escrito**,
na seção 5, e é verificável nas telas.

---

## 2. O conceito: toda página é uma ficha

Um almanaque é um livro de verbetes. Cada página abre com o mesmo cabeçalho; **só o corpo varia**.

```
kicker      Barlow 600 · 10 px · caixa alta · tracking +2,2 · ink-3
título      Barlow Condensed 700 · 52–68 px · tracking −0,5
âncora      Barlow Condensed 700 · 76 px · crimson · à direita
subtítulo   Barlow 400 · 15 px · ink-2 · largura ≤ 760
──────────  FIO 2 px · ink   ← a única profundidade do sistema
corpo       (varia por página)
──────────  procedência: fio 1 px + Barlow 400 11 px ink-3
```

**Cores e fontes são exatamente as do projeto.** Nenhum token novo:
`#be123c` · `#9f1239` · `#94600a` · `#faf8f5` · `#f2efea` · `#e0dad3` · `#111` · `#57534e` · `#6b6560`
e, sobre escuro, `#12100f` · `#f7f3ea` · `#e8412f` · `#c9a227`. Fontes: **Barlow Condensed** e
**Barlow** (ambas instaladas na máquina, então o FigCraft renderiza fiel).

---

## 3. As dez páginas no app

| Frame | Mecânica | Camadas |
|---|---|---|
| `competicoes` | hierarquia de alcance em **quatro formas de alvo** + índice denso | 141 |
| `clube` | pilares · parede de honrarias · linha do tempo · elenco · últimos jogos | 167 |
| `jogador` | carreira em tabela, feitos datados, retrato em moldura | 69 |
| `rankings` | tabela + **critério da pontuação aberto** | 137 |
| `lendas` | única superfície escura: panteão, recordes, times | 94 |
| `tabela` | 20 clubes × 11 colunas, forma `VVEVV`, zona por barra | 292 |
| `partida` | placar em display de 120 px, três colunas | 69 |
| `comparar` | duas colunas na **mesma linha de base** | 49 |
| `mapa` | o mapa é fundo; a lista com barra é o produto | 78 |
| `admin` | mesma espinha sem cenografia: KPIs, fila, moderação, log | 107 |

**Como tudo se encaixa — três eixos:**

- **Superfície**: papel (9) × escuro (1, só Lendas — o panteão).
- **Densidade**: compacta (Tabela, Rankings, Admin) × padrão × ampliada (Clube, Lendas).
- **Direção da leitura**: vertical (listas) × horizontal (Comparar, pilares) × espacial (Mapa).

Cada página é uma posição nesses três eixos, e todas compartilham a mesma espinha.

---

## 4. O que o FigCraft recebeu, e por que isso importa

O documento **não é uma pilha de formas**: cada página é um **frame**, e as camadas estão **dentro**
dele (`parent`). Você abre `FICHA.figcraft`, clica num frame e move a página inteira; edita o texto
de qualquer camada; troca um token e o frame inteiro responde.

Três tentativas até chegar aqui, e as três falhas estão documentadas no código:

1. **Sem `parent`**, o FigCraft jogou 1.215 camadas na **página** e deixou os 10 frames vazios —
   igual na tela, inútil na edição.
2. **`run_command` usa `{command, params}`**, não `{id}`: minha primeira versão mandava `id` e os
   frames **nunca foram criados** (o erro veio como `unknown argument 'id'`).
3. **Frames residuais**: `file.new` não limpou o documento anterior; sobraram 12 frames e ~1.200
   camadas órfãs. Removidos com `edit.delete`, sobrando exatamente 10 frames × 1.203 camadas.

O app ficou aberto com `--control 7979` e o CLI conectado por MCP (`--attach 7979`) durante todo o
trabalho — cada `batch` apareceu no canvas.

---

## 5. O que impede isto de ser "design de IA"

| Vício | Como foi evitado |
|---|---|
| gradiente roxo/azul | zero gradiente; a paleta é a do projeto, plana |
| cartão de vidro | zero blur, zero sombra difusa, raio máximo 4 px |
| hero centralizado | o título é sempre à esquerda, o número à direita — assimetria fixa |
| grade uniforme de cartões | quatro **formas** de alvo por degrau; tabelas de 20×11 |
| emoji como ícone | nenhum; zona por barra, forma recente por letra |
| pílula em tudo | raio 2 px em tudo que não é a barra de topo |
| hierarquia por cor | hierarquia por **forma** — passa em preto-e-branco |

Duas decisões tipográficas que fazem a diferença: **número grande é display** (Barlow Condensed,
é imagem) e **número miúdo é texto** (Barlow, é dado); e **todo número alinhado à direita**, para
comparar magnitude em vez de ler dígito por dígito.

---

## 6. Limites, declarados

- **Uma tela por página.** Não há estado vazio, erro, carregando ou responsivo — é a próxima camada.
- **Dados ilustrativos**, escolhidos para parecer acervo real (Flamengo, Pelé, Premier League), mas
  não puxados da API nesta etapa.
- **Onde este documento divergir de `design-system-almanaque`**, a skill manda — ela carrega as
  regras medidas de contraste, movimento e acessibilidade.

---

## 7. Próximo passo

Os tokens já existem em `globals.css`: o conceito **não altera nenhum**. O que muda é o uso —
5 componentes (`FichaHead`, `DataTable`, `Pillar`, `Provenance`, `Kicker`) e 10 páginas compostas em
cima deles.

Ordem sugerida: **Competições completa** (todos os estados) como referência, depois as outras nove.
