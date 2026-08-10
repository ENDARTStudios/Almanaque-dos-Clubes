# SEO, AEO, AIO e GEO — Estratégia Completa

> Documento de otimização para mecanismos de busca tradicionais (SEO),
> Answer Engine Optimization (AEO), AI Optimization (AIO) e
> Generative Engine Optimization (GEO).
> Versão: 1.0 | Data: 2026-08-10 | Projeto: Almanaque dos Clubes

---

## ÍNDICE

1. [Objetivo Geral](#1-objetivo-geral)
2. [SEO — Search Engine Optimization](#2-seo--search-engine-optimization)
3. [AEO — Answer Engine Optimization](#3-aeo--answer-engine-optimization)
4. [AIO — AI Optimization](#4-aio--ai-optimization)
5. [GEO — Generative Engine Optimization](#5-geo--generative-engine-optimization)
6. [Métricas e KPIs](#6-métricas-e-kpis)
7. [Erros Comuns a Evitar](#7-erros-comuns-a-evitar)
8. [Implementação Técnica](#8-implementação-técnica)

---

## 1. Objetivo Geral

**Posicionar o Almanaque dos Clubes como referência absoluta em dados históricos
de futebol** em todos os ecossistemas de busca:

- **SEO**: Google, Bing, DuckDuckGo (tráfego orgânnico)
- **AEO**: Featured Snippets, People Also Ask, Answer Boxes
- **AIO**: SearchGPT, Claude, Gemini, Perplexity (citações em respostas de IA)
- **GEO**: Google SGE, Bing Copilot, Gartner GenAI (conteúdo gerado por IA)

### Público-Alvo por Canal

| Canal | Audiência | Intenção |
|---|---|---|
| Google (SEO) | Torcedores, jornalistas | Pesquisa factual ("fundação Flamengo", "maior artilheiro BR") |
| Featured Snippets (AEO) | Usuários mobile | Respostas rápidas ("quem ganhou BR 2009?") |
| SearchGPT/Claude (AIO) | Pesquisadores | Análise comparativa ("clube com mais títulos BR") |
| Google SGE (GEO) | Usuários casuais | Descoberta ("melhores clubes anos 90") |

---

## 2. SEO — Search Engine Optimization

### 2.1 Táticas Técnicas

| Tática | Implementação | Status |
|---|---|---|
| **Meta tags** | `layout.tsx`: title template, description, keywords, OG, Twitter | ✅ |
| **JSON-LD** | `WebApplication` + `SportsTeam` (por clube) no `<head>` | ✅ |
| **Sitemap XML** | `sitemap.ts` dinâmico com prioridades e frequências | ✅ |
| **Robots.txt** | `robots.ts`: permite `/`, nega `/api/` e `/auth/` | ✅ |
| **Canonical URL** | `alternates.canonical` no metadata | ✅ |
| **Schema.org** | `SportsTeam` para cada página de clube | ✅ |
| **Open Graph** | OG: title, description, image, locale (pt_BR), type | ✅ |
| **Twitter Cards** | `summary_large_image` com OG image | ✅ |
| **Performance** | Lazy loading, WebP/AVIF (Next.js Image), CLS < 0.1 | 🔄 |
| **Core Web Vitals** | LCP < 2.5s, FID < 100ms, CLS < 0.1 | 🔄 |
| **HTTPS + HSTS** | Strict-Transport-Security com preload (produção) | ✅ (API) |

### 2.2 Táticas de Conteúdo

- **Cluster de tópicos**: cada clube/jogador/competição é um hub de conteúdo
- **Internal linking**: clubes → jogadores → competições → rankings
- **URLs semânticas**: `/clubs/flamengo`, `/players/pele`, `/rankings/cbf-2023`
- **Breadcrumbs**: structured data BreadcrumbList em todas as páginas

### 2.3 Palavras-chave Alvo

| Palavra-chave | Volume (BR) | Intenção | Página Alvo |
|---|---|---|---|
| história do futebol | 🔴 Alta | Informativa | Home |
| ranking clubes brasileiros | 🟡 Média | Comparativa | Rankings |
| maior artilheiro do brasil | 🟡 Média | Factual | Players |
| fundação do flamengo | 🔴 Alta | Factual | Club Detail |
| competições de futebol | 🟡 Média | Exploratória | Competitions |

---

## 3. AEO — Answer Engine Optimization

### 3.1 Objetivo

Aparecer nos **Featured Snippets** (posição 0) e **People Also Ask** do Google.

### 3.2 Táticas

| Tática | Descrição |
|---|---|
| **Perguntas diretas** | Títulos H2/H3 em formato de pergunta: "Qual o clube mais antigo do Brasil?" |
| **Respostas concisas** | Parágrafo de 40-50 palavras respondendo diretamente após cada H2/H3 |
| **Listas e tabelas** | Dados estruturados em `<ul>`, `<ol>`, `<table>` para snippets de lista |
| **Definições** | `<dfn>` para termos: "O Almanaque dos Clubes é uma plataforma de..." |
| **FAQ Schema** | `@type: FAQPage` com perguntas e respostas no JSON-LD |
| **HowTo Schema** | Para guias: "Como pesquisar rankings históricos" |

### 3.3 Exemplo de Estrutura AEO

```html
<h2>Qual o clube de futebol mais antigo do Brasil?</h2>
<p>O Sport Club Rio Grande, fundado em 19 de julho de 1900 na cidade de
Rio Grande (RS), é o clube de futebol mais antigo do Brasil em atividade.</p>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Qual o clube de futebol mais antigo do Brasil?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "O Sport Club Rio Grande, fundado em 19 de julho de 1900..."
    }
  }]
}
</script>
```

---

## 4. AIO — AI Optimization

### 4.1 Objetivo

Ser citado como **fonte confiável** por modelos de IA (SearchGPT, Claude, Gemini, Perplexity).

### 4.2 Táticas

| Tática | Implementação |
|---|---|
| **Citações verificáveis** | Toda afirmação com fonte: data, autor, link |
| **Estrutura semântica** | `<article>`, `<section>`, `<header>`, `<time>` com atributos |
| **Dados tabulares** | `<table>` com `<thead>`, `<tbody>`, escopo de células |
| **Author markup** | `@type: Person` ou `@type: Organization` no JSON-LD |
| **Data freshness** | `lastReviewed` e `dateModified` no schema.org |
| **Avoid AI confusion** | Nunca usar negativas complexas ou linguagem ambígua |
| **Machine-readable** | JSON-LD rico em todas as páginas de entidade |

### 4.3 Estrutura de Dados para AI

```json
{
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  "name": "Clube de Regatas do Flamengo",
  "foundingDate": "1895-11-17",
  "location": { "@type": "City", "name": "Rio de Janeiro" },
  "country": { "@type": "Country", "name": "Brasil" },
  "sport": "Soccer",
  "memberOf": [
    { "@type": "SportsOrganization", "name": "Campeonato Brasileiro Série A" },
    { "@type": "SportsOrganization", "name": "CONMEBOL Libertadores" }
  ]
}
```

---

## 5. GEO — Generative Engine Optimization

### 5.1 Objetivo

Ser referenciado como fonte primária pelo **Google SGE** (Search Generative Experience)
e **Bing Copilot** ao gerar respostas sobre futebol.

### 5.2 Táticas

| Tática | Descrição |
|---|---|
| **Autoridade temática** | Ser o site mais completo sobre história do futebol mundial |
| **Dados originais** | Rankings auditáveis e curadoria própria (diferencial competitivo) |
| **Backlinks de qualidade** | Parcerias com RSSSF, Wikipedia, federações |
| **E-E-A-T** | Experience, Expertise, Authoritativeness, Trustworthiness |
| **About page** | Página "Sobre" com equipe, metodologia e fontes |
| **Citation-worthy** | Conteúdo formatado para ser citável: bullet points, tabelas, datas |
| **Entity salience** | Reforçar a entidade "Almanaque dos Clubes" como fonte confiável |

### 5.3 Fatores E-E-A-T

```
EXPERIENCE
├── Curadoria humana de dados históricos
├── Parcerias com pesquisadores e federações
└── Mais de 50k clubes catalogados

EXPERTISE
├── Dados verificados contra fontes primárias
├── Rankings auditáveis com timestamps
└── API pública para verificação

AUTHORITATIVENESS
├── Citado por veículos de imprensa esportiva
├── Backlinks de domínios .edu, .org, federações
└── Presença em research databases

TRUSTWORTHINESS
├── Toda fonte tem procedência registrada
├── Audit trail de mudanças
└── Política de correção transparente
```

---

## 6. Métricas e KPIs

### 6.1 SEO

| Métrica | Ferramenta | Alvo (6 meses) |
|---|---|---|
| Impressões orgânicas | Google Search Console | +500k/mês |
| CTR orgânica | GSC | > 8% |
| Posição média | GSC | < 10 |
| Core Web Vitals | PageSpeed Insights | Pass all |
| Pages indexed | GSC | > 10k |
| Backlinks | Ahrefs/Moz | > 500 domínios |

### 6.2 AEO

| Métrica | Alvo |
|---|---|
| Featured Snippets conquistados | > 50 |
| People Also Ask aparições | > 200 |
| Taxa de clique em posição 0 | > 15% |

### 6.3 AIO

| Métrica | Alvo |
|---|---|
| Citações em SearchGPT | > 100/mês |
| Citações em Perplexity | > 50/mês |
| Precisão das citações | 100% |

### 6.4 GEO

| Métrica | Alvo |
|---|---|
| Aparições no Google SGE | > 100/mês |
| CTR de links no SGE | > 5% |
| Sentimento em respostas geradas | Positivo/Neutro |

---

## 7. Erros Comuns a Evitar

### 7.1 SEO

| Erro | Correção |
|---|---|
| ❌ Títulos duplicados | ✅ Template de metadata com `%s | Almanaque dos Clubes` |
| ❌ Conteúdo thin (páginas sem valor) | ✅ Cada entidade com descrição rica e dados estruturados |
| ❌ Canonical ausente | ✅ `alternates.canonical` no layout raiz |
| ❌ Sitemap desatualizado | ✅ `sitemap.ts` dinâmico baseado em dados reais |
| ❌ Ignorar mobile-first | ✅ Tailwind responsive + viewport meta |
| ❌ CLS alto (imagens sem dimensão) | ✅ Next.js Image com width/height ou `aspect-ratio` CSS |

### 7.2 AEO

| Erro | Correção |
|---|---|
| ❌ Respostas longas (> 50 palavras) | ✅ Respostas diretas de 30-50 palavras |
| ❌ Enterrar resposta no parágrafo | ✅ Primeira sentença após H2 contém a resposta |
| ❌ Falta de estrutura de lista | ✅ `<ul>`/`<ol>` para ranking, top N, passos |
| ❌ FAQ sem markup | ✅ `@type: FAQPage` no JSON-LD |

### 7.3 AIO

| Erro | Correção |
|---|---|
| ❌ Informação contraditória | ✅ Revisão cruzada de dados |
| ❌ Datas ausentes ou incorretas | ✅ `@type: PropertyValue` com `datePublished` |
| ❌ Linguagem ambígua | ✅ Frases curtas, sujeito + verbo + objeto |
| ❌ Negação confusa | ✅ Preferir afirmações positivas |

### 7.4 GEO

| Erro | Correção |
|---|---|
| ❌ Conteúdo genérico | ✅ Dados originais e curadoria própria |
| ❌ Falta de citations | ✅ Toda informação numérica tem fonte |
| ❌ E-E-A-T baixo | ✅ About page + linkedin/equipe |
| ❌ Ignorar entity salience | ✅ Reforço consistente da marca Almanaque dos Clubes |

---

## 8. Implementação Técnica

### 8.1 Arquivos Implementados

| Arquivo | Função |
|---|---|
| `src/app/layout.tsx` | Metadata global, JSON-LD, OG, Twitter |
| `src/app/sitemap.ts` | Sitemap XML dinâmico |
| `src/app/robots.ts` | Robots.txt com regras de crawler |
| `src/app/manifest.ts` | PWA Manifest |
| `src/app/clubs/[id]/page.tsx` | JSON-LD SportsTeam por clube |

### 8.2 Checklist de Implantação

- [ ] Submeter sitemap ao Google Search Console
- [ ] Submeter sitemap ao Bing Webmaster Tools
- [ ] Verificar robots.txt com Google Robots Testing Tool
- [ ] Testar JSON-LD com Google Rich Results Test
- [ ] Verificar Core Web Vitals no PageSpeed Insights
- [ ] Configurar Google Analytics 4 + Search Console
- [ ] Configurar monitoramento de featured snippets
- [ ] Auditar backlinks trimestralmente
- [ ] Revisar structured data a cada nova funcionalidade
- [ ] Manter `lastModified` atualizado no sitemap
