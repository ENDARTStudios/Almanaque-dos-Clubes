# ACCESSIBILITY.md — Acessibilidade

## Implementado

- **Carrossel de campeões (T441)**: `role="region"` + `aria-live="polite"`, navegação por teclado
  (setas), dots com `role="tab"`/`aria-selected`, sem autoplay (respeita `prefers-reduced-motion`
  e foco do usuário), skeletons com `aria-hidden`.
- **Consentimento (T436)**: aceitar/recusar com **esforço visual equivalente** (sem dark pattern),
  E2E que prova o destaque; centro de preferências granular; "Gerenciar cookies" no rodapé;
  revogação tão fácil quanto a concessão.
- **Formulários**: labels associados, erros por campo com mensagem textual, honeypot off-screen
  (aceita leitor de tela corretamente via padrão React — T445).
- **Estrutura**: landmarks por página (`role="region"` nas seções vivas), `lang` no `<html>`
  sincronizado com o locale, foco visível (`focus-visible:ring-*`) nos componentes de navegação.
- **Fontes**: tamanhos relativos, contraste via tokens (`foreground/70`+), sem cor como único
  indicador de estado.

## Regras para features novas

1. Toda região dinâmica: `aria-live`/`aria-label` no elemento que muda.
2. Todo controle: alcançável por teclado e com estado visível por foco (não só cor).
3. Todo estado vazio com mensagem textual (vazio-honesto também é a11y).
4. Ícone decorativo: `aria-hidden="true"`; ícone-informação: com `aria-label`.
5. Images/ícones SVG: `aria-hidden` quando redundantes ao texto do link.

## Verificação

E2E (Playwright) cobre papéis/labels dos componentes vivos (carrossel, banner, galeria).
Rodar: `E2E_BASE_URL=<alvo> npx playwright test tests/e2e/`.
Auditorias com leitor de tela ficam no checklist de QA antes de beta pago ([QA_TESTING.md](./QA_TESTING.md)).
