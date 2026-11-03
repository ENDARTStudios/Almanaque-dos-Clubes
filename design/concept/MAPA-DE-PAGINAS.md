# Mapa de páginas — Almanaque dos Clubes

> Auditoria das **49 rotas existentes** + mapa completo do que o produto precisa ter, página por
> página, com o conteúdo de cada uma e as ligações entre elas.

---

## 1. O estado atual, medido

49 rotas em `apps/web/src/app`. O tamanho em KB é proxy de quanto conteúdo existe hoje:

### Núcleo de dados

| Rota | Hoje | Diagnóstico |
|---|---|---|
| `/` | 4,3 KB | **fraca** — não apresenta o acervo; não é porta de entrada |
| `/competitions` | 17,4 KB | boa: filtros + destaques + índice |
| `/competitions/[id]` | **54,7 KB** | a página mais rica do produto |
| `/clubs` | 4,9 KB | fraca: só busca + índice de países |
| `/clubs/[id]` | 36,9 KB | boa: perfil completo |
| `/players` | 5,7 KB | fraca: lista sem hierarquia |
| `/players/[id]` | 17,6 KB | média |
| `/legends` | 15,2 KB | média |
| `/matches` | 13,9 KB | média |
| `/rankings` | **1,0 KB** | **stub** — e há **72 rankings / 1.954 entradas** no banco |
| `/map` | 2,4 KB | fraca |
| `/compare` | 1,6 KB | stub |
| `/clubs/compare` | 8,2 KB | parcial |
| `/search` | 0,6 KB | **stub** — é o eixo transversal |
| `/favoritos` | 0,5 KB | **stub** (37 favoritos no banco) |
| `/mercado-da-bola` | 1,8 KB | fraca |

### Entidades com dados e **sem tela**

| Modelo | Dados | Tela |
|---|---|---|
| `Stadium` | **84** + 3.475 clubes com `stadiumName` | **nenhuma** |
| `Season` | **32** | **nenhuma** (só aparece dentro da competição) |
| `Ranking` / `RankingEntry` | **72 / 1.954** | só um stub |
| `KnowledgeGraph` | existe no schema | **nenhuma** |

### Admin (12 rotas) · Conta (9) · Institucional (11)

Admin está completo em rotas mas sem sistema visual próprio. Institucional tem a página mais
densa do produto depois da competição: `/metodologia` (25,6 KB) — e é ela que sustenta todo número.

---

## 2. O mapa completo — 24 páginas em 5 famílias

```
                    ┌──────────┐
                    │   HOME   │  porta de entrada: 4 portas + agora + explorar
                    └────┬─────┘
        ┌────────────┬───┴────┬─────────────┬──────────────┐
        ▼            ▼        ▼             ▼              ▼
   COMPETIÇÕES   CLUBES   JOGADORES     RANKINGS        LENDAS
        │            │        │             │              │
        ▼            ▼        ▼             ▼              ▼
   ┌─────────┐  ┌─────────┐ ┌────────┐ ┌─────────┐   (panteão)
   │Competição│ │  Clube  │ │Jogador │ │ Ranking │
   └────┬────┘  └────┬────┘ └───┬────┘ └─────────┘
        │            │          │
   ┌────┴────┐       │          │
   ▼         ▼       │          │
 Tabela   Partida ───┴──────────┘        ← partida liga clube, jogador,
                                            competição e estádio
        │
        ▼
     Estádio ─────────────► Clube

   TRANSVERSAIS: Busca · Favoritos · Mapa · Comparar · Temporada · Mercado
   CONTA:        Entrar · Painel · Assinatura · Notificações
   ADMIN:        Operação · Moderação · Ingestão · Auditoria · Métricas · LGPD
   INSTITUCIONAL: Metodologia · Sobre · Fontes · Privacidade · Termos
```

---

## 3. Cada página, individualmente

