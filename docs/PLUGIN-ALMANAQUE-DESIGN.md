# Plugin `almanaque-design` — UI/UX do Almanaque dos Clubes

Segundo plugin do repositório, ao lado do [`almanaque-dev`](PLUGIN-ALMANAQUE-DEV.md) (workflows
operacionais). Este cuida da **camada visual e de conversão**: design system, padrões de hero,
copy (gancho→promessa→prova→CTA), acessibilidade e QA visual. Ele existe porque a régua de
"ficou bom" estava só na cabeça de quem escrevia a tela, e cada rodada redesenhava do zero.

## O que vem dentro

| Componente | Para quê |
|---|---|
| skill `design-system-almanaque` | Tokens, escala, componentes existentes, a camada escura `.theme-dark` com contrastes **medidos**, e as regras invioláveis (link/button, foco, empty-honesto, i18n, reduced-motion). |
| skill `hero-and-landing-patterns` | Anatomia da dobra, o que é prova válida (dado do acervo, não depoimento), o que **não** entra na dobra, orçamento de performance e checklist de aceite. |
| skill `conversion-copy` | Framework H→P→P→CTA, ganchos que funcionam para este acervo, regras de honestidade (CDC art. 37 §1º) e vocabulário canônico nos 3 idiomas. |
| skill `web-accessibility-wcag` | Procedimento WCAG 2.2 AA: contraste **medido** (script), foco, teclado, alvos, semântica, i18n, movimento. |
| skill `visual-qa-playwright` | Como subir a porta certa (há outros projetos Next na máquina), capturar 1440/768/390, medir overflow/alvos/headings/console e provar antes/depois. |
| skill `design-subagents` | Catálogo dos papéis e como acioná-los pelo tool `subagent` do DSH. |
| agente `design-critic` | Crítica adversarial no fecho da tela: veredito APROVADO/REPROVADO com defeitos priorizados e citados. |
| agente `a11y-auditor` | Auditoria de acessibilidade com o número medido de cada achado. |
| agente `ux-copywriter` | Reescreve/valida copy nos 3 idiomas sem prometer o que o acervo não entrega. |
| agente `visual-qa-auditor` | QA visual objetivo: screenshots + overflow + alvos + console. |
| `tools/run.mjs` + `shot`/`audit`/`contrast`/`locales` | Utilitários versionados de QA visual (Playwright). `contrast` mede o pixel realmente renderizado; os PNGs saem em `<repo>/.tmp/shots` (gitignored). |

## Como ativar

### 1. No repositório (já ativo, versionado)

Os dois plugins espelham nos **dois** escopos, para que qualquer runtime que abra este
workspace encontre o conjunto completo — o DSH só varre `.dsh/`, o ZCode só `.zcode/`:

| Escopo | Varrido por | Conteúdo |
|---|---|---|
| `.dsh/skills/` | DeepSeek Harness | as 11 skills dos dois plugins |
| `.zcode/skills/` | ZCode / Claude-like | as 11 skills dos dois plugins |
| `.zcode/agents/` | ZCode / Claude-like | os 7 papéis (3 de dados + 4 de design) |
| `.dsh/agents/` | (leitura humana/agente) | os 4 papéis de design, versionados |

A **fonte canônica é o plugin** (`plugins/almanaque-design/` para UI/UX,
`plugins/almanaque-dev/` para operações). Depois de editar, sincronize — o script unificado
cobre os dois plugins:

```bash
bash plugins/scripts/sync-to-workspace.sh          # escreve
bash plugins/scripts/sync-to-workspace.sh --check  # só relata drift (CI)
```

O wrapper antigo continua funcionando (`bash plugins/almanaque-dev/scripts/sync-to-workspace.sh`).
Não edite `.zcode/` nem `.dsh/` à mão: a próxima sincronização sobrescreve.

### 2. Como plugin instalável (para outros workspaces)

O catálogo local em `plugins/marketplace.json` agora lista os dois plugins:

1. **Settings → Plugin Marketplace → Add → Add Plugin Marketplace**
2. Cole o diretório `…/Almanaque dos Clubes/plugins`
3. **Personal → Almanaque Design → Install** (id `almanaque-design@dev-almanaque-dos-clubes`, `0.1.0`)

## Limite conhecido: descoberta de skill em sessão DSH já aberta

O DSH descobre `.dsh/skills/` na **abertura** da sessão. Numa sessão já em curso, uma skill
criada depois **não** aparece no catálogo nem é carregável pela tool `skill` (verificado nesta
rodada: skill de projeto e skill em `~/.dsh/skills` igualmente indisponíveis até reabrir).

Consequência prática enquanto a sessão não for reaberta: leia o arquivo direto —
`read .dsh/skills/<nome>/SKILL.md` — o conteúdo é o mesmo que a tool devolveria. Para o DSH
passar a listar a skill no catálogo, **reabra a sessão** (ou inicie uma nova) no mesmo workspace.
Se for necessário torná-las visíveis em toda sessão sem reiniciar, o caminho é declarar
`customSkillDirs` no `cordis.patch.yml` do perfil — mudança de perfil (afeta todos os
workspaces), portanto só com autorização explícita do Operador.

## Por que plugin e não só documentação

Mesma razão do `almanaque-dev`: a documentação registra **decisões**; a skill registra **como
fazer** — com o valor medido, o arquivo exato e a armadilha que já custou retrabalho.

### Armadilha registrada (Tailwind v4.3.3 + tokens escopados)

`bg-muted/30` dentro da camada `.theme-dark` **não** segue o token escopado: o CSS compilado sai
como `background-color: #f0edf14d` (o cinza do tema claro com alfa), e não como uma expressão
que leia `var(--color-muted)` do escopo. Resultado visual: uma faixa cinza-clara numa seção
escura. O caminho seguro para translucidez dentro do `.theme-dark` é ser explícito:

```html
class="bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)]"
```

`bg-background`, `bg-primary`, `text-foreground`, `border-border` (sem modificador de opacidade)
funcionam normalmente porque o utilitário referencia a variável, que a camada redefine.

