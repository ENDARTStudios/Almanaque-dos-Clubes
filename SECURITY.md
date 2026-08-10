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

Estão dentro do escopo:
- Aplicações web em `*.almanaque.app` e subdomínios (quando disponíveis).
- Repositórios do GitHub do projeto (`anomalyco/almanaque-dos-clubes`).
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
- Senhas: argon2id (custo 12, memória 64 MiB)
- Tokens: SHA-256 (32 bytes aleatórios)
- Transporte: TLS 1.3 (produção)

### Autenticação
- JWT + httpOnly cookies com prefixo `__Host-` em produção
- Refresh token rotation com detecção de reuso
- Rate limit por IP (5 tentativas / 15 min) com lockout progressivo

### Dados
- Soft delete em entidades críticas
- AuditLog append-only com redaction de campos sensíveis
- Valores monetários em centavos (int), não float
