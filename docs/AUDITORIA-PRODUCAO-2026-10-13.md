# Auditoria de produção — https://almanaquedosclubes.com (13-10-2026)

**Escopo:** auditoria visual, de acessibilidade e técnica da produção. Quatro frentes
independentes, cada uma com medição própria: QA visual em 3 breakpoints (36 screenshots),
crítica de design adversarial, WCAG 2.2 AA com contraste composto em canvas, e verificação
técnica/dados (API, infra, acervo e plausibilidade).

**Veredito em uma linha:** a base técnica é sólida e o acervo é honesto no que publica, mas o
produto **não passa** — há um P0 de layout no perfil de clube em mobile, um P0 de **preço
contraditório na página de planos**, P0 de nome acessível em duas buscas, e os clubes mais
buscados aparecem **sem escudo** enquanto 99,6% das competições não têm nenhum jogo.

**Nota de método:** a auditoria rodou contra o commit `d7a0b21` (o redesenho de login que a
sessão paralela publicou). QA visual: 36 screenshots em 1440/768/390. A11y: 168 pares de cor
medidos com composição em canvas. Ambos declararam o que NÃO puderam verificar.

---

## P0 — quebra uso ou confiança

### 1. `/planos` mostra um preço anual que contradiz o checkout (verificado ao vivo)
O texto renderiza, literalmente:

> "R$ 4,90/mês ou **R$ 4,90 anual** com 15% de desconto (12 × mensal)" — e o mesmo no Elite:
> "R$ 9,90/mês ou **R$ 9,90 anual** …"

O token do valor mensal foi reusado no lugar do anual. O botão de checkout da mesma página
calcula `490 × 12 × 0,85` = **R$ 49,98/ano**. Logo: dois preços anuais contraditórios na mesma
tela, e o texto sugere 12 meses pelo preço de um. **É a falha mais grave** (comercial e de
confiança; é a tela que pede dinheiro).
*Evidência:* HTML servido de `/planos` (2 ocorrências) + `ContentDocument.tsx:29-32` (só
substitui `{free}/{proMonthly}/{eliteMonthly}`) × `CheckoutButton.tsx:97`.

### 2. `/clubs/<id>` a 390 px: título colapsado e botão por cima
O `h1` do perfil tem **largura computada 0 px** (uma palavra por linha, 5 linhas, altura 180) e o
botão "♡ Favoritar 0 torcedores" (**183×34**) fica **sobreposto** ao título. O nome do clube — a
informação mais importante da página — é ilegível no celular.
*Evidência:* `D:\AITEMP\audit-shots\shots\club-detail-mobile.png` + medidas do QA visual.

### 3. Buscas sem nome acessível (`/clubs` e `/competitions`) — WCAG 4.1.2 + 3.3.2 (nível A)
Os dois inputs de busca só têm `placeholder` e `wrap="no"`, sem `aria-label` nem `<label for>`.
Um leitor de tela anuncia "caixa de edição" sem dizer de quê.

### 4. A página `/matches` está órfã
Responde 200, mas **nenhum link do site aponta para ela** (a home tem 0 links para `/matches` e 2
para cada uma das outras seções) e ela **não está no sitemap**. Uma seção com 17.265 partidas por
trás é inalcançável por navegação e invisível para busca.
*Pendência já declarada no T541* (o link do `Navbar` ficou de fora por colisão de sessão), mas o
efeito é maior do que "falta um link": o conteúdo não existe para o usuário.

---

## P1 — degradam leitura, uso ou confiança

