# Revisão visual — conceito (design/concept) × entregue

Data: 2026-11-04
Método: captura full-page da produção em 1440 px, pareada com o PNG do quadro
(`design/concept/app/*.png`) e leitura comparativa em três passes:

1. **Composição e hierarquia** — o que abre a tela, em que ordem, com quais blocos.
2. **Densidade e tipografia** — escala dos títulos, rótulos, linhas, espaçamento vertical.
3. **Componentes legados sobrepostos** — o que veio do layout antigo e não pertence ao quadro.

A revisão é do **desenho**, não do dado: onde a API não publica um campo do quadro, a lacuna
continua declarada (nunca preenchida com o número ilustrativo do PNG).

## Placar da revisão

| Tela                 | Quadro              | Composição    | O que divergia                                                                                                                                    | Estado                 |
| -------------------- | ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Home                 | home.png            | **corrigida** | seção "Campeões" extra depois do quadro; rótulos dos totais abaixo dos números; globo com pontos de couro                                         | corrigida nesta rodada |
| Competições (índice) | competicoes.png     | **corrigida** | filtros com gênero e lista de países por volume; índice despejava as 1.932 competições sem edições/última/alcance; 4º destaque era Copa do Brasil | corrigida nesta rodada |
| Rankings (índice)    | rankings.png        | **corrigida** | barra de filtros + tabela de 7 linhas no topo; quadro pede UMA tabela de 12 linhas                                                                | corrigida nesta rodada |
| Lendas               | lendas.png          | divergente    | métricas do acervo inteiro no lugar das do panteão; lista de jogadores substituída por líderes; um gráfico no lugar dos três                      | pendente               |
| Competição (ficha)   | tabela.png          | divergente    | a tela abre em "Visão Geral" (ficha/pódio/história); o quadro é a classificação final                                                             | pendente               |
| Clube (ficha)        | clube-migrado.png   | a verificar   | blocos legados vs. quadro                                                                                                                         | pendente               |
| Partidas (índice)    | partidas.png        | parcial       | sem chips de filtro ativo; sem colunas de estatística por jogo (API não publica)                                                                  | pendente               |
| Partida (ficha)      | partida.png         | aderente      | gols/escalações declarados como lacuna                                                                                                            | ok                     |
| Mapa                 | mapa.png            | parcial       | linha de gênero extra; legenda do mapa fora da dobra; quadro usa coropleto (sem geometria na API)                                                 | pendente               |
| Busca                | busca.png           | aderente      | grupos e tipos reais; cidade/estádio não existem na busca                                                                                         | ok                     |
| Comparar             | comparar.png        | aderente      | linhas horizontais, cartões e gráficos; sem jogos/gols/sócios (API não publica)                                                                   | ok                     |
| Jogador (ficha)      | jogador-migrado.png | aderente      | —                                                                                                                                                 | ok                     |
| Temporada            | temporada.png       | aderente      | —                                                                                                                                                 | ok                     |
| Estádio              | estadio.png         | aderente      | —                                                                                                                                                 | ok                     |
| Meu Almanaque        | dashboard.png       | aderente      | —                                                                                                                                                 | ok                     |
| Operação (admin)     | admin.png           | aderente      | gráfico de ingestão declarado como lacuna                                                                                                         | ok                     |
| Legal                | legal.png           | aderente      | —                                                                                                                                                 | ok                     |
| 404                  | 404.png             | aderente      | —                                                                                                                                                 | ok                     |
| Sobre                | sobre.png           | aderente      | —                                                                                                                                                 | ok                     |
| Metodologia          | metodologia.png     | aderente      | —                                                                                                                                                 | ok                     |

## Correções desta rodada

### Home (`components/HomeFicha.tsx`, `app/page.tsx`, `components/ficha/Globe.tsx`)

- Removida a seção **Campeões** que vinha depois do quadro (não existe em home.png).
- Faixa de totais passou à leitura do quadro: **rótulo em caixa alta acima, número abaixo**.
- Globo virou **só linha** (meridianos, paralelos e gomos); os pontos de couro saíram.
  O teste do globo passou a travar a ausência de pontos, em vez de exigir 50+.

### Competições (`app/competitions/page.tsx`, `i18n/wsConceitoCompeticoes.ts`)

- Filtros: linha de **país na ordem do quadro** (Brasil, Portugal, Reino Unido, Espanha, Itália)
  e sem a linha de gênero; "ver todos os países" continua no disclosure.
- Destaques: 4º alvo passou a ser **Premier League** (nacional), como no quadro.
- Índice: por padrão, **7 competições-âncora** com Competição, País, Edições, Última e Alcance
  (dados de `overview.history`); o despejo paginado das 1.932 abre por link e continua
  respeitando os filtros. A nota declara que as contagens são as do acervo.

### Rankings (`app/rankings/page.tsx`)

- O quadro é **uma tabela em foco**: o servidor escolhe a edição anual de clubes mais recente
  com pelo menos 10 entradas e mostra 12 linhas (#, Clube, País, Pts, Títulos, Base auditável).
- A barra de filtros antiga e a tabela de cursor foram para **"Explorar todos os rankings"**
  (`<details>`), preservando a funcionalidade sem ocupar a composição do quadro.
- "Var." e "Últ. 5" não são inventados: a nota abaixo da tabela declara que a API não publica
  os dois campos.

## Pendências (próximas rodadas)

- Lendas: recalcular as métricas no escopo do panteão; estrutura de três gráficos e lista de
  jogadores (ou lacuna explícita para jogadores, que a API não publica).
- Competição: abrir na classificação final do quadro `tabela.png` e deixar as demais abas como
  navegação secundária.
- Clube: revisar os blocos que ainda vêm do layout antigo contra `clube-migrado.png`.
- Mapa: tirar a linha de gênero da composição primária e reposicionar a legenda.
- Partidas: chips de filtro ativo e aproximar a densidade da tabela do quadro.
- **Marca**: os quadros usam o wordmark "ALMANAQUE | dos Clubes"; o site usa o logo-icon. Troca
  de identidade não foi feita por decisão de marca — fica registrada como divergência consciente.
