# Migração de Config-as-Code (railway.json) para Infrastructure as Code (.railway/railway.ts)

> **Status: PLANO APROVADO PARA JANELA FUTURA — NADA FOI APLICADO.**
> O arquivo `.railway/railway.ts` está no repositório e é **inerte**: só passa a valer com
> `railway config apply`. A execução está agendada para a janela **21-10-2026 a 30-11-2026**
> (após a Beta Aberta de 20-10-2026), com comunicação obrigatória ao Operador antes.
> Tarefa: **T544** (planejamento) · origem do aviso: CLI do Railway na rodada T543.

---

## 1. O que a CLI da Railway diz (fonte autoritativa, não a doc web)

A URL de documentação sugerida no despacho (`docs.railway.com/guides/infrastructure-as-code`)
responde **404** hoje. A fonte que vale é a **CLI instalada** — ela própria traz o motor e a
mensagem de depreciação:

```
Config as Code (railway.json / railway.toml) is deprecated. Prefer Infrastructure as Code
(.railway/railway.ts). Run `railway config migrate` or see https://docs.railway.com/...
Existing files keep working until 2026-12-01.
```

Comandos (de `railway config --help`):

| Comando | O que faz |
|---|---|
| `config init` | Cria o arquivo de autoria, ou importa do projeto vinculado |
| `config pull` | **Importa a configuração ATUAL do projeto** para o arquivo de autoria |
| `config migrate` | Traduz `railway.json`/`railway.toml` para o arquivo de autoria (**dry-run por padrão**; `--apply` escreve os arquivos **e limpa a config CaC** dos serviços) |
| `config plan` | **Preview**: mostra o que a Railway faria, sem aplicar |
| `config apply` | Aplica o arquivo ao projeto vinculado |

Respostas às perguntas que decidem o risco da migração:

1. **É auto-detectada? NÃO.** O arquivo de autoria **só vale depois de `config apply`**. Commitar
   `.railway/railway.ts` não muda nada em produção — verificado: a CLI avalia o arquivo
   localmente, não o publica.
2. **`migrate --apply` é o que corta a ponte**: além de escrever o arquivo, ele **limpa a
   configuração de Config-as-Code dos serviços**. É uma via de mão única na prática (ver rollback).
3. **Variáveis NÃO vão para o arquivo por padrão.** O import marca cada uma como `preserve()`
   ("deixe como está, não é gerenciada por código"). `--include-variables` existe, mas é opt-in
   e **não foi usado** — então **nenhum segredo entra no repositório** (conferido linha a linha).

## 2. Mapa da configuração atual (importada do projeto real)