### 3.1 Home `/`
**Contém:** as quatro portas com o número do acervo (Competições 1.932, Clubes 12.017,
Jogadores 105.211, Lendas 1.284) · *Agora no acervo* (últimas ingestões, com fonte e hora) ·
*Explorar* (índice para Rankings, Estádios, Temporadas, Mapa, Comparar, Metodologia) ·
*O que sustenta o acervo* (as quatro promessas: fonte declarada, ausência não vira zero, partida
sem placar não conta, escudo só com licença).

**Liga para:** as 4 portas → índices; cada item de "agora" → a página do que mudou; cada item de
"explorar" → a página correspondente.

**Por que esta ordem:** a Home **escolhe por onde começar**. Não é hero — é um índice com
movimento. Quem já sabe o que quer usa a busca; quem não sabe usa as portas.

---

### 3.2 Competições `/competitions`
**Contém:** filtros (gênero, tipo, país como seleção) · Destaques por **alcance em quatro degraus**
(mundial como cartão de borda ocre → continental → 2º escalão → nacional em ficha apagada) ·
índice completo (1.932) com país, edições, última edição e alcance.

**Liga para:** cada competição → `/competitions/[id]`; cada país → `/competitions?country=XX`.

**Regra:** competição estadual não entra em Destaques (alcance regional), mas continua no índice.

---

### 3.3 Competição `/competitions/[id]`
**Contém (por aba):**

| Aba | Conteúdo |
|---|---|
| **Visão geral** | pódio da última edição (campeão em dourado, vice, 3º) · história (1ª edição, nº de edições, maior campeão, maior sequência) · números do acervo |
| **Edições** | lista ano → campeão → vice |
| **Clubes** | participantes históricos com títulos |
| **Maiores campeões** | contagem por clube |
| **Temporadas** | resumo por edição: partidas, gols, artilheiro, 3º |
| **Pontos corridos** | tabela histórica + recordes (maior goleada, jogo com mais gols) + campeões derivados + **evolução rodada a rodada** |

**Liga para:** clube → `/clubs/[id]`; edição → `/competitions/[id]?tab=temporadas&season=X`;
país → `/competitions?country=XX`; partida do recorde → `/matches/[id]`.

**Regra:** a régua de pontos vai no `caption` da tabela; sem isso o número não é auditável.

---

### 3.4 Tabela `/tabelas` *(nova — hoje é aba dentro da competição)*
**Contém:** classificação completa (20 clubes × 11 colunas) · forma recente em letras `V/E/D` ·
zona por **barra de forma** (não só cor) · critério de desempate declarado.

**Liga para:** clube → `/clubs/[id]`; competição → `/competitions/[id]`.

**Por que página própria:** a tabela é o artefato mais consultado do futebol e hoje só existe
dentro da competição. Merece URL, favorito e compartilhamento.

---

### 3.5 Partida `/matches/[id]`
**Contém:** placar em display de 120 px · gols com minuto e autor · escalações · ficha técnica
(estádio, público, árbitro, rodada, fonte).

**Liga para:** clube (2×) → `/clubs/[id]`; jogador → `/players/[id]`; competição →
`/competitions/[id]`; estádio → `/estadios/[id]`; temporada → `/temporadas/[ano]`.

**É a página que mais liga outras** — quatro tipos de entidade numa só. Por isso o placar é o
maior elemento: é o que o usuário veio buscar.

---

### 3.6 Clubes `/clubs`
**Contém:** busca ampla (nome, cidade, país) · índice por país (220) · **hierarquia estado → cidade**
(393 estados, cidades dentro do estado) · clubes mais visitados.

**Liga para:** clube → `/clubs/[id]`; estado → filtra por estado; cidade → filtra por cidade.

**Regra:** cobertura declarada ao lado do título (ex.: "2.815 de 12.017 clubes com estado").

---

