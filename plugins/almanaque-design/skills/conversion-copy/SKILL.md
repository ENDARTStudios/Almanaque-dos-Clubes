---
name: conversion-copy
description: Framework de copy de conversão (Gancho → Promessa → Prova → CTA) para o Almanaque dos Clubes, em pt-BR/en-US/es-ES, com as restrições de honestidade do acervo. Use ao escrever ou revisar headline, subheadline, CTA, e-mail, post, descrição de plano, meta description ou qualquer texto que precise levar alguém a agir; também ao auditar texto existente que "não vende".
---

# Copy de conversão — H→P→P→CTA

## O framework

| Bloco | Função | Onde vive | Erro típico |
|---|---|---|---|
| **Gancho** | dor, desejo ou curiosidade nos 3 primeiros segundos | H1 + eyebrow | descrever a empresa ("A História do Futebol num Só Lugar") |
| **Promessa** | o que a pessoa ganha, simples e direto | subheadline + bullets | lista de features em vez de resultado |
| **Prova** | caso real, dado, bastidor, demonstração | card de dado/ranking/campeão | adjetivo ("o melhor", "completo") |
| **CTA** | o comando exato do próximo passo | botão | "Saiba mais", "Clique aqui" |

Regra de ouro: **o gancho nomeia o problema do visitante, não a categoria do produto.**

## Ganchos que funcionam para este acervo

1. **A história que merece ser contada** — "Todo clube tem uma história que merece ser contada."
   (desejo: memória e pertencimento)
2. **A passagem do tempo** — "Do primeiro escanteio ao último título." (desejo: a saga completa)
3. **O ídolo e a era** — "clubes, campeões, ídolos e as eras que ficaram." (desejo: nostalgia)
4. **A discussão de boteco** — "Quem foi o maior? Agora tem resposta com fonte."
   (dor: opinião sem dado) — use com cuidado, ver a regra abaixo

Evite: "Bem-vindo ao…", "Descubra o mundo do…", "A maior enciclopédia do…" (não comprovável),
"em construção" como gancho (a lacuna é nota de rodapé, não manchete).

## A REGRA QUE CUSTOU UM RETRABALHO: método não é gancho

O Operador reprovou a chamada *"Quem foi o maior: o seu palpite ou o dado com fonte?"* com todas
as letras. O motivo não era estilo — era **posicionamento**. Três erros concretos, para não
repetir:

| Erro | Por que é erro |
|---|---|
| **"o seu palpite"** | Desqualifica a emoção do torcedor. Futebol não é palpite: é paixão. A palavra transforma o visitante em quem está errado. |
| **estrutura "X ou Y?"** | Trata a memória do torcedor como erro a ser corrigido. O produto não corrige ninguém: ele **honra** a história. |
| **"dado com fonte" na manchete** | Vocabulário de auditoria no ponto mais nobre da página. Fonte é **garantia**, não desejo. |

**A ordem correta:** o gancho vende **emoção** (paixão, memória, pertencimento, nostalgia) e a
fonte aparece **depois** — como garantia no apoio e como prova no cartão de dado. Um acervo de
futebol não é comprado por quem quer auditar procedência; é aberto por quem ama futebol.
Auditar é o que faz a pessoa **ficar** e recomendar, não o que a faz entrar.

**Teste de mesa antes de publicar um H1:** troque "futebol" por "planilhas". Se a frase continuar
fazendo sentido, ela está vendendo o método, não a paixão. ("Todo clube tem uma história que merece
ser contada" morre ao virar "toda planilha tem uma história" — sinal de que o gancho é do produto
certo.)

**Corolário:** se a fonte aparece duas vezes na mesma dobra (manchete + apoio), você não confiou no
argumento emocional e encheu o espaço com metodologia. Uma vez, no lugar certo, basta.


## Regras de honestidade (não negociáveis)

- Números só vindos da API (`total` real) ou de `docs/`. Nunca arredondar para cima, nunca
  "mais de X" quando X é o valor exato.
- Recurso "em breve" não pode ser argumento de compra. Uma menção, no fim, com a palavra
  "em breve" explícita.
- Sem depoimento inventado, sem logo de parceiro, sem prêmio. Se o Operador fornecer
  depoimento real, ele entra com nome e contexto e fica registrado em `docs/`.
- Lacuna declarada > silêncio. Se o acervo não cobre algo, diga (uma vez).

## Vocabulário canônico (use o mesmo nos 3 idiomas)

| pt-BR | en-US | es-ES |
|---|---|---|
| acervo | archive | acervo |
| proveniência | provenance | procedencia |
| fonte verificada | verified source | fuente verificada |
| auditável | auditable | auditable |
| lacuna declarada | declared gap | laguna declarada |
| campeão vigente | reigning champion | campeón vigente |
| ranking auditável | auditable ranking | ranking auditable |

Nunca traduza "Almanaque dos Clubes" (marca). Nomes de clube/competição vêm do acervo, não do
dicionário.

## CTA: verbo + objeto + ausência de atrito

| ✅ | ❌ |
|---|---|
| Explorar o acervo agora | Saiba mais |
| Criar conta gratuita | Cadastre-se |
| Ver os campeões com fonte | Clique aqui |
| Comparar dois clubes | Acessar |

O microcopy de atrito fica **abaixo** do botão e responde a objeção real daquele passo
("Sem cartão de crédito", "Sem cadastro para explorar", "Cancelar quando quiser").

## Onde as strings ficam

- Dicionário global: `apps/web/src/i18n/dictionaries/{pt-br,en-us,es-es}.ts` + tipo em
  `apps/web/src/i18n/types.ts` (só para `home`, `common`, `auth`…).
- Módulos aditivos por workstream: `apps/web/src/i18n/wsC*.ts` (`Record<Locale, XStrings>`),
  o padrão para copy nova de uma tela. Prefira isto a inflar o `Dictionary`.
- **Interpolação** existe: `t('home.statsNote', { n: 11987 })` casa `{n}`.
- Paridade obrigatória: os 3 idiomas com as **mesmas** chaves, senão o typecheck quebra.

## Antes de publicar

1. Leia o H1 em voz alta: resolve uma dor ou descreve a empresa?
2. Conte os CTAs primários na dobra: precisa ser exatamente 1.
3. Confira cada número contra a API/fonte.
4. Rode o subagente `design-critic` (ver skill `design-subagents`).