`railway config pull --json` (executado **só para leitura**; o JSON contém valores e por isso
**não** foi para o repositório — ficou fora, em `D:\AITEMP\`):

| Recurso | Tipo | Detalhe |
|---|---|---|
| `Almanaque-dos-Clubes` | serviço | **API**. 44 variáveis, domínio `api.almanaquedosclubes.com:3000`, endpoint privado `almanaque-dos-clubes`, healthcheck `/api/v1/health` (120 s) — vinha de `railway.json` |
| `media-worker` | serviço | **worker de mídia** (criado no T543). 10 variáveis (por referência). **Sem healthcheck por desenho**: o serviço não expõe HTTP; a config dele é `railway.worker.json` |
| `email-worker` | serviço | terceiro serviço, **já existia** antes desta rodada (8 variáveis, `WORKER_MODE`) — o despacho citava dois; o mapa real tem três |
| `Redis` | banco | região `sfo` |
| `Postgres` | banco | região `sfo` |
| `postgres-volume`, `redis-volume` | volumes | 5.000 MB cada, alertas de uso |
| `Postgres-PITR` | bucket | região `sjc` |

Os três serviços usam a **mesma fonte**: `github("ENDARTStudios/Almanaque-dos-Clubes")`, branch `main`.

## 3. O arquivo `.railway/railway.ts` (escrito e validado)

Gerado por `railway config pull` a partir do estado REAL do projeto (mais fiel que traduzir o
`railway.json`), com todos os 8 recursos:

- `repo = github("ENDARTStudios/Almanaque-dos-Clubes", { checkSuites: false })`
- os 3 serviços com `source: repo`, `replicas`, `env` **todo em `preserve()`**
- a API com `domains`/`networking`; o `media-worker` e o `email-worker` sem healthcheck
- bancos, volumes e bucket declarados

**Defeito encontrado e corrigido no arquivo gerado (a validação já pagou por si):** o gerador
nomeou a constante da fonte GitHub com o **mesmo identificador** do serviço da API
(`AlmanaqueDosClubes`) — o slug do repositório e o nome do serviço colidem no camelCase. O
arquivo **não compilava** (`Identifier 'AlmanaqueDosClubes' has already been declared`), e quem
pegou foi o `railway config plan`, que avalia o arquivo com Node antes de qualquer diff.
Renomeado para `repo` (e os três `source:` apontam para ele).

### Validações feitas hoje (sem tocar em produção)

| Verificação | Resultado |
|---|---|
| `railway config plan` (avaliação do arquivo) | **acusa o defeito → corrigido → arquivo compila** |
| Tipos: `tsc --noEmit` no arquivo com o SDK instalado | **passa** |
| Typecheck do monorepo (`pnpm typecheck`, o mesmo do CI) | **4/4 tarefas OK** — o `.railway/` não entra no grafo dos pacotes |
| Formatação (`prettier --check`) | **passa** (foi preciso rodar `--write`: o estilo do gerador não é o do repo) |
| Segredos no arquivo | **nenhum** — todo `env` é `preserve()` |
| Efeito em produção | **nenhum**: o arquivo só vale com `config apply` |

### Pré-requisito que ficou pendente de propósito

`railway config plan` **não roda** nesta máquina ainda:

```
This version of railway/iac requires Railway CLI 5.42.1 or newer.
The IaC engine now ships in the CLI, not the TypeScript SDK.
```

A CLI instalada é anterior à 5.42.1 — **o motor IaC agora vive na CLI**. O upgrade
(`railway upgrade --yes`) é o **passo 0 da janela**, e **não foi feito agora de propósito**:
trocar a CLI no meio de uma rodada com deploy de produção em andamento é risco desnecessário
para uma migração que só vai acontecer em novembro.

## 4. Roteiro da execução (na janela, com o Operador avisado)

```bash
# 0. Toolchain (requisito da própria migração)
railway upgrade --yes && railway --version      # precisa >= 5.42.1

# 1. Backup do estado atual (rollback)
git tag iac-pre-migration && cp railway.json /tmp/railway.json.bak

# 2. Preview: revisar o diff ANTES de aplicar (nada muda aqui)
railway config plan                              # esperado: sem surpresas destrutivas
#    ⚠️ Se o plan propuser REMOÇÃO de recurso (banco, volume, bucket, serviço),
#    PARE: recursos não citados podem ser interpretados como "remover".

# 3. Aplicar (aqui a config CaC dos serviços é limpa)
railway config apply

# 4. Verificar serviço a serviço
railway service status                           # os 3 serviços
railway logs --service Almanaque-dos-Clubes      # boot + healthcheck
railway logs --service media-worker              # "consumindo a fila media-enrich"
railway metrics --service Almanaque-dos-Clubes   # latência no baseline
curl -s -o /dev/null -w '%{http_code}\n' https://api.almanaquedosclubes.com/api/v1/health
curl -s -o /dev/null -w '%{http_code}\n' https://almanaquedosclubes.com/matches

# 5. Colher os arquivos antigos só DEPOIS de tudo verde
#    (`config migrate --delete-files` faria isso; não usamos: queremos o rollback disponível)
```

**Horário recomendado:** logo **após** os jobs noturnos (que terminam às 07:00 UTC), com a API
em tráfego baixo — a janela de menor risco é **07:00-09:00 UTC** num dia de semana.

## 5. Plano de rollback

O risco é **assimétrico** e está declarado: `config apply` **limpa a configuração CaC** dos
serviços, então voltar não é só apagar o arquivo.

1. **Antes de aplicar:** `git tag iac-pre-migration` + cópia de `railway.json`/`railway.worker.json`.
2. **Se o `plan` ou o `apply` der errado:**
   - `git revert` do commit do `.railway/` (ou `rm -rf .railway`),
   - restaurar a config CaC de cada serviço (a configuração de arquivo de config volta a
     apontar para `railway.json`/`railway.worker.json` — pela CLI/`railway.json` no repo ou
     pelo painel, por serviço),
   - `railway redeploy --service <nome>` para os deploys voltarem à configuração antiga.
3. **O que o rollback NÃO precisa refazer:** variáveis. Elas estão em `preserve()`, ou seja,
   **a migração não as gerencia** — nenhum valor é apagado ou reescrito por `apply`.
4. **Pior caso declarado:** se a migração deixar um serviço sem config de build correta, o
   redeploy falha e o serviço **continua rodando a última imagem** (deploy só substitui em caso
   de sucesso). Não há janela de indisponibilidade por essa via.

## 6. Agendamento

| Item | Valor |
|---|---|
| Janela definida pelo Operador | **21-10-2026 a 30-11-2026** (após a Beta de 20-10) |
| Data proposta para o apply | **28-10-2026**, 08:00-09:00 UTC (após os jobs noturnos, dia de semana) |
| Pré-voo | agendado: **21-10-2026** — roda `railway config plan`, confere o diff e traz o relatório para o go/no-go |
| Prazo externo | **01-12-2026** (a Railway avisa que a config antiga para de funcionar) |
| Comunicação | obrigatória antes do apply; o pré-voo é o momento declarado para isso |

**Limite declarado deste plano:** o `plan` final (com o diff real) só roda depois do upgrade da
CLI, que é o passo 0 da janela. Hoje o que está provado é que o arquivo **compila**, **não
quebra o CI**, **não contém segredo** e **não tem efeito nenhum até o `apply`**.
