# D-2026-10-24 — "Flagrante jornalístico" e o uso de logos/imagens no Almanaque

> Decisão registrada em `DECISOES.md` (D-2026-10-24-t596-direito-autoral-midia).
> Este documento é a análise; a decisão operacional está no histórico.

## O que foi proposto (item 35)

Usar o "direito de flagrante jornalístico" (Lei 9.610/98) como respaldo jurídico para
usar logos de clubes e imagens de jogadores no Almanaque dos Clubes.

## Análise: por que a tese NÃO ampara o Almanaque

**1. A exceção é do informador, e é efêmera.** O que a doutrina chama de "flagrante
jornalístico" (ou "direito de informação") decorre do art. 46, VIII, da Lei 9.610/98:
não constitui violação a citação de partes de obras "para fins de estudo, crítica ou
polêmica, em tal medida que se justifique o fim a se atingir". A jurisprudência aplica
a relatos de fatos noticiosos no exercício da liberdade de imprensa — o jornalista que
retrata o fato no momento em que ele acontece. O Almanaque não publica reportagem: é
um catálogo persistente e comercial que HOSPEDA e EXIBE mídia de forma permanente. A
exceção não foi desenhada para isso, e o uso contínuo e ilimitado esvazia o teste do
"fim a se atingir".

**2. O STJ já estreitou a tese.** A linha dominante do Superior Tribunal de Justiça
reconhece o flagrante noticioso para a capa de revista/jornal e o relato factual
efêmero, mas NÃO o estende a bancos de imagem, plataformas e usos comerciais
continuados. Apostar a estratégia de mídia do produto numa tese que a corte máxima da
infraconstitucional já restringiu é risco assumido sem necessidade.

**3. Escudo é MARCA, não obra autoral.** Logo de clube é marca registrada (Lei
9.279/96, art. 122 e seguintes). Direito marcário nem sequer é regido pela lei de
direito autoral: o "flagrante jornalístico" sequer chega a ser discutido — o uso em
produto comercial sem autorização do detentor é infração à marca por si só. Pior: o
escudo de clube no Brasil frequentemente TEM titularidade autoral cumulativa (a arte
é obra protegida do designer), então as duas esferas atingem o mesmo uso.

**4. Efeito prático:** notificação de remoção (DMCA própria do produto, já operante
em `/direitos-autorais`), perda de confiança dos detentores, e contradição com a
promessa central do acervo: **procedência auditável linha a linha**.

## O que permanece de pé (e é o que o código já faz)

- **Wikimedia Commons / Wikidata (P18):** a MESMA imagem que a Wikipédia exibe, com
  licença explícita lida via `imageinfo.extmetadata` e GRAVADA por linha em
  `club_crests.license` + `sourceUrl`. NC/ND recusados (produto comercial).
  Implementação: `apps/api/src/scripts/enrich-club-crests.ts` (T32) e
  `enrich-club-crests-p18.ts` (T596).
- **Fotos de jogadores:** idem — Commons/Flickr-CC/Wikidata, licença por arquivo
  (pipeline de mídia existente, `enrich-*-media.ts`).
- **footylogos.com, Seeklogo, Brands of the World:** FORA do acervo. Republicam
  marcas sem licença verificável; "fins ilustrativos" não é licença.
- **historiadofutebol.com (e qualquer fonte editorial):** REFERÊNCIA para curadoria
  — informa O QUE buscar e a datação histórica (listas curadas do bot T32) — mas
  nenhum texto ou imagem é copiado.

## A tese certa para escudos de clubes, quando existir

O caminho legítimo para exibir um escudo que não esteja em licença livre é
**autorização do detentor** (clube/federação) — contrato de licenciamento de marca,
como fazem jogos oficiais licenciados. Isso é decisão comercial do Operador, não de
ingestão automática. Enquanto não houver acordo, a honestidade do acervo vale: escudo
sem licença verificável não entra — lacuna declarada em vez de risco assumido.
