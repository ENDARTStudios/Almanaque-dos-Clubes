# Conceito visual — Almanaque Editorial

> Direção de UI/UX para a próxima versão do Almanaque dos Clubes. Produzido no FigCraft
> (ArtCraft) a partir de um gerador determinístico; as três telas em `design/concept/*.png` são
> renderizações reais do arquivo `.figcraft`, não mockups desenhados à mão.

---

## 1. O diagnóstico, antes da solução

A primeira versão está correta e **parece uma interface**. O problema não é feiúra: é que ela não
tem **ponto de vista**. Três sintomas:

**a) Tudo pesa igual.** Cartão de competição mundial e cartão de estadual têm a mesma borda, o
mesmo raio, o mesmo respiro. Quando tudo é cartão, nada é destaque — a hierarquia fica por conta
do título da seção, que é o recurso mais fraco disponível.

**b) A página não diz do que ela é feita.** Um acervo de 12.017 clubes e 1.932 competições é um
objeto de **referência** — mas a tela se comporta como um catálogo de produto. Falta o que faz um
almanaque ser um almanaque: número grande, fio, tabela, índice.

**c) Vícios de design de IA.** A lista que evitamos deliberadamente, porque são o caminho de menor
esforço e se reconhecem de longe:

| Vício | Por que não |
|---|---|
| Gradiente roxo/azul em tudo | assinatura visual de template, não de marca |
| Cartão de vidro com blur e raio 24 | decoração que apaga a hierarquia |
| Hero centralizado com ilustração 3D | empurra o dado para baixo do fold |
| Emoji no lugar de ícone | quebra a tipografia e envelhece |
| Grade uniforme de cartões | todo item vira igual, sempre |
| Pílula em todo botão | perde o contraste entre ação e navegação |
| Ícone outline genérico colorido | não pertence a nenhum sistema |

---

## 2. A direção: Almanaque Editorial

**Uma frase:** o site deve parecer um **livro de referência esportivo bem impresso** — papel
quente, tinta densa, tipografia com voz e números tratados como imagem.

Cinco regras que sustentam tudo:

### 2.1 Tipografia primeiro
Serifa de display (Georgia) para títulos e **para os números**. Sans (Segoe UI) para dados e
navegação. Mono (Consolas) para contagem, código e medida. A serifa não é enfeite: é o que
separa "almanaque" de "dashboard".

### 2.2 Papel e tinta, não vidro
Fundo `#F7F3EC`, tinta `#14100E`, fio `#D9D0C3`. Sem blur, sem gradiente decorativo, sem sombra
difusa. Profundidade vem de **um** recurso: o fio de 1 px e o fundo levemente mais escuro para
linhas alternadas.

### 2.3 Números são gráficos
`1.932`, `12.017`, `199.854` em serifa, 56–60 px, na cor de acento, alinhados à direita. É o que
carrega a página — e é o dado que o acervo tem de verdade.

### 2.4 Hierarquia por **forma**, não por cor
O degrau de destaque se lê pelo **tamanho do alvo**: cartão com borda de 2 px e título em serifa
(mundial) → cartão com fio de 1 px e título em sans (continental) → ficha compacta (2º escalão) →
ficha apagada (nacional). A cor de acento reforça, mas não é o portador único — passa em
preto-e-branco.

### 2.5 O escuro é **exceção**, e só no panteão
Uma única superfície escura (`#14100E`) em todo o produto: a faixa de Lendas e Imortais. Ela
existe porque o panteão é outro registro — memória, não catálogo. Se aparecer em mais páginas,
perde o significado.

---

## 3. Tokens

```css
/* Superfície */
--paper:        #F7F3EC;   /* fundo de página */
--paper-deep:   #EDE6DA;   /* linha alternada, campo pressionado */
--card:         #FFFDF8;   /* alvo clicável */
--hairline:     #D9D0C3;   /* o fio: é a única profundidade */

/* Tinta */
--ink:          #14100E;   /* texto, barra de estado ativo, superfície do panteão */
--ink-2:        #4A423B;   /* texto secundário */
--muted:        #6B6259;   /* rótulo, metadado */

/* Acento */
--wine:         #8E1B2E;   /* marca e ação */
--wine-soft:    #B23348;   /* fio de ligação, estado */
--gold:         #9A7418;   /* pódio e alcance mundial */
--gold-soft:    #C9A227;   /* borda de destaque, texto sobre escuro */

/* Escala tipográfica */
--display: Georgia, "Times New Roman", serif;
--sans:    "Segoe UI", system-ui, sans-serif;
--mono:    Consolas, ui-monospace, monospace;
```

### Por que estes e não outros

