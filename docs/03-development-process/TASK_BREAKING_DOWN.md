# TASK_BREAKING_DOWN.md — Como quebrar tarefas (padrão da casa)

> O processo real que produziu T448→T448f+T465+T469 sem perda: dispatch com gates → FASE 0 (R3) →
> implementação em camadas → verificação viva → reconciliação no mesmo PR.

## Anatomia de um dispatch (Thinker → Doer)

1. Contexto validado + por que a task existe (a interação que ninguém previu).
2. FASES numeradas com a FASE 0 SEMPRE sendo R3 (medir estado real antes de codar).
3. Restrições inegociáveis + o que é FORA (não inflar).
4. GATES DE ACEITE checkboxáveis + reversibilidade.
5. FASE de reconciliação no MESMO PR (DECISOES + PLANO_MESTRE + REPORT).
6. Checkpoint explícito (onde o Doer para e reporta antes de prosseguir).

## Regras de quebra

1. **R3 na FASE 0**: query de produção/fonte do deploy ANTES da primeira linha — define o escopo
   (T448e: type nulo → backfill primeiro; T465: fonte do deploy ≠ prints; T466: a/b/c decide
   migration vs seed).
2. **Um workstream por round** (§2.6): não misturar dado + mapa + i18n num contexto.
3. **Hotfix de vitrine mergea antes** do milestone que o originou (vitrine errada é AGORA).
4. **Interações são descobertas, não falhas de execução**: o checkpoint existe para a arbitragem
   do Thinker (ex.: T448e type-first global → regressão continental → T448f condicional).
5. **Proxies/sugestões são hipóteses**: validar contra o dado antes de adotar (T448c: 2 proxies
   reprovados por query).
6. **Quando o checkpoint revela defeito no próprio relato** (T448d "edição futura" era ano
   corrente), corrige o registro, não só o código.

## Tamanho de round

Um round fecha quando: todos os gates checkboxados + CI verde real + live verify com fingerprint
+ reconciliação merged. Round grande demais se fatia (T448b virou T448b-1/b-2; T448d nasceu da
interação e entrou na frente).

## Reconciliação (nunca pular)

Mesmo PR: DECISOES (decisões + regras novas) + PLANO_MESTRE (estado re-ancorado) + REPORT §22
(tabela de evidência). Docs de estado que mentem são o anti-padrão original do projeto.