### 3.7 Clube `/clubs/[id]`
**Contém:** identidade (nome, fundação, cidade, estádio) · 4 pilares (títulos, jogos, gols,
fundação) · **parede de honrarias** (competição → títulos → anos) · linha do tempo · elenco ·
últimos jogos · **evolução do escudo** (com licença por item).

**Liga para:** competição de cada título → `/competitions/[id]?tab=campeoes`; jogador do elenco →
`/players/[id]`; partida → `/matches/[id]`; estádio → `/estadios/[id]`; cidade →
`/clubs?city=X`; escudo → página de origem no Commons.

---

### 3.8 Jogadores `/players`
**Contém:** busca · filtros (país, posição, faixa de nascimento) · lista densa com nome, país,
posição, período.

**Liga para:** jogador → `/players/[id]`.

**Nota:** a hierarquia por estado/cidade **está bloqueada**: `Player` não tem campo de
localidade. Precisa de migração antes.

---

### 3.9 Jogador `/players/[id]`
**Contém:** biografia (nome completo, apelido, nascimento, país) · carreira em tabela (clube,
período, jogos, gols, média) · feitos datados · títulos.

**Liga para:** clube de cada linha → `/clubs/[id]`; competição → `/competitions/[id]`; partida de
um feito → `/matches/[id]`.

---

### 3.10 Rankings `/rankings` *(stub hoje — 72 rankings, 1.954 entradas)*
**Contém:** as **réguas** disponíveis (Clubes, Jogadores, Competições, Seleções, Técnicos) ·
ranking selecionado em tabela (posição, variação, pontos, decomposição: mundial/continental/nacional) ·
**o critério aberto**: como a pontuação é calculada.

**Liga para:** clube → `/clubs/[id]`; outro ranking → `/rankings/[slug]`; metodologia →
`/metodologia#ranking`.

**Por que importa:** um ranking sem critério visível é opinião. O critério é parte do produto.

---

### 3.11 Ranking (detalhe) `/rankings/[slug]` *(nova)*
**Contém:** a régua completa (1.954 clubes), com filtro por país e por década · nota do critério ·
histórico de edições.

**Liga para:** clube → `/clubs/[id]`; edição anterior → `/rankings/[slug]?edicao=2024`.

---

### 3.12 Lendas e Imortais `/legends`
**Contém:** faixa escura (única do produto) · 3 números-âncora · maiores jogadores da história
(ranking com retrato e feito) · maiores times · recordes.

**Liga para:** jogador → `/players/[id]`; clube → `/clubs/[id]`; recorde → a partida que o
estabeleceu.

---

### 3.13 Mapa `/map`
**Contém:** coropleto do acervo · lista lateral por país com **barra de intensidade** · total.

**Liga para:** país → `/clubs?country=XX`.

**Regra:** a intensidade é a densidade do acervo, não a população.

---

### 3.14 Comparar `/compare`
**Contém:** dois clubes escolhidos · métricas na **mesma linha de base** (títulos, jogos, gols,
libertadores, brasileiros, sócios).

**Liga para:** clube → `/clubs/[id]`.

**Regra:** as duas colunas precisam vir da mesma fonte — comparar números de origens diferentes é
comparar réguas diferentes.

---

### 3.15 Estádios `/estadios` *(nova — 84 catalogados)*
**Contém:** lista por país e por capacidade · busca.

**Liga para:** estádio → `/estadios/[id]`.

---

### 3.16 Estádio `/estadios/[id]` *(nova)*
**Contém:** nome, inauguração, capacidade · maior público (número-âncora) · **clubes que mandam
aqui** · maiores públicos em tabela.

**Liga para:** clube → `/clubs/[id]`; partida → `/matches/[id]`; cidade → `/clubs?city=X`.

**É a página que faltava para fechar o ciclo clube ↔ estádio.**

---

### 3.17 Temporadas `/temporadas` e `/temporadas/[ano]` *(nova — 32 no banco)*
**Contém (detalhe):** todas as competições daquele ano, com campeão e artilheiro · a temporada em
ordem (abertura → meados → retas → encerramento) · números da temporada.

