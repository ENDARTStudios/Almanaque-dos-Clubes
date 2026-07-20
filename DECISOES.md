# DECISOES.md

Registro permanente de decisões técnicas e de produto do projeto.
Cada entrada segue o formato abaixo. Decisões registradas **não se re-discutem**
sem fato novo (PROTOCOLO_MESTRE.md, Seção 3, item 4).

Formato obrigatório:

```
## [AAAA-MM-DD] Decisão: <o quê>
Motivo: <por quê>
Alternativas consideradas: <se houver>
```

---

## Histórico de decisões

<!-- Novas decisões devem ser adicionadas ACIMA da linha abaixo, em ordem cronológica. -->

### [2026-07-16] Decisão: Adoção do Protocolo Mestre v2.0 e retrofit do projeto
Motivo: O Operador publicou o PROTOCOLO_MESTRE.md v2.0 como nova lei suprema do processo. O projeto já continha código do MVP (Fastify + Prisma + SQLite/PostgreSQL) e um PLANO_MESTRE.md anterior, ambos produzidos antes do protocolo existir.
Alternativas consideradas: (a) descartar o MVP e refazer do zero sob o protocolo — descartada por desperdício; (b) aceitar o MVP como baseline e prosseguir sob o protocolo a partir de agora — escolhida.
Observação: O PLANO_MESTRE.md existente será revisado e reconstruído a partir do Discovery (Seção 4) e do Anexo A. Itens já implementados no MVP serão marcados `[x]` apenas após verificação de evidência (Seção 6).

### [2026-07-16] Decisão: Stack técnica inicial (mantida do pré-protocolo)
Motivo: TypeScript + Node.js + Fastify + Prisma + PostgreSQL/SQLite já estavam em uso, todos gratuitos e open-source, em conformidade com a Seção 3, item 1.
Alternativas consideradas: NestJS (mais pesado, scaffolding maior); Express (sem validação/schema nativos). Fastify venceu por ser leve, ter TypeScript first-class e plugins oficiais para helmet/cors/rate-limit.

---

## Discovery (Seção 4 do Protocolo) — Respostas do Operador

### [2026-07-16] Decisão: Definição de produto (Discovery Q1)
**Resposta:** O Almanaque dos Clubes é uma plataforma mundial de pesquisa e inteligência sobre futebol que reúne a história completa de clubes, jogadores e competições, enriquecida por rankings, estatísticas e IA com respostas fundamentadas em dados.
Motivo: Estabelece o escopo funcional do produto: não é só um diretório — é uma plataforma de inteligência com IA. Justifica a inclusão de Fase 6 (Knowledge Graph, RAG) e Fase 8 (auditoria de IA) no plano.

### [2026-07-16] Decisão: Público-alvo e escala esperada (Discovery Q2)
**Resposta:** Torcedores, jornalistas, pesquisadores, criadores de conteúdo, analistas, clubes/federações (B2B). Crescimento: Beta Fechada 100 → Open Beta 1.000 → Ano 1: 10.000–50.000 cadastrados. Arquitetura deve escalar além disso.
Motivo: Escala prevista justifica monolito modular (não microsserviços —_COMPLEXIDADE extra não justificada em <50k usuários), mas exige desde já: paginação correta, índices, cache (Fase 6), rate-limit por usuário (Fase 7), observabilidade (Fase 9). 50k usuários não pede microsserviços, mas pede CI/CD sólido e zero downtime.
Alternativas consideradas: microsserviços desde o início (descartada — Seção 3 item 6: solução mais simples vence entre equivalentes).

### [2026-07-16] Decisão: Referências de produto (Discovery Q3)
**Resposta:** ZeroZero, Transfermarkt, Soccerway, WorldFootball.net, RSSSF, FBref, Wikipedia, Sofascore, Flashscore. Diferencial: combinar acervo histórico + rankings auditáveis + IA RAG com citações + Knowledge Graph + curadoria.
Motivo: Define o padrão de qualidade esperado. Acervo histórico extenso (RSSSF-like) exige modelagem de dados flexível e versionamento de fontes (Fase 2 avançada + auditoria). IA com citações exige pipeline RAG rastreável (Fase 6). Rankings "auditáveis" exige imutabilidade/versionamento (Fase 2 — soft delete + audit_logs).