| # | Achado | Medido | Onde |
|---|---|---|---|
| 1 | **500 em data inválida** — `/matches?dateFrom=2026-13-45` | HTTP **500** (reproduzível) | regressão **minha**, do T541: o filtro de data que eu liguei não valida o parâmetro |
| 2 | **Overflow horizontal** em `/rankings` | **+54 px** a 390 (`scrollWidth 444`) e **+124 px** a 320 — o `<select>` de competição tem 428 px | WCAG 1.4.10 |
| 3 | **Alvos de toque < 24 px** | botões de idioma **17×18, 17×18, 15×18**; nav do header 20 px; links do footer 17 px | WCAG 2.5.8 (AA) |
| 4 | **Zero fabricado no ranking** | base ausente vira "**0 partidas / 0 títulos**" em vez de "—" | `RankingsTable.tsx:405-408` |
| 5 | **Zero fabricado na listagem** | em falha da API, `/clubs` escreve "Explore **0** clubes de futebol cadastrados" | `app/clubs/page.tsx:25,45` |
| 6 | **Zero fabricado no perfil** | linhas Casa/Fora montadas com `goalDiff: 0, points: 0` **forçados** e exibidos como dado | `clubs/[id]/page.tsx:727-740` |
| 7 | **Categoria inventada** | país nulo vira o filtro "**Internacional**" (166 de 1.932 competições, 8,6%) | `app/competitions/page.tsx:217-221` |
| 8 | **Idioma misturado na UI pt-BR** | `/players` mostra nomes em **coreano** ("펠리피 아우구스투 소우자 다 시우바") e papel em inglês ("FORWARD · AU") | QA visual, 390 px |
| 9 | **Resultado vazio não anunciado** | há texto de vazio, mas **0 regiões ao vivo** (sem `aria-live`/`role=status`) | WCAG 4.1.3 (AA) |
| 10 | **Grafo cru no perfil** | "Clubes relacionados" imprime `{relação} · {tipo} · <UUID em mono>` sem nome nem link | `clubs/[id]/page.tsx:830-855` |

---

## P2 — polimento, SEO e higiene técnica

- **`<title>` duplicado** em 3 rotas: `/rankings`, `/planos` e `/matches` (a minha) saem
  "… | Almanaque dos Clubes | Almanaque dos Clubes"; as outras 5 estão corretas.
- **Salto de heading `h1→h3`** em `/clubs`, `/rankings`, `/matches`, `/players` — dois agentes
  independentes apontaram o mesmo; falta um `h2` intermediário.
- **Sem separador de milhar e inconsistente**: `/clubs` "12003", `/players` "105211",
  `/competitions` "1932" — enquanto `/matches` usa "17.265" corretamente.
- **Tabela de rankings renderiza só no cliente**: o HTML inicial de `/rankings` não traz
  **nenhum** nome de clube (SEO e primeiro paint).
- **Rota pela metade**: `/rankings/:id/entries` devolve as entradas **sem o clube**; a página usa
  `/rankings/entries?rankingId=` (que tem `clubName`) — a outra rota é contrato incompleto.
- **Parâmetro inválido ignorado em silêncio**: `/rankings/entries?rankingId=xxx` devolve **o
  último ranking** em vez de 422/vazio.
- **Copy contra o número**: a home diz "Um acervo, **quatro** respostas" sobre **6** cards.
- **Emojis em `<h2>`** em `/competitions` (🏆⚽♀🌍) fora da linguagem de ícones do sistema.
- **Higiene de produção**: variável `T430_PROBE=ping-430` (artefato de teste) viva no serviço.
- **`/metrics` público** (T422): expõe contagem por status, falhas de auth e horário do último
  backup — **sem segredo nem PII** (conferido), mas é informação operacional aberta; o gap
  "observabilidade sem exposição" segue aberto.
- **Cabeçalhos**: o web tem CSP, HSTS (`max-age=63072000`), `nosniff` e `X-Frame-Options: DENY`,
  mas o HSTS **sem `includeSubDomains`/`preload`** (a API tem) e **sem `Permissions-Policy`**.
- **Documentação desatualizada**: a skill `design-system-almanaque` descreve a paleta **clara**
  como produção; o `globals.css` é **escuro editorial por padrão** (`#12100f`) e a clara é a
  exceção `.theme-light` do mapa.