**Liga para:** competição → `/competitions/[id]`; clube → `/clubs/[id]`; tabela →
`/tabelas?season=2024-25`.

**Por que existe:** hoje a temporada só aparece como rótulo dentro da competição. Ela é a unidade
que o torcedor usa ("o ano de 2019").

---

### 3.18 Busca `/search` *(stub de 17 linhas)*
**Contém:** campo grande · resultados **agrupados por tipo** (clubes, jogadores, competições,
estádios, cidades) · contagem por grupo · destaque do termo.

**Liga para:** todas as páginas de entidade.

**É o eixo transversal**: a página que qualquer uma pode chamar e que leva a qualquer uma.

---

### 3.19 Favoritos `/favoritos` *(stub de 12 linhas)*
**Contém:** *mudou desde sua última visita* (o motivo de voltar) · tudo que o usuário segue,
por tipo, com última mudança e ação.

**Liga para:** as páginas favoritadas + `/auth/login` se não houver conta.

---

### 3.20 Mercado da bola `/mercado-da-bola`
**Contém:** transferências · valores · janela por temporada.

**Hoje:** 1,8 KB — praticamente vazio. Ou ganha dados, ou sai do menu.

---

### 3.21–3.23 Conta, Admin e Institucional

**Conta:** `/auth/login` → `/dashboard` (painel) → `/dashboard/subscription` → `/checkout` →
`/planos`; `/notifications`.

**Admin (12 rotas):** Operação · Moderação de clubes · Revisão · Upload/ingestão · Catálogo ·
Auditoria · Métricas · Observability · Diagnostics · LGPD · Reports · Usuários.
Mesma espinha visual, **sem cenografia**: barra escura fina, KPIs densos, tabelas de fila, log.
Admin não é vitrine — é ferramenta.

**Institucional:** `/metodologia` (**25,6 KB — a página que sustenta todo número**) · `/sobre` ·
`/fontes` · `/privacidade` · `/termos` · `/cookies` · `/seguranca` · `/direitos-autorais` ·
`/como-usamos-ia`.

---

## 4. As ligações — regras do sistema

**Toda página de entidade é alcançável por três caminhos:**
1. **índice** (a lista da família: `/clubs`, `/players`, …);
2. **contexto** (de dentro de outra entidade: clube → competição, partida → clube);
3. **busca** (transversal).

**Nenhuma página é beco sem saída.** Toda ficha tem procedência e ao menos uma saída lateral:
- Competição → clube, edição, temporada
- Clube → competição, jogador, partida, estádio, cidade
- Jogador → clube, competição, partida
- Partida → **clube, jogador, competição, estádio** (a mais conectada)
- Estádio → clube, partida, cidade
- Temporada → competição, clube, tabela
- Ranking → clube, metodologia

**O grafo resultante:** partida é o nó central; estádio é a ponte que faltava entre clube e
cidade; temporada é o eixo temporal que hoje não existe.

---

## 5. O que falta, em ordem de valor

| # | Página | Situação | Dados |
|---|---|---|---|
| 1 | **Home** | desenhada, não implementada | prontos |
| 2 | **Ranking (detalhe)** | desenhada | **72 / 1.954 prontos** |
| 3 | **Estádio** | desenhada | **84 + 3.475 prontos** |
| 4 | **Temporada** | desenhada | **32 prontos** |
| 5 | **Busca** | desenhada | depende de índice |
| 6 | **Favoritos** | desenhada | 37 prontos |
| 7 | **Tabela** (URL própria) | desenhada | prontos |
| 8 | **Estádios** (índice) | a desenhar | 84 |
| 9 | **Rankings** (índice) | desenhada | 72 |
| 10 | **Mercado da bola** | sem dados | **sem fonte** |

**Bloqueio conhecido:** jogadores por estado/cidade exige migração — `Player` não tem campo de
localidade.
