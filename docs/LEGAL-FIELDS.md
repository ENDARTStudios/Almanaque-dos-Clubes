# LEGAL-FIELDS.md — Campos obrigatórios e checklist antes da publicação

> Documento operacional para o Operador preencher antes de publicar os textos legais/alinhar o site.
> Base: minutas jurídicas de 31/08/2026 (retenção/exclusão/PI; cookie/LGPD/disclaimers; contrato de assinatura).
> Não publicar textos com campos [Confirmar]/[entre colchetes] pendentes. Revisar com advogado habilitado.

## A. Campos obrigatórios (substituir antes de publicar)

| Campo                                  | Valor a confirmar            | Onde aparece                              |
| -------------------------------------- | ---------------------------- | ----------------------------------------- |
| Razão social completa                  | END ART Studios              | Legal / Contato                           |
| CNPJ                                   | [45.370.930/0001-75]         | Rodapé / /sobre / /termos-assinatura      |
| Endereço completo                      | [Osasco, São Paulo - Brasil] | /sobre / Termos                           |
| E-mail geral                           | [endart.studios@gmail.com]   | Rodapé / Termos                           |
| Suporte                                | [endart.studios@gmail.com]   | Rodapé / Termos / IA                      |
| Privacidade/DPO                        | [endart.studios@gmail.com]   | /privacidade / /cookies / /como-usamos-ia |
| Segurança                              | [endart.studios@gmail.com]   | /seguranca                                |
| Reembolso/arrependimento               | [endart.studios@gmail.com]   | /termos-assinatura / Termos               |
| Direitos de terceiros                  | [endart.studios@gmail.com]   | Termos / PI                               |
| Periodicidade Pro/Elite                | [mensal/anual]               | /planos / /termos-assinatura / Termos     |
| Gateway de pagamento                   | [fornecedor e país]          | Checkout / Termos                         |
| Provedores (hospedagem, analytics, IA) | [lista atualizada]           | /privacidade / /cookies / /como-usamos-ia |
| Encarregado                            | [nome ou canal]              | /privacidade                              |
| DPO/cookies reais instalados           | [inventário]                 | /cookies / banner                         |

## B. Distinção que o site deve refletir (não confundir)

- **Cancelamento da assinatura** → interrompe cobranças futuras; não apaga conta/registros.
- **Exclusão da conta** → encerra perfil e dados associados quando não houver fundamento para conservar.
- **Eliminação de dados (LGPD art. 16)** → retirada de dados pessoais, ressalvadas hipóteses legais de conservação.

## C. Retenção — matriz inicial (validar com contador/jurídico/DPO)

| Categoria              | Ação                         | Prazo inicial sugerido |
| ---------------------- | ---------------------------- | ---------------------- |
| Identificação da conta | Excluir/anonimizar           | Até 30 dias            |
| Nome/e-mail            | Manter mínimo necessário     | Até 30 dias            |
| Senha/tokens           | Revogar/apagar               | Imediato–24h           |
| Preferências/histórico | Apagar/anonimizar            | Até 30 dias            |
| Prompts/IA             | Apagar/anonimizar/restringir | Até 30 dias            |
| Suporte                | Restringir/conservar         | Até 5 anos (validar)   |
| Assinatura/transações  | Conservar registros fiscais  | Prazo contábil         |
| Logs de segurança      | Conforme Marco Civil/lei     | Conforme lei/risco     |
| Antifraude             | Restringir/revisar           | 12–24 meses (validar)  |
| Consentimentos         | Prova mínima                 | Prazo de defesa        |
| Backups                | Rotação técnica              | Até 90 dias (validar)  |

## D. PI — limites que os Termos devem respeitar

- Proteger camada criativa/técnica (software, compilação, método, textos) **sem** afirmar propriedade sobre fatos, nomes, resultados nem materiais de terceiros.
- **Não** declarar a empresa dona de todos os fatos históricos/nomes/estatísticas; **não** tornar o usuário responsável por qualquer reclamação sem culpa; **não** excluir responsabilidade própria; **não** proibir toda citação legítima; **não** afirmar renúncia ao direito de arrependimento/eliminação.
- Licença ao assinante: limitada, não exclusiva, pessoal, não transferível, revogável de forma compatível.
- API: licença separada, chaves confidenciais/rotacionadas, proibido extração substancial/espelho/revenda/concorrência.
- Trabalhadores/contractors: contratos com cessão/licença patrimonial, confidencialidade e regra de IA.
- Open source: respeitar licenças, inventário e avisos.

## E. Checklist técnico do “pacote pronto para publicação” (conforme minuta)

1. Cookies opcionais **bloqueados antes da escolha**.
2. Aceitar e Rejeitar com **mesmo destaque** (sem dark patterns).
3. **Gerenciar cookies** presente no rodapé (revogação permanente).
4. Inventário de cookies **real** (nome/fornecedor/finalidade/duração/pais).
5. Links legais **sem 404 e sem #**.
6. Razão social, CNPJ, endereço e contatos **publicados**.
7. Privacidade **identifica fornecedores e transferências**.
8. Checkout mostra **preço, periodicidade, renovação, limites** antes do pagamento.
9. Usuário recebe **cópia dos Termos e comprovante**.
10. Disclaimers de IA **junto ao campo e ao resultado**.
11. Processo de **correção/exclusão/incidentes/reclamação de direitos autorais**.
12. Versões e **evidências de consentimento** preservadas de forma minimizada.

## F. Estado atual (branch feat/legal-i18n-licenca)

- ✅ Rotas legais /termos /privacidade /cookies /termos-assinatura /seguranca /sobre /planos /como-usamos-ia (sem 404, sem #), traduzidas pt/en/es.
- ✅ Aceite de Termos+Privacidade no cadastro (frontend + backend Zod). Rodapé com copyright e CNPJ.
- ✅ i18n 3 idiomas com seletor.
- ⚠️ Em aberto (ver tabela de pendências): banner de cookies + pré-bloqueio, checkout/reembolso de 7 dias, MFA/recuperação de senha, opt-in de marketing, disclaimers de IA junto ao campo (UI de IA ainda não existe), e preenchimento dos campos §A.