- **`--wine` não é o `#be123c` atual**: o vermelho de marca puro satura demais em fundo quente e
  briga com o dourado do pódio. `#8E1B2E` mantém a família e abaixa a vibração.
- **`--gold` é o mesmo `--color-secondary`** que o design system já documenta como a cor de pódio.
  O conceito não inventa um token; usa o que a regra já apontava.
- **Nenhum tom de azul.** Cinza-esverdeado e violeta são a paleta default de interface gerada por
  IA; evitá-los é parte da decisão.

---

## 4. Mecânica por página

O conceito não é um tema: cada página tem uma **mecânica de leitura** própria.

### Competições — hierarquia de alcance
Quatro degraus que se distinguem pela **forma do alvo**, e um índice denso abaixo. O índice é o
que transforma a página em acervo: a lista de 1.932 existe, e ela é navegável.
→ `design/concept/competicoes.png`

### Clubes — drilldown em dois níveis
Estado selecionado em **tinta cheia**, cidades **indentadas** e ligadas por um fio de acento que
sai do estado. O fio é a mecânica: ele diz "isto é consequência daquilo" sem uma palavra.
Abaixo, uma faixa de clubes mais visitados para quem chegou sem alvo.
→ `design/concept/clubes.png`

### Lendas e Imortais — o panteão
Faixa escura com três números-âncora. Jogadores em lista ranqueada com retrato em moldura
circular e feito à direita. Recordes em cartões empilhados à direita, com o número grande.
Times em faixa inferior. Cada feito declara a fonte — sem procedência, não entra.
→ `design/concept/lendas.png`

### Jogadores — ficha, não cartão
Grade densa de fichas com nome, país, posição e período. O mesmo tratamento de lista ranqueada de
Lendas, com filtro por estado/cidade (bloqueado por schema no momento).

### Rankings — a tabela é o produto
Tabela longa, cabeçalho fixo, números tabulares, zebra de `--paper-deep`, coluna de variação de
posição com seta tipográfica (`↑` `↓`) e não com cor.

### Mapa — o mapa é fundo, não herói
Coropleto em tons de papel, com legenda tipográfica. O painel lateral carrega os números; o mapa
ocupa o resto sem virar ilustração.

### Comparar — duas colunas, uma régua
Dois clubes lado a lado com as métricas alinhadas na mesma linha de base. A comparação é feita na
horizontal, não em dois cartões separados.

### Partidas e Tabelas — densidade máxima
Resultado como número grande centralizado (`3 × 1`), times nas laterais, rodada e data em mono.
Classificação com a mesma tabela de Rankings: fio, zebra, números tabulares.

### Admin — o mesmo sistema, sem a cenografia
Fundo `--paper-deep`, tipografia menor, densidade maior. Sem faixa escura, sem número-âncora: o
admin é ferramenta, não editorial. Mantém tokens, fios e a escala tipográfica.

---

## 5. Como foi produzido

| Etapa | Ferramenta | Resultado |
|---|---|---|
| Descoberta | inspeção das 16 ferramentas ArtCraft instaladas | FigCraft é o equivalente ao Figma; DesignCraft é layout editorial; VectorCraft é vetor |
| Composição | `figcraft-cli run` com script gerado por `design/concept/gen.py` | 119 + 98 + 82 camadas reais, não imagem |
| Render | `figcraft-cli render` | 3 PNGs em 1440 de largura |
| Skill de logo | clone raso + vendorização seletiva | `plugins/almanaque-design/skills/logo-design` (291 KB) |

O gerador é determinístico de propósito: cada tela tem ~100 camadas e coordenadas repetidas à mão
é onde nascem os desalinhamentos de 3 px. As constantes de token ficam no topo do arquivo, então
mudar `--wine` recompõe as três telas.

---

## 6. O que este trabalho **não** é

- **Não é implementação.** Nenhuma linha de `apps/web` foi alterada. O conceito é a etapa que
  precede a implementação, e ela existe para ser aprovada ou rejeitada antes do custo.
- **Não é um tema aplicado.** Os tokens acima ainda não estão em `globals.css`.
- **Não cobre todas as páginas em tela.** Três páginas têm tela; as outras têm **mecânica
  declarada** na seção 4, que é o contrato para quem implementar.
- **Não substitui a skill `design-system-almanaque`.** Onde as duas divergirem, a skill existente
  manda — ela carrega as regras medidas (contraste, movimento, acessibilidade) que este documento
  não repete.

---

## 7. Próximo passo

1. Aprovar ou rejeitar a direção (as três telas são o material de decisão).
2. Se aprovada: mover os tokens para `globals.css` e trocar `--color-primary` por `--wine`.
3. Implementar **uma** página completa (Competições) como referência, e só então as demais.
4. Cada página nova passa por `ui:audit:ci` e pelo `design-critic` antes do PR.
