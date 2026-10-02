# COMPLIANCE.md — Estado de conformidade (LGPD/GDPR/CDC)

> Legal P0 no ar (T469, #172). Pacote segue **para revisão de advogado habilitado** (W3) — nada
> aqui declara "conforme". Bloco de identidade (razão social/endereço/DPO nominal) = Operador.

## Gates para o beta pago (1.000)

| Gate | Dono | Estado |
|---|---|---|
| T465 — oferta honesta (CDC art. 30/37) | Doer | ✅ #171 (fonte única, "em breve" declarado, preço intocado) |
| T469 — legal P0 (LGPD estrutura) | Doer | ✅ #172 (prazos, retenção, incidentes, menores, fornecedores/DPAs, consent E2E 11/11) |
| T468 — i18n do checkout (CDC art. 6 — clareza p/ não-PT) | Doer (WS-F) | [ ] fila |
| T471 — Opção B geo (restringir UE/UK se GDPR não assinado) | Doer (código) + Operador (ativar) | [ ] fila; recomendado pela auditoria |
| Pacote jurídico (advogado/DPO/DPAs fechados/e-mails de domínio/alcance) | **Operador** | [ ] escalado, roda em paralelo |

Um gate sem o outro não abre. Opção A (global, rep UE + SCCs + TIA + DPIA) só depois da Opção B.

## O que já está no ar

- **Consentimento**: banner 1ª camada com esforço equivalente (aceitar/rejeitar), granular,
  revogação pelo rodapé, prova registrada (versão, data, categorias, identificador minimizado);
  E2E 11/11 em produção; **ZERO cookies antes da escolha** (verificado em contexto limpo).
- **Inventário de cookies real** em /cookies (sem analytics/marketing; Stripe = no ato do
  pagamento, política própria; almanaque_locale = necessário — set só em escolha explícita).
- **Documentos**: Termos + Privacidade v1.3 (22/09/2026) com versão POR documento; prazos
  harmonizados (15d LGPD / 1 mês GDPR); retenção com períodos concretos (backups 30d, pagamento
  5 anos, logs); incidentes (ANPD 3 dias úteis ref. / GDPR 72h); menores + declaração no cadastro;
  fornecedores + transferência internacional + DPAs públicos; "não vendemos dados".
- **Oferta honesta** (T465): /planos ≡ /checkout por fonte única; IA/API "em breve"; KG entregue.
- **/metodologia**: fontes (Wikidata CC0), critério de verificação, divergências, limitações.
- **Google Fonts auto-hospedado** (fornecedor eliminado).

## Pendências e roteamento

| Item | Dono | Task |
|---|---|---|
| Direitos do titular (fluxo real: protocolo/export/delete/audit) | Doer | T470 |
| DMCA (form + contranotação + política; Lei 9.610, sem safe harbor formal) | Doer | T470 |
| Opção B (flag + disable checkout UE/UK + suprimir EUR) | Doer | T471 |
| Tradução legal cheia + checkout en/es | Doer | T472/T468 |
| Razão social/endereço/e-mails/DPO nominal/DPAs fechados/SCCs/advogado | **Operador** | escalação |
| Disclosure cheio de IA (provedor/país/retenção/AI Act) | Operador+Doer | quando IA shippar |

## Armadilha permanente (W2)

PII de auditoria/terceiro NUNCA vira texto publicado por inferência. Campos de identidade ficam
como a última confirmação do Operador ou como placeholder "[a confirmar pelo Operador]".