---

## Gaps de ACERVO (dado ausente — curadoria, não defeito de tela)

| Campo | Cobertura | Observação |
|---|---|---|
| clubes | **12.003** | — |
| escudo (`logoUrl`) | **290 (2,4%)** | **Real Madrid, PSG, Bayern, Man City e Flamengo estão SEM escudo** |
| cores (`teamColors`) | **2 (0,02%)** | praticamente zero |
| nome de estádio | 531 (4,4%) | e só **84** têm entidade `Stadium` |
| foto de estádio | 314 (2,6%) | — |
| texto editorial | 1.125 (9,4%) | curado do Wikidata/Wikipedia |
| uniforme | **2.311 (19,3%)** | resultado do lote do T535 — 10× o que era |
| hino | 14 | limite da fonte (T524) |
| flâmula | 7 | limite da fonte (T525) |
| modelo 3D (360º) | 0 | limite da fonte (T526) |
| jogadores | **105.211** | foto **864 (0,8%)**; `clubId` **0%**; sem posição 16% |
| matches | **17.265** | em **7 de 1.932 competições (0,4%)** |
| rankings | **70** | em 1.932 competições (3,6%) |
| temporadas com campeão | **114** (CompetitionSeason, 21 competições) | campeões conferidos e corretos |

### A causa-raiz que eu introduzi (declarada no T536)
Ao desativar `enrich-clubs-media` e `enrich-clubs-editorial` (recomendação do despacho, justificada
porque os dois estavam travados), verifiquei agora: **ninguém mais cobre escudo, estádio, cores e
texto editorial** — o job incremental do Wikidata trata **só coordenadas**, e o job unificado do
T528 trata **só kit/hino/flâmula**. Esses quatro campos estão **congelados**. Prova: cores em 2 de
12.003 e escudo parado em 290 desde o T533. O conserto é pequeno e conhecido (aplicar o cursor
`mediaEnrichment` nos dois jobs e religá-los, ou absorver a lógica deles no job unificado) — mas
**não foi feito**: esta rodada é auditoria.

---

## O que está BEM (e a auditoria tem de dizer)

- **Contraste: 0 reprovações** em 168 pares de cor medidos (o menor aprovado: 4,70:1) ✓
- **Foco, teclado e movimento reduzido corretos**: `:focus-visible` global nunca removido, ordem de
  tabulação lógica sem armadilha, carrossel sem autoplay sob `prefers-reduced-motion` ✓
- **Vazio-honesto e proveniência por item** em `/matches` e no perfil; a hero declara lacuna em vez
  de fingir métrica ✓
- **Zero imagem quebrada, zero overflow em 1440 e 768**, nenhum 404 de asset ✓
- **Dados plausíveis**: Leverkusen 2023/24, Botafogo 2024 (Brasileirão e Libertadores), Fluminense
  2023, Palmeiras 2021/22/23 — conferem ✓
- **Tráfego de produção 100% 2xx** (fora a janela de restart) e endurecimento de API correto (UUID
  inválido → 404, rate-limit 100/min por IP, `/jobs/health` protegido) ✓
- **i18n funciona no servidor** onde é lido no servidor (`/matches`: Partidas/Matches/Partidos) ✓

---

## Ordem sugerida (decisão do Operador)

1. **P0 de preço** (`/planos`) — é dinheiro e confiança; correção de um token.
2. **P0 de layout** do perfil em 390 px + **nome acessível** das duas buscas.
3. **Link + sitemap do `/matches`** — destrava uma seção inteira que já existe.
4. **Os três "zeros fabricados"** (rankings, listagens, perfil) — é a regra da casa.
5. **Fechar o buraco de mídia** (escudo/estádio/cores/editorial) — é o que faz o acervo parecer
   casca nos clubes mais buscados.
6. O 500 de data inválida (`/matches`) e o reflow de `/rankings` a 320-390 px.
