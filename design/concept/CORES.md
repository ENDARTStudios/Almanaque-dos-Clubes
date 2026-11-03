# Cor aplicada — metais e paleta de dado

> Duas camadas de cor agora, com papéis separados: **metal** diz o lugar no pódio, **paleta de
> dado** diz a categoria. Nenhuma das duas compete com o crimson, que continua sendo o único
> acento de ação.

---

## 1. Os metais

A distinção que quase todo pódio erra: **a cor do objeto e a cor da palavra não são a mesma**.

| Metal | Forma (medalhão) | Texto (AA sobre papel) | Contraste |
|---|---|---|---|
| **Ouro** | `#c9a227` | `#94600a` | **5,03:1** ✅ |
| **Prata** | `#b8bfc7` | `#5d6670` | **5,50:1** ✅ |
| **Bronze** | `#c07a45` | `#8a5a2b` | **5,54:1** ✅ |

O ouro vivo sobre `#faf8f5` dá **2,28:1** — reprova para texto e é correto que reprove. Ele existe
como **preenchimento de forma**, onde contraste não se aplica. O texto usa o metal escurecido.

### A forma carrega a informação, não só a cor

| Posição | Medalhão |
|---|---|
| 1º | disco cheio **+ anel externo** |
| 2º | disco vazado, anel simples |
| 3º | disco **menor** (0,88×) |

Em preto e branco o pódio continua legível: pelo anel, pelo tamanho e pelo número.

### Onde os metais entraram

| Página | Antes | Depois |
|---|---|---|
| **Competições** | pódio em crimson / ocre / cinza | Argentina **ouro**, França **prata**, Croácia **bronze** |
| **Lendas** | posições 1–5 todas em cinza | 1 **ouro**, 2 **prata**, 3 **bronze**, 4–5 neutro |
| **Lendas (clubes)** | idem | idem |
| **Ranking** | top 3 só em negrito | disco de metal na coluna da posição |
| **Clube** | troféus em ocre genérico | todos em **ouro vivo** — troféu é sempre ouro; o que muda é tamanho e quantidade |

---

## 2. A paleta de dado, aplicada

As quatro cores novas deixaram de ser uma página de amostra e passaram a trabalhar:

| Onde | Antes | Depois |
|---|---|---|
| **Degraus de alcance** (Competições) | ocre / crimson / cinza | **ouro** (mundial) · **crimson** (continental) · **petrol** (nacional) · **slate** (estadual) |
| **Troféus do índice** | ocre / cinza | **ouro** para continental · **slate** para nacional |
| **Mapa** — rampa de intensidade | crimson | **petrol** — a cor de ação da marca não deve gritar no mapa, senão mapa e competição competem |
| **Lendas** — barras horizontais | cinza + ocre na 1ª | **petrol** na série, **ouro** no líder |
| **Lendas** — donut de recordes | crimson/ocre/cinza/cinza | crimson · ouro · **petrol** · **plum** |
| **Admin** — donut de execuções | vermelho/cinza/cinza | **ouro** (sucesso) · crimson (falha) · cinza (parada) |
| **Admin** — barras de qualidade | ocre fixo | **ouro** quando saudável, **crimson** quando abaixo de 30% |

### A correção que veio junto

`barras()` coloria a **última** barra por acidente de laço — o destaque apontava para o dado errado.
Agora colore a de **maior valor**, em ouro. Em "Gols por década", o destaque passou da década de
1980 (128 gols) para a de 1960 (522 gols), que é o que a página quer dizer.

E a série horizontal usa ouro no **líder**: "Clubes no panteão por país" destaca a Espanha, não a
França.

---

## 3. O que não mudou

- **Crimson continua sendo o único acento de ação.** Botão, link, número-âncora de página.
- **O papel `#faf8f5` e a tinta `#111111`** seguem intocados.
- **Nenhuma cor nova aparece em interface** — só em dado. Um botão nunca é petrol.
- **Nenhuma é violeta nem índigo.**

---

## 4. Estado

| | |
|---|---|
| Páginas | **10** |
| Frames | **22** |
| Camadas | **3.223** |
| Capturas | **22** |
| Rebuild | `reconstruir_tudo.py` — fonte única do arquivo |

`reconstruir_tudo.py` passou a ser o script canônico: reconstrói as 10 páginas do zero, aplica
`normalizar` + `assentar_rodape`, deriva a altura de cada moldura do conteúdo e captura um PNG por
frame. `organizar.py` ficou obsoleto — só conhecia 8 páginas e não assentava o rodapé.
