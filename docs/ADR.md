# ADR.md — Architecture Decision Records

> O log canônico de decisões é **[DECISOES.md](../DECISOES.md)** (raiz) — formato datado com
> Motivo/Decisões/Evidência e regras permanentes referenciadas. Este índice aponta as ADRs
> estruturais mais impactantes (leia o arquivo para o detalhe e a evidência).

| ADR | Decisão | Efeito estrutural |
|---|---|---|
| D-2026-09-07 | Proveniência convencional | todo dado importado carrega fonte/data/licença |
| D-2026-09-15-migration-grants-rule | migration que cria tabela traz GRANTs do app_user no mesmo PR | sem 42501 em produção |
| D-2026-09-18 | testes sem skip silencioso (R1) + checkpoint de contexto | TEST_REQUIRE_DB no CI |
| D-2026-09-20 | fixtures escopadas (R2) · refund fail-loud · sessão sempre assenta · checkout APP_URL guard | zero corrida de fixture; dinheiro fail-loud |
| D-2026-09-21 | PR merged não certifica conteúdo; oferta condicionada a conteúdo | fingerprint + fila reordenada |
| D-2026-09-22-t448 | arestas WON com hierarquia/gênero congelados na escrita; fonte por aresta (EDIÇÃO) | KG operacional; leitura não re-deriva |
| D-2026-09-22-t448c/f | critério de vitrine condicional por grupo de flagship (type-first só em GRUPO-LIGA) | comparador por hierarquia |
| D-2026-09-22-t448d | guarda de vigência (edição futura não existe) + cache fail-loud | regra write/invalidation nunca engole |
| D-2026-09-22-t465 | oferta honesta com fonte única do catálogo | CDC art. 30/37 |
| D-2026-09-22-t469 | W1/W2/W3 (re-ancoragem, PII, advogado) + roteamento dos 21 achados | legal P0 autônomo |
| D-2026-09-22-cli | ingestão/deploy autônomos do Doer | Operador = identidade/dinheiro/domínio/credencial |

## Como registrar uma nova ADR

Entrada em DECISOES.md (mais recente no topo) com: data · o quê · motivo com EVIDÊNCIA (query/
fonte) · decisões numeradas · alternativas reprovadas com o dado que as reprovou · regras
permanentes afetadas · reversibilidade. Depois indexe aqui se estrutural.
