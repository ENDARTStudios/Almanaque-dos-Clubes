---
name: design-subagents
description: Catálogo dos subagentes de design do Almanaque (crítico visual, auditor de acessibilidade, copywriter de conversão, QA visual) e como acioná-los via o tool subagent. Use ao fechar qualquer trabalho de UI/UX, ao revisar uma tela antes de commitar, ao querer uma segunda opinião adversarial sobre layout/copy/acessibilidade, ou quando a tarefa pedir "revisão de design", "auditoria", "crítica" ou "QA".
---

# Subagentes de design — como acionar

Os papéis ficam em `plugins/almanaque-design/agents/*.md` (espelhados em `.zcode/agents/`).
O DSH não carrega arquivo de subagente do projeto: **você lê o papel e passa como prompt** do
tool `subagent`. O valor está no prompt padronizado — mesma régua, toda vez.

## Regra de uso

- Rode o subagente **em contexto separado** justamente para não gastar o contexto principal;
  ele devolve só o veredito.
- Um subagente por eixo. Não peça "revise tudo" a um só: o resultado vira prosa sem prova.
- Subagente **não** corrige: ele descreve o defeito com evidência para o agente principal agir.
- Subagente que precisa clonar o repo não serve; passe no prompt os **caminhos exatos** e os
  **valores medidos** que ele deve usar.

## Chamada padrão

```
Leia plugins/almanaque-design/agents/<papel>.md e incorpore o papel.
Contexto: <arquivos exatos, porta do dev server, screenshots em .tmp/shots/>
Entregue: <formato de saída do papel>
Não edite arquivos. Não invente dado. Se não puder verificar, declare "não verificado".
```

Equivalente DSH:

```jsonc
// tool: subagent   (run_in_background: true por padrão; use false se o próximo passo depende dele)
{
  "description": "Critica visual da hero",
  "prompt": "Leia plugins/almanaque-design/agents/design-critic.md e incorpore o papel. Arquivos: apps/web/src/components/HeroSection.tsx, apps/web/src/app/globals.css. Screenshots: .tmp/shots/after-desktop.png, .tmp/shots/after-mobile.png (leia com a tool read_image). Copy: apps/web/src/i18n/wsC12.ts. Entregue a tabela do papel, máx. 25 linhas, PT-BR. Não edite arquivos."
}
```

## Quem chamar quando

| Situação | Papel |
|---|---|
| Fechou uma tela/hero antes do PR | `design-critic` (bloqueante) |
| Mudou cor, contraste, foco, ícone, carrossel, modal | `a11y-auditor` |
| Escreveu H1/sub/CTA/preço | `ux-copywriter` |
| Precisa provar antes/depois com números | `visual-qa-auditor` |
| Vai publicar campanha/meta description | `ux-copywriter` + `design-critic` |

## Papéis disponíveis

- **`design-critic`** — crítica adversarial de layout, hierarquia, densidade, coerência com o
  sistema. Veredito APROVADO/REPROVADO + lista priorizada.
- **`a11y-auditor`** — WCAG 2.2 AA: contraste **medido**, teclado, semântica, alvos, movimento.
  Saída com o valor numérico de cada achado.
- **`ux-copywriter`** — reescreve/valida copy no framework Gancho→Promessa→Prova→CTA, nos 3
  idiomas, respeitando as regras de honestidade.
- **`visual-qa-auditor`** — screenshots, overflow, alvos de toque, ordem de headings, console.

## Custo e paralelismo

Os três primeiros eixos são independentes: **dispare-os juntos** numa mesma mensagem (o
subagente roda em background) e siga trabalhando. Colete com `send_message`/retorno antes de
declarar a tarefa pronta.
