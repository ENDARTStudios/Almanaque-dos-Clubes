# Plano de Resposta a Incidentes

> Documento de referência para detecção, resposta e recuperação de incidentes
> de segurança e operacionais no Almanaque dos Clubes.
> Versão: 1.0 | Data: 2026-08-10

---

## Índice

1. [Classificação de Incidentes](#1-classificação-de-incidentes)
2. [Canais de Comunicação](#2-canais-de-comunicação)
3. [Procedimentos por Tipo de Incidente](#3-procedimentos-por-tipo-de-incidente)
4. [Pós-incidente](#4-pós-incidente)
5. [Contatos](#5-contatos)

---

## 1. Classificação de Incidentes

### Severidade

| Nível | Definição | Tempo de Resposta | Exemplos |
|---|---|---|---|
| **🔴 CRÍTICO** | Dados expostos, sistema offline, pagamento quebrado | < 15 min | Vazamento de dados, downtime total, falha de billing |
| **🟡 ALTO** | Funcionalidade principal degradada | < 1h | Login falhando, busca lenta, upload quebrado |
| **🟢 MÉDIO** | Funcionalidade secundária afetada | < 4h | Exportação falhando, gráfico incorreto |
| **⚪ BAIXO** | Problema cosmético ou de baixo impacto | < 48h | Erro de tradução, CSS quebrado |

### Matriz de Impacto

| Incidente | Severidade | Plano |
|---|---|---|
| Vazamento de dados de usuário | 🔴 Crítico | 3.1 |
| Indisponibilidade total (downtime) | 🔴 Crítico | 3.2 |
| Falha na autenticação | 🟡 Alto | 3.3 |
| Erro de pagamento/assinatura | 🔴 Crítico | 3.4 |
| Falha no upload | 🟡 Alto | 3.5 |
| Performance degradada | 🟡 Alto | 3.6 |
| Ataque de força bruta detectado | 🟡 Alto | 3.7 |
| Vulnerabilidade de segurança reportada | 🟡 Alto | 3.8 |

---

## 2. Canais de Comunicação

| Canal | Uso | Responsável |
|---|---|---|
| **Email interno** | operador@almanaque.app | Operador |
| **Email segurança** | security@almanaque.app | Reportes externos |
| **GitHub Issues** | `github.com/ENDARTStudios/Almanaque-dos-Clubes/issues` | Bugs públicos |
| **Slack/Discord** | Canal privado do time | Comunicação interna |
| **Status page** | `status.almanaque.app` | Comunicação com usuários |

### Regras de Comunicação

- Incidentes 🔴 Críticos: notificar operador imediatamente (email + SMS)
- Incidentes 🟡 Altos: notificar em até 1h por email
- Incidentes 🟢 Médios: registrar em issue e notificar no próximo dia útil
- Nunca divulgar detalhes técnicos do incidente publicamente antes da resolução

---

## 3. Procedimentos por Tipo de Incidente

### 3.1 Vazamento de Dados (🔴 Crítico)

**Detecção:**
- Notificação de terceiro (pesquisador, usuário, autoridades)
- Logs indicando acesso não autorizado
- Alerta de auditoria (múltiplos acessos a dados sensíveis)

**Ação Imediata:**
1. [ ] Isolar o sistema afetado (desabilitar endpoint ou colocar em modo manutenção)
2. [ ] Revogar todas as sessões ativas (`UPDATE sessions SET revoked_at = NOW()`)
3. [ ] Rotacionar todas as chaves JWT (JWT_SECRET, JWT_REFRESH_SECRET)
4. [ ] Rotacionar credenciais de banco (S3, PostgreSQL)
5. [ ] Coletar logs completos do período do incidente (Pino + AuditLog)

**Investigação:**
6. [ ] Identificar quais dados foram expostos e para quem
7. [ ] Identificar vetor de ataque (commit malicioso, vulnerability 0-day, config errada)
8. [ ] Documentar timeline completa do incidente

**Recuperação:**
9. [ ] Aplicar correção
10. [ ] Restaurar dados de backup se necessário
11. [ ] Notificar usuários afetados (LGPD: em até 72h)
12. [ ] Reportar à ANPD se aplicável

### 3.2 Indisponibilidade Total (🔴 Crítico)

**Detecção:**
- Uptime check falhou (UptimeRobot/Better Stack)
- Usuários reportam erro 502/503

**Ação Imediata:**
1. [ ] Verificar status dos serviços: `docker compose ps`
2. [ ] Verificar logs: `docker compose logs --tail=50 api`
3. [ ] Tentar restart: `docker compose restart api`
4. [ ] Se não resolver, fazer rollback para versão anterior

**Rollback:**
```bash
git revert HEAD
git push origin main
# Aguardar CI/CD deploy automático
```

**Causas Comuns:**
- Deployment com erro (rollback resolve)
- Banco de dados fora do ar (verificar PostgreSQL)
- Redis ou MinIO indisponível (serviço não crítico, API opera sem)
- Falta de disco (verificar `df -h`)

### 3.3 Falha na Autenticação (🟡 Alto)

**Detecção:**
- Múltiplos relatos de "não consigo fazer login"
- Taxa de erro em `/api/v1/auth/login` > 10%

**Ação:**
1. [ ] Verificar logs do Redis (rate-limit store)
2. [ ] Verificar se JWT_SECRET foi alterado acidentalmente
3. [ ] Verificar AuditLog para padrão de falhas
4. [ ] Se for ataque de força bruta: aumentar lockout, notificar operador

### 3.4 Erro de Pagamento/Assinatura (🔴 Crítico)

**Detecção:**
- Webhook de pagamento falhando
- Usuários reportam "cobrança duplicada" ou "não consigo assinar"

**Ação:**
1. [ ] Verificar logs do webhook (`grep webhook apps/api/logs/`)
2. [ ] Verificar fila BullMQ: `redis-cli llen bull:etl:waiting`
3. [ ] Verificar integridade dos dados de billing no banco
4. [ ] Se falha no webhook: reprocessar manualmente
5. [ ] Se erro em usuário específico: reembolsar via `/api/v1/billing/admin/refund/:id`

### 3.5 Falha no Upload (🟡 Alto)

**Detecção:**
- Erro 413 (payload too large) ou 500 ao enviar arquivo
- Arquivos corrompidos no MinIO

**Ação:**
1. [ ] Verificar MinIO: `curl http://localhost:9000/minio/health/live`
2. [ ] Verificar espaço em disco do MinIO
3. [ ] Verificar tamanho do arquivo vs `UPLOAD_MAX_BYTES`
4. [ ] Verificar magic bytes (pode ser tipo MIME falsificado)

### 3.6 Performance Degradada (🟡 Alto)

**Detecção:**
- P95 latency > 500ms nos endpoints
- Queries lentas no PostgreSQL
- CPU/Memory elevados

**Ação:**
1. [ ] Verificar métricas: `GET /api/v1/metrics`
2. [ ] Identificar queries lentas no PostgreSQL
3. [ ] Verificar cache hit ratio no Redis
4. [ ] Escalar verticalmente se necessário (aumentar recursos)

### 3.7 Ataque de Força Bruta (🟡 Alto)

**Detecção:**
- AuditLog com múltiplos `USER_LOGIN_FAILED` para mesmo email
- Rate-limit atingindo threshold com frequência
- Múltiplos IPs diferentes para mesma conta

**Ação:**
1. [ ] Bloquear IPs no Cloudflare WAF
2. [ ] Aumentar lockout temporariamente (de 1h para 24h)
3. [ ] Notificar usuário afetado por email
4. [ ] Investigar origem do ataque nos logs

### 3.8 Vulnerabilidade Reportada (🟡 Alto)

**Detecção:**
- Email para security@almanaque.app
- Issue no GitHub (se for pública, mover para privada)

**Ação:**
1. [ ] Confirmar recebimento em até 48h
2. [ ] Classificar severidade (CRÍTICA/ALTA/MÉDIA/BAIXA)
3. [ ] Desenvolver correção em branch privada
4. [ ] Deploy da correção em staging e testar
5. [ ] Deploy em produção
6. [ ] Divulgar publicamente (após correção aplicada)
7. [ ] Creditadar reportante (se autorizado)

---

## 4. Pós-incidente

### 4.1 Relatório Pós-incidente (Postmortem)

Para todo incidente 🔴 Crítico ou 🟡 Alto, criar relatório em `docs/postmortem/`:

```markdown
# Postmortem: [Título do incidente]
Data: YYYY-MM-DD
Severidade: CRÍTICO/ALTO
Duração: HH:MM

## Timeline
- HH:MM — Detecção
- HH:MM — Resposta inicial
- HH:MM — Resolução
- HH:MM — Recuperação total

## Causa Raiz
[Descrição concisa]

## Impacto
- Usuários afetados: N
- Tempo de inatividade: HH:MM
- Dados perdidos: Sim/Não

## Ações Corretivas
- [ ] Ação 1 (responsável, prazo)
- [ ] Ação 2 (responsável, prazo)

## Lições Aprendidas
[O que fazer diferente da próxima vez]
```

### 4.2 Revisão Trimestral

A cada 3 meses, revisar:
- Incidentes ocorridos no período
- Efetividade dos tempos de resposta
- Melhorias nos procedimentos
- Atualização deste documento

---

## 5. Contatos

| Papel | Contato | Disponibilidade |
|---|---|---|
| Operador | operador@almanaque.app | 24/7 |
| Segurança | security@almanaque.app | 24/7 |
| DevOps | devops@almanaque.app | Horário comercial |

### Links Úteis

| Recurso | URL |
|---|---|
| Status page | `status.almanaque.app` |
| Repositório | `github.com/ENDARTStudios/Almanaque-dos-Clubes` |
| Logs (Loki) | `logs.almanaque.app` |
| Métricas (Grafana) | `grafana.almanaque.app` |
| MinIO Console | `http://localhost:9001` |
| API Docs (Swagger) | `http://localhost:3000/docs` |
