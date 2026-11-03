# Revisão geral do conceito

> Auditei as 18 telas de forma programática e depois olhei as que nunca tinha visto. Dois
> defeitos graves apareceram — os dois que eu vinha declarando como resolvidos.

---

## 1. O que estava errado

### 1.1 Vazio em 11 das 18 telas — o maior defeito do conceito

Minhas medições anteriores diziam "0 telas com vazio". Estavam **erradas**: mediam o fundo do
frame contra ele mesmo, o que dá zero por definição. Medindo o que importa — a distância entre o
**último bloco de conteúdo** e o **rodapé** — o resultado real era:

| Tela | Vazio | Tela | Vazio |
|---|---|---|---|
| **clube** | **966px** | meu-almanaque | 347px |
| jogador | 519px | admin | 364px |
| partidas | 368px | rankings | 302px |
| temporada | 278px | estadio | 255px |
| lendas | 248px | busca | 173px |
| ranking | 156px | | |

Em `clube` era quase **metade da página vazia**. E `metodologia` tinha o inverso: **−160px** — o
conteúdo passava da moldura.

**Causa:** eu escrevia o `y` do rodapé à mão em cada página, com folga generosa e arbitrária.
Encolher a moldura não resolvia — o buraco estava **dentro** da página.

**Correção:** `assentar_rodape()` move a procedência para `último_conteúdo + 52px`, e a moldura
passa a ser `conteúdo + 60`. Resultado: **todas as 18 telas com a mesma margem de 52px**, e a
altura de cada página é a altura do seu conteúdo — não um número que eu escolhi.

`clube`: 2081 → **1261**. `jogador`: 1720 → **1701** com o conteúdo redistribuído.

### 1.2 Colisão de seções em `clube`

Ao remover o vazio, apareceu o que ele escondia: a "Evolução do escudo" (9 caixas de 135px)
invadia a tabela do "Elenco". O cabeçalho `JOGADOR · POSIÇÃO · IDADE` e os anos `1895 · 1911…`
apareciam **sobrepostos**.

**Causa:** os escudos ocupam `34 + 135 + rótulo do ano`, e eu havia reservado 116px para a seção.

**Correção:** 210px. Verificado na captura — a tabela agora começa abaixo da régua de escudos.

---

## 2. O que a revisão confirmou como certo

| Verificado | Resultado |
|---|---|
| Camadas fora da moldura | **0** em 18 telas |
| Fios de seção (proibidos pela skill) | **0** |
| Eyebrows acima de título | **0** |
| Texto abaixo de 10px | **0** |
| Cor de preenchimento usada como texto | **0** |
| Páginas no FigCraft | **9** |
| Frames, cada um na sua página | **18** |
| Camadas | **~2.640** |
| Capturas | **18**, uma por frame |

---

## 3. O que continua sendo violação — e eu não escondo

### Fileiras de cartões idênticos
O Taste Skill proíbe. Continuam em três telas:
- **clube**: 5 cartões de troféu idênticos e 9 caixas de escudo idênticas;
- **home**: 6 portas de entrada idênticas;
- **competições**: 4 destaques idênticos.

A correção exige recompor as seções, não ajustar propriedade. O **bento grid** da página de
Interação é a resposta certa — está desenhado, mas ainda não aplicado nessas três telas.

### Números inventados
- **`jogador`: "Assist. 367"** — assistências de Pelé não são documentadas de forma confiável.
  É um número que eu inventei para preencher a métrica.
- **`jogador`: "11 prêmios individuais"** no rótulo, mas a tabela lista **2**.
- **`clube`: "812 gols"** e **"426 jogos"** — plausíveis, mas não conferidos contra o acervo.

A regra que eu mesmo escrevi ("contador só entra depois de consulta") foi violada de novo. Estes
três ficam registrados como **pendência de dado**, não como decisão de design.

### Sem imagens reais
Correto para um conceito de design, como você definiu. Fica registrado que a régua de imagem do
Taste Skill vale na implementação.

---

## 4. O que a revisão me ensinou sobre o meu próprio processo

O erro de medição é o mais grave da lista, e não é de design. Eu construí um verificador,
declarei "0 telas com vazio" em três relatórios seguidos, e o número estava errado porque o
verificador media a coisa errada. Um instrumento que sempre devolve "está tudo bem" não é
verificação — é confirmação.

O que mudou: agora a altura da página é **derivada** do conteúdo, não declarada por mim. Não há
como um vazio voltar sem que a altura o denuncie, porque a altura e o conteúdo são a mesma
medida.

---

## 5. Estado final

| | |
|---|---|
| Páginas | **9** |
| Frames | **18** |
| Camadas | **~2.640** |
| Capturas | **18** |
| Maior vazio restante | **52px** (margem intencional, igual em todas) |
| Colisões conhecidas | **0** |

### Pendências registradas

1. Fileiras de cartões idênticos em clube, home e competições — aplicar o bento grid.
2. Números não conferidos em jogador (assistências, contagem de prêmios) e clube (gols, jogos).
3. Variantes de Comparar para jogador e técnico (só clube está preenchido).
4. Estado vazio, erro e carregando: nenhuma tela tem.
5. Responsivo: todas as telas são desktop 1440.
