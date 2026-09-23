# Metodologia — Nota 0-100 de Jogadores e Técnicos (T449b)

> **Status:** infraestrutura lógica (motor puro) pronta e testada com **mocks sintéticos**.
> **Nenhum dado real foi lido/gravado** e nenhum endpoint público é ativado neste round.
> Quando houver fonte granular (box-score/estatística por partida), o motor é alimentado
> e as notas passam a ser públicas (round futuro gated no Operador + dados).

## Princípios
- **Transparência:** todo peso, fórmula e normalização está aqui (nada de caixa-preta).
- **Reprodutibilidade:** mesmos dados ⇒ mesmas notas (funções puras, determinísticas).
- **Comparação justa:** normalização **dentro de grupo comparável** (posição/divisão/ano/gênero).
- **Dados parciais:** usa proxies quando necessário e **declara limitação**; nunca inventa.
- **Escala fixa 0-100:** bruto → MinMax/percentil no grupo.

## Fluxo de dados
```
Stats granulares (futuro)  ─┐
                            ├─►  Motor PURO (computePlayerRaw / computeCoachRaw)
Contexto (fase/hierarquia) ─┘         │
                                      ▼
                              Raw Score (por entidade/período)
                                      │
                       Agrupamento comparável (posição/divisão/ano/gênero)
                                      │
                         Normalização (MinMax | percentil)  ──►  Nota 0-100
```
Os testes deste round **não** tocam banco/rede: todas as entradas são objetos sintéticos.

## PARTE 1 — Jogadores

### Fórmula bruta
Por partida: `pontos_partida = (Σ estatística_i × peso_i) × MIJ_partida`
Por período: `bruto = Σ_partidas pontos_partida` (+ bônus/desconto de consistência)

- **MIJ (importância do jogo):** amistoso 0.5 · rodada regular 1.0 · grupos 1.1 · oitavas 1.2 ·
  quartas 1.25 · semi 1.3 · **final 1.5**.
- **Peso hierárquico** (aplicável ao desempenho): Mundial 5.0 · Continental 4.0 · Nacional 3.0 ·
  Estadual 2.0 · Municipal 1.0.

### Pesos por posição (matriz posição × estatística; ilustrativos, públicos)
| Estatística | Atacante | Meia | Volante/Zagueiro | Lateral | Goleiro |
|---|---|---|---|---|---|
| Gols | 3.0 | 2.0 | 1.0 | 0.8 | 0 |
| Assistências | 2.5 | 3.0 | 0.5 | 1.5 | 0 |
| Finalizações certas | 1.5 | 1.0 | 0.2 | 0.5 | 0 |
| Passes certos | 0.5 | 1.0 | 1.5 | 1.0 | 0.5 |
| Cruzamentos certos | 0.3 | 1.5 | 0.2 | 2.0 | 0 |
| Dribles certos | 1.0 | 1.5 | 0.1 | 1.0 | 0 |
| Ações defensivas | 0.1 | 0.3 | 3.0 | 1.5 | 0 |
| Clean sheet | 0 | 0 | 0 | 0 | 2.0 |
| Pênaltis defendidos | 0 | 0 | 0 | 0 | 3.0 |
| Amarelo | -0.2 | -0.2 | -0.3 | -0.2 | -0.5 |
| Vermelho | -2.0 | -2.0 | -2.5 | -2.0 | -5.0 |
| Erro → gol | -1.0 | -1.0 | -1.5 | -1.2 | -3.0 |

**Por que esses pesos?** Gol/assistência são os eventos mais decisivos → peso alto p/ quem os
produz; ações defensivas valem mais para quem defende; o goleiro pontua por clean sheet/pênalti
defendido; cartões e erro-para-gol penalizam. A tabela é **refinável** com benchmark histórico
(quando houver dados) — o compromisso é que permaneça pública e justificada.

### Consistência e amostra
- Titularidade **> 80%** ⇒ **+5%**; **< 50%** ⇒ **-10%**.
- **Anti-inflação:** minutos **< 10%** da média do grupo ⇒ nota capada em **70** (mesmo com
  stats/minuto altas) — reflete amostra insuficiente.

### Normalização
- **MinMax** por grupo: maior bruto ⇒ 100, menor ⇒ 0; **todos iguais ⇒ 50** (sem divisão por zero).
- Alternativa robusta a outliers: **percentil (midrank)**.

## PARTE 2 — Técnicos

### Componentes
1. **Eficiência básica** = `(Vitórias / Jogos) × 100 × peso_médio_ponderado`.
2. **Impacto eliminatório** = Σ bônus por título (Mundial +50 · Continental +40 · Nacional +30 ·
   Estadual +15 · Municipal +8) + **metade** do bônus quando chega à semi/final sem título.
3. **Progresso na liga** = `(PosiçãoInício − PosiçãoFim) × K` + **Promoção +20** / **Rebaixamento −30**.
4. **Interino/curto** ⇒ **×0.7** (não premiar explosões curtas). Amostra mínima ~10 jogos.

`bruto = eficiência + impacto + progresso` (× 0.7 se interino).

Normalização: mesma regra (MinMax/percentil no grupo comparável).

## Limitações da versão stubbed
- **Sem dados reais**: o motor não é alimentado; nada é público.
- **Sem xG/PPDA/passes por distância** (dependem de fonte granular).
- **Sem campo tier/divisão no ranking de clube** (dívida separada — T449c/T449b).
- **Equidade de gênero**: pools **isolados** por gênero+divisão+nível; nunca comparar
  masculino×feminino sem normalização explícita.
- Pesos **ilustrativos** até haver benchmark.

## Reprodutibilidade
Funções puras (`apps/api/src/lib/scoring/**`), sem I/O. `minMaxNormalize`/`percentileRank`
determinísticos. Testes: `apps/api/tests/unit/scoring/{player,coach}.test.ts` (mocks sintéticos;
**zero DB/rede**).
