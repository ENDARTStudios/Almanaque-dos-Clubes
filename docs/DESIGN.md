# DESIGN.md — Design de produto e sistema visual

## Sistema visual (implementado)

- **Fontes**: Barlow (corpo) + Barlow Condensed (headings) — **auto-hospedadas** (`public/fonts/`,
  OFL; 27 subsets com unicode-range; sem Google Fonts desde T469).
- **Tokens Tailwind**: paleta semântica (`foreground/70`…, `primary`, `on-primary`, `border`) —
  sem cor crua em componente; classes utilitárias compostas (sem CSS-in-JS).
- **Tipografia**: tamanhos relativos; headings com tracking leve (`tracking-wider` em labels).
- **Layout**: container `max-w-3xl` para documentos/checkout (T463) · `max-w-4xl/7xl` para perfis
  e vitrine · grid responsivo (1/2/3 colunas por breakpoint).
- **Componentes de padrão da casa**: card de vitrine (`article` com snap-start), skeleton
  (`animate-pulse` + `aria-hidden`), badge de ranking, tabela de inventário (cookies), documento
  legal (`max-w-3xl` + seções ancoradas).

## Princípios de design (que o produto já segue)

1. **Vazio-honesto**: sem dado auditável → mensagem explícita ("sem dados auditáveis"), nunca
   card fabricado nem spinner eterno (teto de 8s nas gates).
2. **Proveniência visível**: todo dado de vitrine expõe a fonte a um clique ("Fonte (Wikidata)"
   no carrossel, "fonte" por título na galeria, "Ver no Wikidata" no perfil).
3. **Esforço equivalente** (dark-pattern proibido): aceitar/recusar cookies com mesmo destaque —
   provado por E2E.
4. **Determinismo visível**: vitrine estável entre renders (carrossel com scroll-snap CSS puro,
   sem autoplay; seleção por comparador total no backend).
5. **i18n por dicionário tipado**: texto NUNCA hardcode em componente (exceção histórica do
   checkout PT-only → T468).

## Estados que toda UI nova precisa cobrir

loading (skeleton) · vazio-honesto (com reason quando vier da API) · erro degradado (mensagem,
não stack) · dado real com fonte · mobile 375px (E2E cobre carrossel).

## Pendências de design

Mapa-múndi (T467: Leaflet + GeoJSON com licença verificada) · galeria com imagem de troféu
(`trophy: null` hoje — placeholder SVG) · dark mode (tokens prontos, sem toggle ainda).
