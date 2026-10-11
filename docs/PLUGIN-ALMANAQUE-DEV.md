# Plugin `almanaque-dev` — workflows operacionais do projeto

Este repositório entrega, junto com o código, um **plugin do ZCode** com **skills** e **subagentes** que codificam o
método que o projeto validou em produção (T510→T517 e as rodadas anteriores). A intenção é que o próximo agente — ou o
próximo round — não reaprenda no código os erros que já custaram ciclo de CI e dado errado no acervo.

## O que vem dentro

| Componente | Para quê |
|---|---|
| skill `prod-railway` | Rodar script/SQL **dentro** do container (o banco não é alcançável localmente), esperar deploy sem cair na armadilha do `railway deployment list`, cache/Redis, smoke. |
| skill `wikidata-entity` | Derivar QID do artigo (nunca da memória), validar clube/seleção/competição por classe, e os **datatypes** que quebram (P297 é string, qualificador é snak cru, P571 tem vários valores). |
| skill `wiki-table-parser` | Estender o parser de tabelas da Wikipédia com disciplina de **fixture** + a tabela de **armadilhas reais** (legenda colada, spans invisíveis, entidade numérica, coluna sem rótulo, artilheiro = clube…). |
| skill `release-loop` | O ciclo branch → testes → PR → CI → merge → deploy → produção → smoke → worklog, com os bloqueios já conhecidos (token expirado, PR conflitante não roda CI, hook quebrado, temporário no commit). |
| skill `idempotent-seed` | Os 5 invariantes de um seed do acervo (dedup por chave natural, zero overwrite, anexar em vez de duplicar, proveniência reversível, re-run noop) e as armadilhas do Prisma (`DbNull` ≠ `undefined`, TEXT/TIMESTAMP, GRANT). |
| agente `fonte-scout` | Batedor: resolve QIDs, valida entidades, inspeciona a tabela real e confere campeões contra a realidade — devolve relatório enxuto, **sem tocar o banco**. |
| agente `prod-runner` | Executa dry-run → apply no container e prova o noop — devolve só o resumo (mantém o contexto principal limpo). |
| agente `gate-verifier` | Confere o dado gravado contra a fonte externa e devolve divergência com evidência (gravado × real × fonte). |

## Como ativar

São dois caminhos, e eles se complementam:

### 1. No repositório (já ativo, versionado)

As skills e os subagentes vivem no escopo do workspace em **`.zcode/skills/`** e **`.zcode/agents/`** — o ZCode
descobre esses diretórios automaticamente, num projeto só. É a mesma convenção do `.claude/` que o repo já commita.

A **fonte canônica é o plugin** (`plugins/almanaque-dev/`). Depois de editar uma skill/agente, sincronize:

```bash
bash plugins/almanaque-dev/scripts/sync-to-workspace.sh          # escreve
bash plugins/almanaque-dev/scripts/sync-to-workspace.sh --check  # só relata drift (CI)
```

Não edite `.zcode/` à mão: a próxima sincronização sobrescreve.

### 2. Como plugin instalável (para outros workspaces)

O plugin é portátil — vale para qualquer projeto que fale com este acervo. A instalação é **pela interface** (é o
caminho suportado pelo ZCode; não há CLI `zcode` no PATH desta máquina):

1. **Settings → Plugin Marketplace → Add → Add Plugin Marketplace**
2. Cole o diretório: `D:\PROJETOS\Almanaque dos Clubes\Almanaque dos Clubes\plugins`
3. **Personal → Almanaque Dev → Install** (plugin id `almanaque-dev@dev-almanaque-dos-clubes`, versão `0.1.0`)

O catálogo local está em `plugins/marketplace.json` e aponta para `./almanaque-dev`.

## Por que plugin e não só documentação

A documentação do repo (`docs/AGENTS.md`, `docs/DECISOES.md`, `docs/worklog.md`) registra **decisões**; as skills
registram **como fazer** — com o comando exato, o campo exato e o erro exato que já aconteceu. A diferença prática:
uma skill é carregada sob demanda pelo agente (poucos tokens, no momento em que ela importa), enquanto uma decisão
enterrada no DECISOES.md só é lida se alguém souber que existe.

Os subagentes existem pela razão oposta: eles leem o ruído (saída crua de ETL, ~40 linhas de SEM-MATCH, HTML de 1 MB)
e devolvem 15-20 linhas — o contexto principal fica barato e focado na decisão, não na leitura.
