---
name: release-loop
description: Ciclo completo de entrega do Almanaque dos Clubes — branch, testes, commit, PR, checks do CI, merge, espera do deploy, execução em produção, smoke ao vivo e worklog. Use ao fechar qualquer rodada de trabalho (feature, fix de dados ou ETL) ou quando um PR precisa ser destravado (CI vermelho, conflito, token inválido).
---

# Ciclo de entrega (PR → deploy → produção)

## Passo a passo

```bash
# 0) branch SEMPRE a partir de origin/main atualizado (main local costuma estar velha e há worktrees)
git fetch origin --quiet && git checkout -B feat/<tarefa> origin/main

# 1) antes do push, rode o LINT DO APP INTEIRO (o CI roda `eslint src tests` — não só nos arquivos tocados)
cd apps/api && npx eslint src tests --fix && npx tsc -p tsconfig.json --noEmit && npx vitest run tests/unit
npx eslint src tests   # confirme 0 ERRORS (warnings do repo são esperados)

# 2) commit — o hook pre-commit FUNCIONA, deixe ele rodar
git add -A && git status --short   # <-- CONFIRA: nenhum arquivo temporário de descoberta entrando
git commit -m "<tipo>(<escopo>): <resumo>"

# 3) PR e checks
git push -u origin feat/<tarefa>
env -u GITHUB_TOKEN -u GH_TOKEN gh pr create --title "..." --body-file <arquivo.md>
env -u GITHUB_TOKEN -u GH_TOKEN gh pr checks <N>     # espere 5/5 pass

# 4) merge (squash) e deploy
env -u GITHUB_TOKEN -u GH_TOKEN gh pr merge <N> --squash
railway deployment list | sed -n '2p'                # aguarde SUCCESS (ver skill prod-railway)

# 5) produção + smoke + worklog (ver skills prod-railway e o formato do worklog em docs/worklog.md)
```

## Armadilhas que custaram ciclos (todas aconteceram)

- **`GITHUB_TOKEN` do ambiente pode estar expirado** e sobrescrever o login do keyring → `HTTP 401 Bad credentials`.
  Use **`env -u GITHUB_TOKEN -u GH_TOKEN gh …`**. (`gh auth status` mostra as duas entradas.)
- **Hook `pre-commit`: NÃO está mais quebrado (corrigido).** Ele quebrava com o ESLint 10
  (`getFilename is not a function` do `eslint-plugin-react`) em QUALQUER `.tsx`, e a instrução antiga
  era usar `git commit --no-verify`. **O bug foi corrigido fixando `eslint@^9`**, e o hook foi
  verificado funcionando: roda `prettier --write` e `eslint --fix` nos arquivos staged e o commit
  passa. **Não use `--no-verify`**: ele pula exatamente a verificação que este skill existe para
  garantir.
  _Se o hook voltar a falhar_, o sintoma é o commit abortar e as mudanças continuarem staged
  (`git status` mostra tudo em `M`, nada commitado). Nesse caso: conserte o hook e registre aqui —
  não contorne com `--no-verify`, porque a próxima pessoa vai herdar a mesma armadilha.
- **PR CONFLITANTE não roda CI**: depois de um merge squash, o commit antigo do branch vira duplicata do commit do
  `main` → `mergeable: CONFLICTING`, `statusCheckRollup` só com Vercel (parece "CI não disparou").
  Corrija com `git checkout -B <branch> origin/main && git cherry-pick <seu-commit>` e `git push --force-with-lease`.
- **`gh pr checks` só fica verde quando o CI termina**; se a lista vier só com Vercel, é sinal de conflito (acima) ou de
  run ainda não criado — não conclua "CI passou" ✗.
- **`gh pr merge --delete-branch` falha** com `fatal: 'main' is already used by worktree` (há worktrees do repo) — o
  MERGE acontece; só a limpeza local falha. Apague as remotas com `git push origin --delete <branch>`.
- **Teste temporário de descoberta** (o que lê arquivos do `C:/Users/...`) **quebrou o CI** porque entrou no commit.
  Antes de commitar, `git status --short` e procure `__tmp`. Os temporários de descoberta devem ser apagados no MESMO
  comando que escreve o commit.
- **`tsc` isolado engana**: se o `dist/` estiver velho, `@prisma/client` pode não estar gerado → centenas de erros
  falsos em outros arquivos. Rode `npx prisma generate` antes de julgar o typecheck.
- **`gh pr create` com `--body` contendo crase/`<style>`** quebra o shell → escreva o corpo num arquivo e use
  `--body-file`.

## Repo: convenções

- PR com corpo explicando **o que foi validado** (números, campeões conferidos, noop do re-run) — é o que o Operador lê.
- **Worklog** em `docs/worklog.md`: um bloco por tarefa (`Task ID: goal-<data>/<id>`, `Work Log` com os achados e os
  **bugs pegos pelos gates**, `Stage Summary`). Registre também os **gaps declarados** — o projeto prefere gap declarado
  a dado inventado.
- Nunca tocar em rankings/entries por acidente; `home`, `rankings/entries` e `health` = 200 no fim.
