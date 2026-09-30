# MCP Servers — Shortlist avaliada (fonte: punkpeye/awesome-mcp-servers)

> Data: 2026-09-29 · Contexto: análise de ~30 repositórios de tooling para o projeto.
> Referência de descoberta: [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
> (categorias: Location Services, Databases, Browser Automation, Developer Tools).

## Estado atual

- `.mcp.json` (commitado): **graft** (`npx -y @nanonets/graft mcp`) — grafo de contexto do repo.
- Config de usuário (`~/.zcode`): plugin browser-use; skills em `~/.agents/skills/`.
- Hooks graft (statusline, post-edit blast radius, tool-savings) em `.claude/settings.json`.

## Critérios de admissão

1. **Local-first**: roda via stdio/stdio-like na máquina do agente; sem serviço pago.
2. **Zero segredo no config commitado**: se precisa de credencial, usa expansão de env
   (`${VAR}`) — validar que o cliente expande antes de commitar; MCPs com dependência
   local de desktop vão no config de **usuário**, nunca no `.mcp.json` do repo.
3. **Custo de contexto positivo**: cada server adiciona schemas de tools ao contexto;
   só entra se substituir um fluxo atualmente mais caro (ex.: re-exploração de código).

## Recomendados (próxima janela)

| Server | Para quê | Onde | Caveat |
|---|---|---|---|
| `crystaldba/postgres-mcp` (modo restricted/read-only) | Inspeção de schema Prisma, queries de integridade read-only sem copiar SQL à mão | `.mcp.json` do repo com `${DATABASE_URL}` | Testar expansão de env no cliente antes de commitar; **nunca** modo rw; RLS FORCE em prod |
| ~~`screaming-frog-mcp`~~ (avaliado e **descartado** 2026-09-29) | Crawl SEO headless para auditoria pré-release | — | **Requer licença PAGA do Screaming Frog**: a CLI headless exige `licence.txt` (username+chave, £199/ano); tier free só GUI (500 URLs manuais). Entrada removida do config de usuário. Custo zero equivalente: `scripts/local/seo-crawl.mjs` (crawler Node próprio) |

## Avaliados e descartados (por ora)

- **github MCP** — `gh` CLI já cobre (PRs, runs, issues); MCP duplicaria contexto.
- **browser automation MCP** — plugin browser-use do ZCode já provê, com skill dedicada.
- **Nominatim/OSM MCPs** (Location Services) — os scripts de ingestão já falam direto
  com a API; um MCP adicionaria superfície sem fluxo novo.
- **filesystem MCP** — agentes já têm leitura/escrita nativa.
- **postgres MCP modo rw / com seed** — viola regra de append-only/integridade.

## Regra permanente

Qualquer novo MCP entra com: (1) justificativa de fluxo que fica mais barato;
(2) teste de execução via CLI; (3) decisão registrada em `DECISOES.md`.
