# ITERATION.md — Como o projeto itera (o método em prática)

> O "como" por trás de T448→T448f/T465/T469. O "quê" das regras está em [RULES.md](./RULES.md);
> a quebra de tarefas em [TASK_BREAKING_DOWN.md](./TASK_BREAKING_DOWN.md).

## O loop que funcionou (e seus invariantes)

```
Thinker despacha (gates + FORA explícito)
   → Doer FASE 0: MEDE o estado (R3) — veredicto pode redefinir o escopo
   → implementa em camadas (pura primeiro, rede/banco injetáveis)
   → checkpoint nos pontos de arbitragem (para e reporta, não expande escopo)
   → CI verde real + deploy com fingerprint + live verify sem mock
   → reconciliação NO MESMO PR (DECISOES/PLANO/REPORT)
   → Thinker aprova → próximo round (fila travada, 1 workstream)
```

## O que cada interação ensinou (interações descobertas viraram rounds)

| Interação descoberta | Resposta | Regra que nasceu |
|---|---|---|
| Copas semeadas × vigência-first → supercopa vira campeã | T448e type-first | ler campo objetivo existente |
| Type-first global × flagship de copa → VFF vence UCL | T448f condicional | regra por GRUPO de hierarquia |
| Edição pré-atribuída futura × virada de ano | T448d guarda | ano futuro não é vigente |
| Invalidation por padrão engolida | cache fail-loud | write/invalidation nunca silencia |
| Proxy de planner reprovado pelo dado (Paulistão/Serie B) | critério vigência-first | hint = hipótese (R3 generalizada) |
| Auditoria externa com premissa velha | T469 W1 | review externo também precisa de query |

**Padrão**: o checkpoint com EVIDÊNCIA VIVA é onde a interação aparece — parar ali é o que
transforma bug em decisão registrada em vez de hotfix às cegas.

## Ritmo e limites

- Um workstream por round (§2.6); hotfix de vitrine mergea ANTES do milestone.
- Contexto baixo → checkpoint de contexto (WIP + draft + HANDOFF) — nunca terminar no chat.
- Rounds grandes se fatiam QUANDO a FASE 0 revela o tamanho real (T448b → b-1/b-2).
- Nada entra em produção sem: fingerprint + live verify + reversibilidade declarada.

## Falicidade de iteração (métricas de processo observadas)

- Defeitos de vitrine encontrados por live verify: 4 (todos viraram round com regra).
- Falsos verdes evitados por FASE 0: type nulo (18 ligas), plan-features morto, "edição futura".
- Perdas de trabalho por erro de processo: 0 (após a regra de branch — 3 quase-perdas antes).
