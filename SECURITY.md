# SECURITY.md

## Política de Divulgação de Vulnerabilidades

O **Almanaque dos Clubes** leva a segurança do software a sério. Se você
encontrou uma vulnerabilidade de segurança, agradecemos sua ajuda em divulgá-la
de forma responsável.

### Reportando uma Vulnerabilidade

**Não crie uma issue pública no GitHub.** Envie um email para:

```
security@almanaque.app
```

### O que esperar

- **Confirmação de recebimento:** em até 48 horas úteis.
- **Atualização de progresso:** a cada 7 dias até a correção.
- **Divulgação:** após a correção ser publicada, com crédito ao reportante
  (se desejado).

### Escopo

Dentro do escopo:
- Aplicações web em `*.almanaque.app` e subdomínios (quando disponíveis).
- Repositórios do GitHub do projeto (`ENDARTStudios/Almanaque-dos-Clubes`).
- Endpoints da API (`/api/v1/*`).

Fora de escopo:
- Engenharia social, phishing, ataques físicos.
- Ataques de negação de serviço (DDoS).
- Serviços de terceiros (Provedor de deploy, Stripe, Cloudflare).

### Processo

1. Reportante envia descrição detalhada para security@almanaque.app.
2. Mantenedor confirma recebimento e classifica severidade.
3. Correção é desenvolvida em branch privada.
4. Após deploy da correção, vulnerabilidade é divulgada publicamente.
5. Reportante é creditado (se autorizar).

### Premiação

Atualmente o projeto **não possui programa de recompensas (bug bounty)**.
Agradecemos reconhecimento público e crédito na documentação.

---

## Práticas de Segurança do Projeto

### Criptografia

| Alvo | Algoritmo | Parâmetros |
|---|---|---|
| Senhas | argon2id | Custo 12, memória 64 MiB, paralelismo 1 |
| Refresh tokens | SHA-256 | 32 bytes aleatórios (256 bits) |
| Códigos OTP | randomBytes | 6 dígitos, timing-safe |
| Transporte (produção) | TLS 1.3 | Ciphers restritos, HSTS preload |
| Comparação | timingSafeEqual | Previne timing attacks |

### Autenticação e Sessão

- JWT (HS256) com cookies httpOnly + SameSite=Strict + prefixo `__Host-` (produção)
- Access token: 15 minutos de duração
- Refresh token rotation: cada refresh gera novo token e revoga o anterior
- Detecção de reuso de refresh token → revoga TODAS as sessões do usuário
- Hash dummy para timing attack prevention no login
- Senha nunca em texto plano, log, ou resposta

### Controle de Acesso (RBAC)

- 3 roles: admin (total), pro (escrita), free (leitura)
- 18 permissões granulares (`resource:action`)
- Cache de permissões em memória (TTL 5 min)
- Invalidação automática ao alterar roles
- Middleware `authenticate` + `requirePermission` + `requireRole`

### Rate Limiting (4 camadas)

| Camada | Limite | Escopo |
|---|---|---|
| Cloudflare WAF | 100 req/min | IP (global) |
| @fastify/rate-limit | 100 req/min | IP (API) |
| Login service | 5 tentativas/15min | IP (auth) |
| Lockout progressivo | 1h após 10 falhas | IP (auth) |

### Proteção de Dados

- Soft delete em entidades críticas (clubs, players, users)
- AuditLog append-only com redaction automática de campos sensíveis
- Valores monetários em centavos (int), nunca float
- Nomes de arquivo UUID no upload (nunca nome original do usuário)
- Magic bytes validation para tipo MIME (impede falsificação)
- Limite de payload: 1 MiB (API), 50 MiB (upload)

### Headers HTTP (produção)

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Restritiva (apenas self +必要 recursos) |

### Infraestrutura

- Container scan com Trivy no CI (bloqueia CVEs CRITICAL)
- SAST com ESLint + eslint-plugin-security
- DAST semanal com OWASP ZAP
- Dependabot ativo para atualizações de segurança
- `pnpm audit` no CI (bloqueia high/critical)
- Secrets armazenados em variáveis de ambiente, nunca no repositório
- Docker multi-stage (prune de devDependencies)

### Dependências

| Pacote | Finalidade | Versão |
|---|---|---|
| argon2 | Hash de senhas | 0.45.x |
| @fastify/jwt | JWT sign/verify | 10.2.x |
| @fastify/helmet | Headers de segurança | 12.x |
| @fastify/rate-limit | Rate limiting | 11.x |
| zod | Validação de entrada | 3.23.x |
| bullmq | Fila assíncrona | 5.x |
| ioredis | Cache | 6.x |

### Conformidade

- LGPD: direito ao esquecimento via soft delete
- Audit trail completo em AuditLog
- Política de privacidade em desenvolvimento
- Dados sensíveis: apenas email e senha (hash), sem dados biométricos ou de saúde
- Pagamentos processados por terceiros (Stripe/PagSeguro — sem armazenamento local de cartão)
