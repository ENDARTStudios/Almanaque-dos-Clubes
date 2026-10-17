# ECC — avaliação e decisão

**Decisão: não adotado como plugin. A ideia que valia a pena foi implementada e já encontrou
três defeitos reais.**
Data da avaliação: 2026-10. Autor: agente, a pedido do Operador ("analise os potenciais desse
projeto para benefício do Almanaque… adote apenas as ideias que beneficiam o projeto").

## O que é

[ECC](https://github.com/affaan-m/ECC) ("agent harness operating system") é um plugin distribuído
para _harnesses_ de agente — Claude Code como alvo principal, com caminhos nativos para Codex e
Qoder e adaptadores para Cursor, Gemini, Zed, Copilot e outros.

Números do repositório no dia da avaliação (via API do GitHub, não do README):

|                      |                                                              |
| -------------------- | ------------------------------------------------------------ |
| Estrelas / forks     | 282.136 / 41.952                                             |
| Criado / último push | 2026-01-18 / 2026-10-15                                      |
| Issues abertas       | 237                                                          |
| Licença              | MIT                                                          |
| Tamanho              | 57,2 MB                                                      |
| Catálogo             | 311 skills · 71 agentes · 97 comandos · 23 pacotes de regras |

A tese dele: `plan → test → implement → review → verify → remember → improve`, instalado uma vez
em vez de reescrito em cada prompt. Traz hooks de runtime, memória de sessão, "instintos"
aprendidos e o **AgentShield**, um scanner de configuração de agente.

## Por que não adotado como plugin

1. **Não é para o harness que este projeto usa.** O runtime aqui é o DSH. O ECC instala em
   `.claude/`, `.codex/`, `.cursor/`… e não tem alvo DSH. Adotá-lo significaria trocar de harness
   para usar o plugin, não integrar o plugin ao harness.

2. **As regras genéricas são mais fracas que os gates que já existem.** `rules/common/security.md`
   é uma lista em prosa ("no hardcoded secrets", "validate all user inputs"). Este projeto tem
   `gitleaks`, `security-gate`, RLS, `ui:audit:ci`, `preflight` — verificações objetivas. Trocar
   gate por checklist seria regressão.

3. **O AgentShield é específico de Claude Code** (`ecc-agentshield` npm: "Scans Claude Code
   setups"). Não acharia nada aqui.

4. **311 skills, das quais quase nenhuma se aplica.** O catálogo é orientado a frontend genérico,
   ML, blockchain, SaaS. As necessidades deste projeto — acervo de futebol, i18n em três locales,
   RGPD, ETL de Wikidata, gates de design — não estão lá.

## A ideia que valia a pena, e o que ela encontrou

O que se aproveita do AgentShield não é o código: é a **premissa** — _arquivo de instrução de
agente é configuração executável_. O agente obedece o que está escrito ali, então instrução
errada vira ação errada.

Este projeto tem **61 arquivos** que um agente lê e obedece (skills em `.dsh/` e `.zcode/`,
papéis em `.zcode/agents/`, `AGENTS.md`) e **nenhum dos 18 passos do CI os validava**. Rodando a
ideia contra eles, três instruções estavam **falsas**:

### 1. A skill mandava pular um hook que funciona

`release-loop` instruía `git commit --no-verify` porque "o hook `pre-commit` está quebrado por
incompatibilidade" — o `getFilename is not a function` do `eslint-plugin-react` com ESLint 10.

**Esse bug foi corrigido** fixando `eslint@^9`, e o hook foi verificado funcionando: roda
`prettier --write` e `eslint --fix` nos arquivos staged e o commit passa.

Consequência medida: numa única sessão, **8 commits saíram com `--no-verify`** por causa dessa
instrução — incluindo os desta minha própria sessão. A skill ensinava a pular exatamente a
verificação que ela existe para garantir, e era obedecida.

### 2 e 3. Skills apontando para documentos que mudaram de lugar

- `web-accessibility-wcag` → `docs/ACCESSIBILITY.md`
- `ux-copywriter` → `docs/HERO-NUMEROS.md`

Os dois documentos existem, mas foram movidos para `docs/07-operations-marketing/` na
reorganização de `docs/` (commit `7cb0a52`). A instrução mandava ler um caminho inexistente —
e um agente que não acha o documento tende a concluir que ele não existe (ou a escrever outro).

### O agravante: as cópias

As skills vivem em `plugins/` (fonte canônica) e são **espelhadas** para `.dsh/skills/` e
`.zcode/skills/` — que é o que o runtime lê. A sincronização era feita por
`plugins/scripts/sync-to-workspace.sh`, que exige **bash** — e **não existe bash no PATH desta
máquina Windows** (roteia para a WSL, que responde `execvpe(/bin/bash) failed`).

Resultado: corrigir a fonte não bastava. As cópias continuavam instruindo `--no-verify`, e são
elas que o agente lê.

## O que foi implementado

### `pnpm agents:audit` — auditoria das instruções

Verifica o que é **objetivamente** checável, e só isso:

| Regra                     | Verifica                                                  | Severidade |
| ------------------------- | --------------------------------------------------------- | ---------- |
| `caminho-inexistente`     | caminho em backtick que não existe no disco               | bloqueio   |
| `script-inexistente`      | `pnpm <script>` que não está no `package.json`            | bloqueio   |
| `segredo`                 | forma de segredo (AWS, GitHub, chave privada, JWT, Slack) | bloqueio   |
| `contorno-de-verificacao` | `--no-verify` / push forçado **como comando**             | aviso      |

Não julga prosa, não avalia qualidade de instrução, não detecta instrução maliciosa por
semântica. Fingir isso seria pior que não ter a ferramenta.

### `pnpm agents:sync` — porte da sincronização para Node

Mesma operação do `.sh`, sem exigir bash. Cross-platform. Com `--check`, que relata divergência
sem escrever.

### `pnpm agents:check` — os dois, e no CI

`agents:sync --check && agents:audit --ci`, ligado como passo do workflow de CI. Sem isso, o
drift volta na próxima sessão que corrigir a fonte e esquecer as cópias.

## A lição dos falsos positivos

A primeira versão do scanner acusou **23 problemas**. A maioria era ruído:

- `"Skip silencioso proibido"` — uma **proibição**, lida como instrução de pular;
- ``"Não tente `pnpm tsx scripts/x.ts`"`` — exemplo do que **não** fazer;
- `"encaixa sob os nossos token"` — prosa em português, lida como vazamento de segredo;
- `SECRET="SUA_..."` — placeholder.

Ruído ensina a ignorar o relatório, que é o oposto do objetivo. Três decisões de projeto
decorreram disso:

1. **Só o objetivamente verificável entra como bloqueio.** Prosa não.
2. **Isenções são uma lista declarada com motivo visível** (`ISENCOES_CAMINHO`), não regex
   esperto escondido. Se um falso positivo aparecer, ele é discutível.
3. **Contorno só conta como comando no início da linha.** `git commit --no-verify -m "x"` acusa;
   a frase que _explica_ que a instrução antiga usava o comando **não** acusa. Esse refinamento
   veio de um falso positivo real: a própria documentação da correção fazia a ferramenta acusar.

## Testes

17 em `scripts/agents-audit.test.mjs` (`node --test`, sem framework novo). Cobrem a fronteira que
importa:

- `--no-verify` como **comando** → acusa;
- **menção histórica** ao comando → não acusa;
- `git push --force-with-lease` → não acusa (é a prática correta);
- caminho/script inexistente → bloqueia; existente → não;
- segredo real → bloqueia; prosa → não;
- **o repositório real passa** — regressão de verdade, que fica vermelha se alguém reintroduzir
  uma instrução falsa.

## O que NÃO foi feito

- O ECC **não foi instalado**. Nenhum arquivo `.claude/`, `.codex/` ou `.cursor/` foi criado.
- Nenhuma skill, agente ou regra do ECC foi copiada. O que se aproveitou foi a **premissa**.
- Não há verificação semântica de "instrução maliciosa". Um arquivo pode dizer algo destrutivo em
  prosa e passar — o limite está declarado.
- O `.sh` original **não foi removido**. Ele continua documentado; o Node é o caminho que funciona
  nesta máquina. Se um dia o bash voltar a existir aqui, os dois devem continuar equivalentes.
