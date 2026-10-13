---
name: hero-and-landing-patterns
description: Padrões de hero e landing page de alta conversão para o Almanaque dos Clubes — anatomia da dobra, prova com dado real do acervo, CTA primário/secundário, orçamento de performance e acessibilidade. Use ao criar ou reprojetar a home/hero, uma landing de plano (/planos), uma página de aquisição ou qualquer primeira dobra; também ao decidir o que entra na dobra e o que desce para a página.
---

# Hero e landing do Almanaque

## Anatomia obrigatória de uma hero

1. **Eyebrow** — chip curto que situa o produto (`ACERVO ABERTO · 11.987 clubes`). Nunca
   slogan genérico.
2. **H1** — a promessa em ≤ 9 palavras, com **uma** ênfase colorida. Barlow Condensed.
3. **Sub** — 2 linhas: o que é + como funciona. Uma vez, e só uma, o estado honesto do acervo.
4. **CTA primário** — verbo de ação no destino (`Explorar o acervo agora`), `bg-primary`
   `text-on-primary`. Só **um** primário por dobra.
5. **CTA secundário** — `ghost` (borda + texto). Rótulo de menor compromisso.
6. **Microcopy de atrito** — abaixo dos botões, remove a objeção ("Sem cartão. Sem cadastro.").
7. **Prova** — número real ou caso real, com a fonte visível. Ver abaixo.
8. **Mídia/visual** — no máximo **um** elemento gráfico de destaque.

Nesta ordem. Se faltar espaço em 390 px, corte 8, depois 7 — nunca 2, 4 ou 5.

## Prova no Almanaque: dado do acervo, nunca depoimento inventado

O acervo **é** a prova social. Use, em ordem de preferência:

- **Campeão vigente real** (`GET /champions/carousel` → `scopes[]`): clube + competição +
  temporada + link da fonte. É auditável, já existe e vira clique para o perfil do clube.
- **Contagem real** (`total` de `/clubs`, `/competitions`, `/rankings`) com nota de proveniência.
- **Amostra de ranking 0-100** com link para `/metodologia`.

Proibido: depoimento fabricado, logo de parceiro não contratado, "mais de X usuários" sem
número auditável, selo de prêmio. Publicidade enganosa é risco jurídico (CDC art. 37 §1º) —
ver `docs/DECISOES.md`.

**Empty-honesto:** sem dado, a hero **não** mostra placeholder enganoso. Um `null` repetido em
três cartões ("Acervo em crescimento" ×3) é pior que **um** cartão com nota única; agrupe a
lacuna numa linha só (`statsNoData`) e nunca repita o mesmo texto como se fosse métrica.

## O que NÃO pertence à dobra

- Grade de 6 recursos (desce para seção própria).
- Explicação de arquitetura/API (desce ou sai).
- Recursos "em breve" — no máximo 1 menção, no fim do sub. Se é "em breve", não é argumento de
  compra; é aviso.
- Tabela, gráfico denso, mapa interativo (custo de hidratação + scroll preso no mobile).

## Orçamento de performance

- Hero é **Server Component** sempre que possível. Se precisar de interação/anim, isole em um
  Client Component pequeno — não marque a página inteira com `'use client'`.
- Dados do servidor com `next: { revalidate: 3600 }`; falha de fetch → `null` → lacuna honesta
  (nunca `catch` que inventa zero).
- Animação: entrada por CSS (`animate-slide-up`, `animate-fade-in`) ou GSAP por `useGsap*`.
  Sem autoplay de carrossel. Sem `will-change` permanente.
- Imagem: `next/image`, `sizes` correto, `priority` só na imagem da dobra. Textura e grade são
  **CSS/SVG inline** (não PNG de fundo).
- Impacto aceitável: LCP ≤ 2,5 s em 4G simulado; zero layout shift na dobra.

## Checklist de aceite da hero

- [ ] Promessa específica no H1 (não "A História do Futebol num Só Lugar" — isso descreve o
      produto, não resolve dor).
- [ ] Exatamente 1 CTA primário; ambos ≥ 44 px de altura no mobile.
- [ ] Prova com fonte visível e link que funciona.
- [ ] Nenhum texto literal (tudo em `i18n`, 3 idiomas).
- [ ] Contraste AA medido (skill `web-accessibility-wcag`), não estimado.
- [ ] 390 px sem corte horizontal; teste com o teclado (Tab percorre tudo, foco visível).
- [ ] Screenshot antes/depois anexado (skill `visual-qa-playwright`).