### [2026-07-16] Decisão: Funcionalidades sensíveis (Discovery Q4)
**Resposta:**
- Login: **Sim**
- Pagamento (assinatura): **Sim**
- Dado sensível: **Não** (apenas dados básicos de conta + cobrança por provedores externos)
- Upload de arquivo: **Sim** (administradores + importação/exportação de dados)
Motivo (impacto no plano):
- Login → Fase 3 vira `[OBRIGATÓRIO]` (gatilho do Anexo A atendido).
- Pagamento → adiciona sub-fase de billing (Stripe/provedor gratuito — Seção 3 item 1: usar stripe.com é gratuito para usar, cobra apenas taxa por transação; alternativas open-source são PagSeguro/Pix direto — decidir em Fase 4).
- Sem dado sensível → 2FA TOTP vira `[CONDICIONAL]` (não é saúde/financeiro/documento). Mesmo assim, recomendado para contas pagas — deixaremos como item opcional dentro da Fase 3.
- Upload → Fase 6 upload vira `[OBRIGATÓRIO]` (administradores vão importar CSV).

### [2026-07-16] Decisão: Prazo (Discovery Q5)
**Resposta:** Não. Prioriza qualidade, consistência arquitetural e estabilidade. Marcos: Beta Fechada → Open Beta → v1.0, sem data fixa.
Motivo: Permite não pular etapas de segurança (Seção 3 item 3 — nada fecha sem evidência). Remove pressão de "lançar antes do seguro". Fases 7 (hardening) e 8 (testes/DAST) podem ser feitas com calma.

### [2026-07-16] Decisão: Marca e domínio (Discovery Q6)
**Resposta:** Nome "Almanaque dos Clubes" definido. Marca definida. Domínio ainda não.
Motivo: Fase 7 (DNSSEC/CAA/HSTS preload) fica `[CONDICIONAL: domínio próprio em produção]` — só entra quando o Operador registrar o domínio. Até lá, deploy pode usar subdomínio gratuito (ex.: Railway/Fly.io) sem HSTS preload. Adicionado item futuro em PENDENCIAS_OPERADOR.md: "escolher e registrar domínio".

### [2026-07-16] Decisão: Definição de "pronto" (Discovery Q7)
**Resposta:** Pronto = usuário consegue: pesquisar entidades do futebol mundial, navegar histórico, comparar informações, usar IA com citações — com infraestrutura de ETL, governança e operação funcionando em segundo plano. Planos Free/Pro/Elite ativos.
Motivo: Estabelece o critério de aceitação global do projeto (Seção 9 do Protocolo). Tudo abaixo disso é "em progresso", não "pronto". Afeta profundamente a estrutura do plano:
- Exige Fase 6 com ETL pipeline (atualização automática) — vira `[OBRIGATÓRIO]`.
- Exige Fase 6 com IA/RAG — vira `[OBRIGATÓRIO]`.
- Exige Fase 4 com billing (Free/Pro/Elite) — adicionada como sub-fase.
- Exige Fase 9 com observabilidade real — `[OBRIGATÓRIO]`.

---

## Classificação de fases (Anexo A) após Discovery

| Fase | Classificação | Justificativa |
|------|--------------|---------------|
| 0 – Setup | OBRIGATÓRIO | sempre |
| 1 – Infra base | OBRIGATÓRIO | sempre |
| 2 – Dados | OBRIGATÓRIO + tabelas de auth/billing/audit | login + assinatura |
| 3 – Auth | OBRIGATÓRIO (2FA TOTP OPCIONAL) | login confirmado; sem dado sensível |
| 4 – APIs/CRUDs | OBRIGATÓRIO + módulo de billing | assinatura confirmada |
| 5 – Frontend | OBRIGATÓRIO | sempre |
| 6 – Avançado | UPLOAD OBRIGATÓRIO; FILA OBRIGATÓRIO (ETL); CACHE OBRIGATÓRIO (50k users); IA/RAG OBRIGATÓRIO (diferencial de produto); WEBSOCKET CONDICIONAL | confirmado por Q4+Q7 |
| 7 – Hardening | VAULT CONDICIONAL (deploy nativo basta); DNSSEC/HSTS CONDICIONAL (sem domínio ainda) | Q6 |
| 8 – Testes/segurança | OBRIGATÓRIO + DAST OBRIGATÓRIO (superfície pública grande) | sempre + Q2 |
| 9 – CI/CD e deploy | OBRIGATÓRIO | sempre |
