# Verificação visual geral — o que faltava para o conceito

> Cinco pedidos desta rodada, e depois a varredura que o quinto pedido exigia.

---

## 1. Gráficos animados ✓

`graficos-animados.svg` — **9 KB**, três gráficos com animação real, gerado por `svgs_animados.py`.

| Gráfico | Animação | Por que essa e não outra |
|---|---|---|
| **Barras** | crescem da base, 60ms entre uma e outra | a ordem de aparecimento é a ordem de leitura: o olho segue a série |
| **Linha** | desenha com `stroke-dashoffset` | a linha sendo desenhada **é** a série temporal — a animação repete o significado |
| **Donut** | arco varre das 12h, 80ms entre fatias | a proporção é construída, não revelada de surpresa |

Todas: rodam **uma vez** (dado não fica pulsando), duram menos de 900ms, e têm
`prefers-reduced-motion` que mostra o desenho final inteiro. O texto e os eixos aparecem
imediatamente — número que espera animação para ser lido é número que o usuário não leu.

**Verificação:** rasterizei o quadro 0 pelo FigCraft para conferir a composição. A animação roda
no navegador; não a vi rodar dentro do FigCraft.

---

## 2. Página 404 ✓

`404.png` — a bola furada.

Esfera em linhas com cinco pentágonos em crimson, um **rasgo em ziguezague** no quadrante inferior
direito e três arcos de ar escapando. Abaixo, a legenda "a bola furou" — sem emoji, sem drama.

**A página oferece três saídas**, não só um "voltar": a busca, o atalho para Competições, Clubes e
Lendas, e o texto que diz o que aconteceu. Rodapé: *"o 404 não é erro do acervo: nenhum dado é
inventado para preencher a página."*

---

## 3. Sobre e Legal ✓

### `sobre.png` — 72 camadas
"Um acervo, não um agregador". Quatro números do acervo, três colunas (*o problema · o que fazemos ·
o que não fazemos*), **quem faz** por papel real (curadoria, engenharia, comunidade), **como se
sustenta** (aberto / apoiador / institucional, com a regra: quem paga recebe recurso de pesquisa,
não acesso privilegiado), as quatro promessas em faixa escura, e a ficha do projeto.

### `legal.png` — 95 camadas
Uma família, um desenho: **privacidade · termos · cookies · direitos autorais · LGPD** com a mesma
navegação em todos.

Cada documento abre com **"Em uma frase"** em bloco destacado — o que o leitor precisa saber antes
do detalhe. Depois: sumário lateral, tabela de dados (dado → finalidade → base legal → retenção),
os quatro direitos em cartões, e o histórico de versões no pé.

---

## 4. Cores ampliadas ✓

`fundamentos.png` — 107 camadas. O problema era real: **duas institucionais não sustentam um acervo
com 1.932 competições e seis tipos de gráfico**. Com duas cores, a terceira categoria virava cinza
e desaparecia.

**Quatro novas, todas de DADO:**

| Token | Hex | Papel | Contraste sobre `#faf8f5` |
|---|---|---|---|
| `petrol` | `#0f6b6b` | 3º matiz — nacional, série 3 | **6,00:1** ✅ |
| `olive` | `#5c6b1f` | categoria fria — estadual, série 4 | **5,58:1** ✅ |
| `plum` | `#6d2e5f` | histórico e lenda — série 5 | **9,00:1** ✅ |
| `slate` | `#34506b` | neutro — "outros", "sem dado" | **7,91:1** ✅ |

**A regra que as governa** (na página e em `ficha_cores.py`):
1. Nenhuma compete com a marca — o crimson continua sendo o único acento de ação.
2. Cor nova é cor de **dado**: só em série, faixa de alcance e mapa.
3. Todas passam AA sobre o papel — medido, não estimado.
4. **Nenhuma é violeta nem índigo** — as famílias que o Taste Skill bane como paleta de assistente.

Cada uma tem par no escuro com a mesma relação. O CSS está em `ficha_cores.css()`.

---

## 5. A varredura: o que ainda falta

### Faltam páginas
| Página | Situação | Dados |
|---|---|---|
| **Estádios (índice)** | só a ficha existe | 84 estádios |
| **Rankings (índice)** | existe rascunho, sem a lista dos 72 | 72 |
| **Notificações** | sem desenho | — |
| **Painel de assinatura / checkout** | sem desenho | — |
| **Admin: as 10 sub-rotas** | só a visão geral | 12 rotas |
| **Auth: entrar, criar conta, recuperar senha** | sem desenho | — |

### Faltam estados — em **todas** as 22 telas
Nenhuma tela tem **vazio**, **erro**, **carregando** ou **sem permissão**. É a maior lacuna
estrutural do conceito: um acervo com 23% de cobertura de estado vai mostrar "vazio" o tempo todo,
e não há desenho para isso.

### Faltam telas por dispositivo
Todas as 22 são desktop 1440. Não há **390px** — e o menu de 7 itens não cabe em celular.

### Inconsistências que a varredura achou
| Item | Onde | Problema |
|---|---|---|
| Nav | todas | 7 itens fixos, mas "Comparar" e "Busca" não têm lugar no mobile |
| Rodapé | todas | só a procedência; não existe rodapé institucional (links de Legal, Sobre, contato) |
| Breadcrumb | entidades | ausente — em 3 níveis (país → estado → cidade) é obrigatório |
| Título de página | todas | `<h1>` existe, mas sem `document.title` nem meta |
| Paginação | listas | nenhuma das listas densas tem paginação desenhada |

### Pendências de dado já registradas (não resolvidas)
- `jogador`: **"Assist. 367"** é inventado; **"11 prêmios"** no rótulo contra 2 na tabela.
- `clube`: **812 gols** e **426 jogos** sem conferência.
- Fileiras de cartões idênticos em clube, home e competições (bento grid desenhado, não aplicado).

---

## 6. Estado

| | |
|---|---|
| Páginas no FigCraft | **10** |
| Frames | **22** |
| Camadas | **~3.000** |
| Capturas | **22** |
| Artefatos animados | `globo-animado.svg` (45 KB) · `graficos-animados.svg` (9 KB) |
| Maior vazio | 52px (margem intencional) |
