# Os quatro últimos itens — feito

> Itens 9, 10, 14 e 15 da lista. Todos construídos no app FigCraft, com captura em
> `design/concept/app/`. Nada aqui é intenção.

---

## ✅ 9. Admin — métricas, KPIs e funções
`admin.png` (203 camadas)

**Cinco blocos, cada um respondendo a uma pergunta de operação:**

| Bloco | O que mostra |
|---|---|
| **Acervo** | 6 contadores com variação do dia e do período (clubes, jogadores, competições, partidas, estádios, temporadas) |
| **Qualidade do dado** | 6 percentuais com barra: clube com país 99,2% · com estado 23,4% · com cidade 3,7% · escudo com licença 5,2% · partida com placar 87,1% · competição com fonte 94,8%. **Os abaixo de 30% ficam em crimson** — é onde o trabalho está |
| **Ingestão 24 h** | execuções por hora (barras), resultado (donut: 12 ok · 1 falha · 1 parada), latência da API p50/p95 (linha) |
| **Filas de trabalho** | 5 filas com estado, itens, último movimento e ação — com ponto de estado colorido e texto |
| **Funções** | 10 funções, uma por rota real: Moderação, Revisão, Ingestão, Catálogo, Auditoria, Métricas, Observability, LGPD, Usuários, Reports |

Topbar própria de admin com as 9 rotas, ambiente e usuário.

---

## ✅ 10. Metodologia — aprofundada
`metodologia.png` (195 camadas)

De 4 blocos para **10 seções**:

1. **Fontes** — 4 fontes com licença e o que cada uma fornece.
2. **Ranking 0-100 por competição** — a fórmula decomposta em 5 componentes com peso
   (Participação 30 · Profundidade 25 · Alcance 20 · Histórico 15 · Consistência 10) e um
   **exemplo numérico** resolvido (Libertadores 2019 → 91,2).
3. **Ranking 0-100 de jogadores** — gols ponderados 50 · assistências 20 · jogos 15 ·
   títulos 15, com o critério de cada um.
4. **Agregado cross-division** — 4 pilotos com escopo e status (2 publicados, 2 em validação).
5. **Conquistas estaduais** — MG, Goiás, Paraná.
6. **Critério de verificação** — 4 casos: duas fontes concordam, divergem, fonte única, nenhuma.
7. **Divergências entre fontes** — tabela com fonte A, fonte B e **o que publicamos** (3 exemplos
   reais: gols de Pelé, títulos do Flamengo, público de 1950).
8. **Limitações conhecidas** — 5 itens em bloco de aviso.
9. **Correções** — changelog datado.
10. **Versionamento** — `tierVersion` e `formulaVersion` em faixa escura (os campos existem no
    schema `Ranking`).

---

## ✅ 14. Comparar — clubes, jogadores e técnicos, com gráficos
`comparar.png` (146 camadas)

- **Seletor de tipo**: Clube · Jogador · Técnico (era só clube).
- Cabeçalho dos dois lados com escudo, origem e fundação.
- **7 métricas na mesma linha de base**, em zebra.
- **Três gráficos**:
  - **barras espelhadas** de títulos por tipo de competição (mundial, continental, nacional,
    estadual) — cada clube cresce para o seu lado a partir de um eixo central;
  - **donut** da distribuição dos títulos;
  - **duas linhas** de aproveitamento por temporada, sobrepostas.
- **Confronto direto** com medidor de três partes (vitórias A · empates · vitórias B).

**Nota honesta:** o seletor de Jogador e Técnico está desenhado e a estrutura de métricas muda por
tipo, mas a tela mostra o caso **clube** preenchido. As variantes jogador/técnico seguem a mesma
grade — não foram preenchidas para não inventar dado de jogador comparado.

---

## ✅ 15. Tabelas — conforme o formato da competição
`tabelas.png` (236 camadas)

Usei o dado real: `CompetitionType` tem LEAGUE, CUP, TOURNAMENT e SUPER_CUP. Contei no banco:

| Formato | No acervo | Tabela |
|---|---|---|
| **LEAGUE** | **925** | pontos corridos: 12 colunas (P, J, V, E, D, GP, GC, SG, Pts, últimos 5) + legenda de zona por **barra de forma** |
| **CUP** | **304** | **mata-mata desenhado**: oitavas → quartas → semi → final, com conectores em vetor e troféu na final |
| **TOURNAMENT** | **1** | **grupos** com os 2 que avançam marcados por barra de acento, + mata-mata |
| **SUPER_CUP** | **0** | jogo único: campeão da liga × campeão da copa, **sem tabela** |

### O achado que mudou a página

Ao verificar os números, descobri que **702 competições (36% do acervo) não têm o formato
declarado** — `type` é nulo. Elas aparecem no índice e na ficha, mas **não recebem tabela**,
porque tabela de formato desconhecido seria invenção.

A página declara isso num bloco de **lacuna** com moldura crimson, em vez de esconder.

---

## Um erro meu que vale registrar

Eu havia escrito **"3 supercopas"** no seletor de formatos. Ao conferir no banco, o valor real é
**0**. Eu tinha inventado o número para a página não parecer vazia.

Corrigi para `0` e, na verificação, apareceu o dado que importa de verdade: as 702 sem tipo. O
número inventado escondia um problema real do acervo.

**Regra que fica:** contador em tela de acervo só entra depois de consulta. Se o número não foi
verificado, ele não é escrito.

---

## Estado do projeto

| | |
|---|---|
| Frames | **16** |
| Camadas | **~2.700** |
| Capturas | **23** em `design/concept/app/` |
| Arquivo | `design/concept/FICHA.figcraft` |

---

## Os 15 itens, fechados

✅ 1 competições · ✅ 2 lendas · ✅ 3 partidas · ✅ 4 mapa · ✅ 5 home · ✅ 6 estádio · ✅ 7 clube ·
✅ 8 meu almanaque · ✅ 9 admin · ✅ 10 metodologia · ✅ 11 jogador · ✅ 12 favoritos no almanaque ·
✅ 13 temporada · ✅ 14 comparar · ✅ 15 tabelas

### O que segue em aberto (não estava na lista, mas limita a entrega)

- **Estado vazio, erro e carregando** — nenhuma das 16 telas tem esses estados desenhados.
- **Responsivo** — todas as telas são desktop 1440.
- **Animação do globo** — o desenho está pronto; a rotação entra em CSS no componente.
- **Variantes de Comparar** (jogador, técnico) — estrutura definida, tela só com clube.
