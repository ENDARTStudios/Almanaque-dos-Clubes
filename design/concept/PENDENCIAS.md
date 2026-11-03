# Pendências do design — status dos 15 itens

> Cada item da sua lista, com o que foi feito e o que falta. Nada aqui é "resolvido na intenção":
> o que diz *feito* está no app FigCraft e tem captura em `design/concept/app/`.

---

## Como foi feito

Faltavam as primitivas que sustentam metade dos pedidos: **gráfico, troféu, medalha, bandeira e
globo**. Sem elas, "estatísticas, métricas e gráficos" era uma frase sem desenho.

Criei `design/concept/ficha_visual.py` com:

| Primitiva | O que desenha |
|---|---|
| `barras` | barras verticais e horizontais, com eixo e rótulo |
| `linha` | série com pontos, para tendência |
| `donut` | anel de proporção em arcos |
| `trofeu` | taça em vetor — bojo, alças, haste, base |
| `medalha` | fita em V + disco |
| `bandeira` | faixa com as cores nacionais + ISO |
| `globo` | esfera em arame: meridiano e paralelo |
| `globo_bola` | **esfera + pentágonos projetados** — o pedido da Home |

Tudo em retângulo e vetor do FigCraft. Nenhuma imagem externa: o arquivo fica leve e editável.

---

## Os 15 itens

### ✅ 1. Competições — filtro por país, troféu, medalhas
`competicoes.png` (216 camadas)

- **Filtro por país com bandeira** desenhada (BR, PT, GB, ES, IT), ao lado de tipo e alcance.
- **Troféu em vetor** em cada um dos 4 destaques, colorido por alcance (ocre = mundial).
- **Pódio com medalhas**: campeão, vice e 3º, cada um com sua peça (ouro, prata, bronze).
- Troféu miniatura em cada linha do índice.

### ✅ 2. Lendas — clubes e jogadores, recordes, métricas, gráficos
`lendas.png` (160 camadas)

- **Jogadores** (5, com retrato) **e clubes** (5, com posição) — antes só havia jogadores.
- Métricas do panteão: jogadores, clubes, títulos, recordes, países.
- **Três gráficos**: gols por década (barras), clubes por país (barras horizontais),
  recordes por tipo (donut com legenda).
- Recordes em cartões, com número-âncora.

### ✅ 3. Partidas — filtro inteligente e estatísticas
`partidas.png` (118 camadas)

- **Filtro em 4 eixos**: competição, temporada, time, resultado — com chips do recorte ativo.
- **Estatística por jogo**: posse, finalizações, escanteios em cada linha.
- **Estatística agregada do recorte**: aproveitamento, gols pró/contra, média de posse.

### ✅ 4. Mapa — filtro por país, estado e cidade com bandeiras
`mapa.png` (136 camadas)

- **Filtro em 3 níveis**: país (com bandeira), estado, cidade.
- Lista de estados com UF como marca (o Brasil não usa bandeira por UF — declarado).
- Cidades com bandeira do país.
- Legenda de intensidade do coropleto.

### ✅ 5. Home — logo, frase, CTA e o globo
`home.png` (103 camadas)

- **Frase real do site**: "A História do Futebol" / "num Só Lugar".
- **Subtítulo real** e **os dois CTAs reais**: "Começar Pesquisa" e "Criar Conta Gratuita".
- **Globo gigante em linhas, mesclado a bola de futebol** — esfera em meridianos e paralelos com
  pentágonos projetados na superfície, recortados na borda, apenas contorno.
- Números do acervo e o índice "Comece por onde quiser" com bandeiras.

**Sobre a animação:** o globo é estático no arquivo. O FigCraft não anima por script de forma
confiável; a animação (rotação do globo, pulso dos pentágonos) entra em CSS no componente, com a
construção exata deste desenho. **Não prometo o que não vi rodar.**

### ✅ 6. Estádio — imagem, história, mais estatísticas
`estadio.png` (123 camadas)

- **Imagem do estádio** em moldura alta, com ilustração de arquibancada em vetor.
- **História** em texto, com fonte (Wikidata/CC0).
- 6 métricas (capacidade, maior público, inauguração, partidas, gols, média).
- **Gráfico de público recorde por década**.
- Clubes mandantes com aproveitamento; maiores públicos com ação.

### ✅ 7. Clube — redes, editor, ranking, escudo, elenco, estádio, partidas, troféus
`clube.png` (174 camadas)

