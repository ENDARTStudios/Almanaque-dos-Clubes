# AIO.md — AI Optimization (IA como assunto e como produto futuro)

> Dois sentidos de "AIO" neste projeto: (1) ser bem **citado por IAs** (AIO/GEO — ver
> [GEO.md](./GEO.md)); (2) o produto de **IA próprio** — hoje NÃO operacional. Esta página governa
> o segundo sentido + a fronteira honesta entre os dois.
> Estratégia completa: [docs/seo-aeo-aio-geo-strategy.md](./seo-aeo-aio-geo-strategy.md) (§4).

## Estado real (regra T465/T469): IA NÃO operacional

- Nenhum modelo/LLM roda na plataforma (RAG/Ollama/pgvector = placeholders do escopo).
- Toda superfície pública que menciona IA diz **"em breve"** (oferta: "IA assistida com citações
  (em breve)" no PRO; home re-ancorada sem promessa de IA).
- Termos §10 (diretrizes de IA) + Privacidade ("não usamos dados para treinar IA") publicados.
- Disclosure cheio (provedor/país/retenção/treinamento/AI Act) = OBRIGATÓRIO quando a IA shippar,
  ANTES do primeiro usuário real — dono: Operador+Doer juntos.

## Quando a IA shippar (pré-requisitos travados)

1. Escolha de provedor + DPA/transferência na tabela de fornecedores ([INTEGRATIONS.md](./INTEGRATIONS.md))
   ×3 idiomas — ANTES de dado real fluir.
2. Disclosure em /privacidade (§ dados usados, retenção de prompts, sem-treinamento) + página
   "como usamos IA" atualizada (a base já existe em /como-usamos-ia).
3. Oferta: mover de "(em breve)" para entregue SÓ quando rodar (fonte única do catálogo).
4. RAG com citações obrigatórias: resposta SEM link de fonte não é resposta válida no produto —
   o padrão de proveniência do acervo estende-se à IA.
5. Rate-limit/uso justo por plano definido ANTES de cobrar (sem "ilimitado").

## AIO como disciplina (enquanto IA não existe)

- "AI Optimization" aqui = manter a promessa ZERO até existir: cada menção de IA em texto público
  é verificada em review ([docs/CODE_REVIEW.md](./CODE_REVIEW.md) — seção oferta/legal).
- Conteúdo de IA NÃO entra no acervo sem passar pelo pipeline de proveniência (fonte citável) —
  IA gera BUSCA/RESUMO, nunca DADO (o dado vem de fonte aberta auditável; divergência → revisão).

## Pendências

- [ ] Protótipo RAG (8.9 do escopo) com citações — só após T449 (partidas) valer a pena.
- [ ] Avaliação de julgamentos calibrados (skill TypeSafe instalada) para substituir heurísticas
      de classificação — [RESEARCH.md](./RESEARCH.md).
