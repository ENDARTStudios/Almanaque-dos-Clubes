# Auditoria pela skill + organização no FigCraft

> Carreguei `design-system-almanaque` (regra do projeto: antes de mexer em tela) e auditei o
> conceito contra ela. Encontrei **três violações objetivas**. Depois organizei o arquivo.

---

## 1. A auditoria

A skill tem regras medidas, não estéticas. Rodei uma verificação programática nas 16 telas
(**3.177 camadas de texto**) e o resultado foi:

| # | Regra da skill | Violações | Por que é defeito |
|---|---|---|---|
| 1 | *"`text-primary` como TEXTO é o defeito; use `text-primary-ink`"* — `--color-primary` `#be123c` é **preenchimento**; `--color-primary-ink` `#9f1239` é **texto** | **138 camadas** | Eu usei a cor de botão/mapa/gráfico como cor de número-âncora e título de seção em todas as páginas |
| 2 | Piso tipográfico: `text-xs` (12px) para nota; nada abaixo de 10px | **12 camadas em 8px** + **313 em 9px** | Texto que não se lê não é informação — é textura |
| 3 | Medida de linha ~68ch (`ch` acompanha a fonte; `rem` não) | **101 blocos** acima | Bloco de 780px em 13px dá ~120 caracteres por linha; o olho perde o lugar na volta |

### Contraste, medido

| Cor | Sobre `#faf8f5` | Veredito |
|---|---|---|
| `#be123c` (preenchimento) | 5,90:1 | passa AA, mas é o token errado para texto |
| `#9f1239` (texto) | **7,58:1** | passa com folga — é o token de papel |

Ou seja: a violação 1 não reprovava em contraste. Era **erro de papel de token** — o tipo de erro
que passa no portão automático e só a leitura da regra pega.

---

## 2. A correção — no normalizador, não página por página

Corrigir 16 arquivos à mão era receita para esquecer alguns. A correção vive em
`ficha.py::normalizar()` e roda em **toda** lista de comandos, antes do build:

```python
CRIMSON_TEXTO = "#9f1239"   # --color-primary-ink
PISO_PX = 10
MAX_CH = 68
```

| Regra | O que o normalizador faz |
|---|---|
| 1 | texto com `fill == #be123c` → `#9f1239`; **preenchimentos continuam `#be123c`** |
| 2 | `fontSize < 10` → `10` |
| 3 | texto de 11–17px com `width > 68ch` → largura reduzida para a medida |

Exemplo medido na tela de Competições: **1 cor corrigida · 5 tamanhos elevados · 11 medidas
ajustadas**. Somando as 16 telas, as 138 cores, 325 tamanhos e 101 medidas foram corrigidas de uma
vez — e builds futuros herdam a regra.

---

## 3. A organização no FigCraft

O arquivo tinha **17 frames espalhados num canvas de 24.000 px de altura, sem página nenhuma**.
Um arquivo de design se navega pelo painel de páginas, não rolando o canvas.

Agora: **8 páginas, 17 frames**.

| Página | Frames |
|---|---|
| **00 · Capa** | home |
| **01 · Descoberta** | competicoes · tabelas · temporada · partidas |
| **02 · Entidades** | clube · jogador · estadio |
| **03 · Rankings e geografia** | rankings · ranking · mapa · comparar · busca |
| **04 · Panteão** | lendas |
| **05 · Meu Almanaque** | meu-almanaque |
| **06 · Admin** | admin |
| **07 · Institucional** | metodologia |

A divisão segue o **mapa de páginas**, não a ordem em que desenhei: Descoberta é o que o usuário
procura; Entidades é o que ele abre a partir dela; o Panteão e o Almanaque são destinos; Admin e
Institucional têm natureza própria.

### Três lições de API, todas na marra

1. **`file.new` não limpa o documento aberto.** Ele inicia um novo sem descartar o atual. A
   primeira execução criou 7 páginas e falhou; a segunda criou mais 7. Sobraram **15 páginas**.
   A limpeza tem de ser explícita: `page.delete` para cada uma.
2. **`object.moveToPage` recebe `{ids, page}` onde `page` é o ID**, não o índice. Passei `0..7` e
   os frames foram parar todos na última página.
3. **`page.select` é assíncrono.** `inspect_document` logo depois devolve a página anterior. É
   preciso esperar, ou usar `node.find` (que busca na página atual) depois de cada troca.

Também descobri que **`inspect_document` só devolve a página corrente** — a minha "verificação"
anterior mostrava tudo na página 0 porque era isso que ela via. O painel `page.list`, com contagem
de filhos por página, é a verificação confiável.

### Resíduos removidos

Sobraram 29 frames de builds anteriores na Capa (incluindo probes de teste e as versões
`clube-migrado`/`jogador-migrado`, já substituídas). Somei a isso um `TESTE-MOVE` que criei ao
investigar a API. Tudo removido: **17 frames, exatamente os 17 do sistema**.

---

## 4. Uma correção de conteúdo

Na tela de **Lendas**, a legenda do donut tinha os valores (42 · 31 · 14 · 13) soltos a 60px do
rótulo, parecendo números órfãos. Agora o valor fica colado ao rótulo, alinhado à esquerda.

---

## 5. O que a auditoria **não** cobriu

Sendo explícito sobre o alcance do que fiz:

| Não verificado | Por quê |
|---|---|
| Contraste pixel a pixel | o FigCraft não expõe contraste; calculei as duas cores principais à mão |
| Tamanho de toque / responsivo | todas as telas são desktop 1440 |
| `prefers-reduced-motion` | o conceito é estático; a regra se aplica na implementação |
| i18n | os textos são de mockup; na implementação todos passam por dicionário |
| `ui:audit:ci` | o portão roda em código de `apps/web`, que **não foi alterado** |

**Nada de `apps/web` foi tocado.** Esta é uma auditoria do conceito, não do app.

---

## 6. Estado

| | |
|---|---|
| Páginas no FigCraft | **8** |
| Frames | **17** |
| Camadas | **~2.700** |
| Capturas | **23** em `design/concept/app/` |
| Arquivo | `design/concept/FICHA.figcraft` |

Violações corrigidas: **138 de cor · 325 de tamanho · 101 de medida de linha**.