- **Posição no ranking** em cartão próprio (10º · 1.552 pts · ▲4).
- **Editor do clube** como link de ação.
- **Troféus e medalhas**: 5 taças em vetor por competição, com quantidade.
- **Evolução do escudo**: 9 escudos de 1895 a 2020, com nota de licença por item.
- **Elenco** com nota; **estádio** em cartão com "ver estádio →".
- **Redes sociais** (Instagram, X, YouTube, TikTok, Site).
- **Últimas partidas** em três cartões.

### ✅ 8. Meu Almanaque — Time do Coração e o álbum
`meu-almanaque.png` (138 camadas)

- **Time do Coração em faixa escura**, no topo: escudo, nome, vínculo em dias, e **medidor de
  coleção** ("72% · 34 de 48 figurinhas") com quatro ações.
- **O álbum**: 5 páginas (Clubes, Jogadores, Competições, Estádios, Temporadas), cada uma com
  progresso, percentual e o que já foi colado.
- **Figurinhas em destaque**: raras, históricas e conquistadas, com moldura diferenciada por
  raridade.
- Conta e assinatura mantidas.

### ✅ 11. Jogador — troféus, medalhas, métricas, gráficos
`jogador.png` (183 camadas)

- **Troféus e medalhas**: 5 taças por conquista, com quantidade.
- **Gráfico de gols por ano** da carreira (13 temporadas).
- **Donut de gols por tipo** (pé direito, esquerdo, cabeça) com legenda.
- Carreira em tabela e conquistas + prêmios individuais.

### ✅ 12. Favoritos dentro de Meu Almanaque
Favoritos deixou de ser página solta: virou as **páginas do álbum** dentro de Meu Almanaque.
O frame `favoritos` separado foi removido do projeto — não há mais dois lugares para a mesma coisa.

### ✅ 13. Temporada — métricas, tabela e gráficos
`temporada.png` (200 camadas)

- 6 métricas da temporada.
- Competições do ano com campeão e artilheiro.
- **Tabela da competição** (5 primeiros, com forma recente) e link para a completa.
- **Três gráficos**: gols por rodada (linha), público por mês (barras), resultados (donut).
- Linha do tempo da temporada.

---

## O que **não** está feito

Vou ser explícito, porque é o que importa agora:

### ❌ 9. Admin — métricas, KPIs e funções
Existe um frame `admin` do conceito anterior, **não atualizado**. Falta o mapa completo de KPIs
(ingestão, qualidade de dado, filas, erros, latência, uso) e as funções de administrador
(moderação, papéis, auditoria, LGPD). É o maior buraco restante.

### ❌ 10. Metodologia — mais detalhes
Existe um frame com 12 seções, **não ampliado**. Falta aprofundar cada ranking 0-100, o agregado
cross-division, os pilotos estaduais e a tabela de divergências.

### ❌ 14. Comparar — clubes, jogadores e técnicos
O frame atual compara **apenas clubes**, e sem gráficos. Falta o seletor de entidade
(clube/jogador/técnico), as métricas por tipo e os gráficos comparativos.

### ❌ 15. Tabelas — conforme a característica da competição
O frame atual mostra **um formato só** (pontos corridos de liga). Falta: grupos + mata-mata,
turno e returno, pontos corridos com quadrangulares, copa com fase eliminatória.

---

## Estado do projeto

| | |
|---|---|
| Frames | **17** |
| Camadas | **~2.300** |
| Capturas | **24** em `design/concept/app/` |
| Arquivo | `design/concept/FICHA.figcraft` |

**Construído no app aberto** via MCP (`--attach 7979`), cada `batch` visível no canvas, e as
capturas saem da ferramenta `screenshot` do próprio app.

---

## Correções técnicas desta rodada

Quatro bugs meus, todos encontrados por validação e não por sorte:

1. **Meridianos do globo** colapsados: usei `r · cos(λ) · 0.42` — o `0.42` espremia todas as
   elipses no centro. Correto é semi-eixo horizontal `r · cos(λ)`.
2. **Pentágonos saindo da esfera**: faltava recorte por `|px − cx| + raio ≤ r`.
3. **`num()` com 7 posicionais** em `ficha_visual.barras` — o 7º caía em `w` junto com o `w=`
   keyword. Corrigido para 6 posicionais + `w`.
4. **`kicker()` recebendo o peso no lugar da largura** em duas chamadas do Mapa — o mesmo erro que
   já havia cometido antes. Agora há validador de geometria rodando antes de cada build: **0
   estouros em 2.300 camadas**.
