/**
 * Hierarquia de "Destaques" (`lib/competition-tier.ts`).
 *
 * ── O QUE ESTE TESTE PROTEGE ─────────────────────────────────────────────────────────────
 * Três defeitos foram medidos na seção antiga, e todos voltariam em silêncio se a lógica
 * regredisse:
 *
 *   1. DUPLICATAS — UEFA Champions League, Copa Libertadores e AFC Champions League Elite
 *      estavam em DOIS blocos com o mesmo `id`. 25 entradas para 22 competições distintas.
 *   2. ESCALA MISTURADA — "FIFA World Cup" e "Campeonato Cearense" com o mesmo peso.
 *   3. SEIS COPAS ESTADUAIS femininas em "Destaques" — alcance regional tratado como destaque.
 *
 * O teste usa ids REAIS do acervo (os mesmos das âncoras curadas), porque um teste com ids
 * inventados não pegaria um erro de digitação no mapa de degraus — que é exatamente o tipo de
 * erro que faria uma competição cair no degrau errado.
 */
import { describe, it, expect } from 'vitest';
import {
  agruparPorDegrau,
  DEGRAU_POR_ID,
  FORA_DE_DESTAQUES,
  ORDEM_DEGRAUS,
} from '@/lib/competition-tier';
import type { AnchorCompetition } from '@/lib/competition-anchors';

const ID = {
  mundialCopa: 'c94c3d26-c3a8-45e0-8f4b-c2bd19707688',
  mundialClubes: '20fd756a-e71c-495f-9f81-704ad59d3cf3',
  champions: '8fae6a29-79c5-43d8-81ee-4b569361926b',
  libertadores: '9d50e9fa-bc31-4ea8-af77-e429f451ff52',
  sudamericana: '110b0da4-3426-46b2-8abe-41772ae2e200',
  brasileiraoFem: '28b9b4a6-6ae8-4062-aec6-5f3ca127d421',
  cariocaFem: '88071e41-4a66-4f0f-9afb-ec01853b8215',
  desconhecido: '00000000-0000-4000-8000-000000000000',
} as const;

const c = (id: string, name = 'X'): AnchorCompetition => ({
  id,
  qid: null,
  name,
  country: null,
  gender: 'men',
});

describe('agruparPorDegrau — deduplicação', () => {
  it('o MESMO id em duas listas aparece UMA vez só', () => {
    /* Foi o defeito real: as âncoras continentais e internacionais traziam a mesma competição
       com o mesmo UUID. */
    const r = agruparPorDegrau([
      [c(ID.champions, 'UEFA Champions League')],
      [c(ID.champions, 'UEFA Champions League')],
    ]);
    const total = r.reduce((s, d) => s + d.itens.length, 0);
    expect(total).toBe(1);
    expect(r[0].itens[0].name).toBe('UEFA Champions League');
  });

  it('ids diferentes da mesma competição-irmã NÃO são fundidos', () => {
    const r = agruparPorDegrau([[c(ID.champions), c(ID.libertadores)]]);
    expect(r.reduce((s, d) => s + d.itens.length, 0)).toBe(2);
  });
});

describe('agruparPorDegrau — degraus de alcance', () => {
  it('Copa do Mundo cai em `mundial`; Champions em continental; Brasileirão Fem em nacional', () => {
    const r = agruparPorDegrau([
      [c(ID.mundialCopa), c(ID.champions), c(ID.brasileiraoFem), c(ID.sudamericana)],
    ]);
    const porId = new Map<string, string>();
    for (const d of r) for (const it of d.itens) porId.set(it.id, d.id);

    expect(porId.get(ID.mundialCopa)).toBe('mundial');
    expect(porId.get(ID.champions)).toBe('continentalTop');
    expect(porId.get(ID.sudamericana)).toBe('continentalSecundaria');
    expect(porId.get(ID.brasileiraoFem)).toBe('nacional');
  });

  it('id desconhecido cai em `nacional` — nunca é promovido a mundial por omissão', () => {
    const r = agruparPorDegrau([[c(ID.desconhecido, 'Competição Nova')]]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('nacional');
  });

  it('os degraus saem na ordem do maior alcance para o menor', () => {
    const r = agruparPorDegrau([
      [c(ID.brasileiraoFem), c(ID.champions), c(ID.mundialCopa), c(ID.sudamericana)],
    ]);
    const ordem = r.map((d) => d.id);
    const indices = ordem.map((id) => ORDEM_DEGRAUS.indexOf(id));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('degrau vazio é omitido — a página não mostra título sem conteúdo', () => {
    const r = agruparPorDegrau([[c(ID.champions)]]);
    expect(r.map((d) => d.id)).toEqual(['continentalTop']);
  });

  it('lista vazia devolve lista vazia (não inventa degrau)', () => {
    expect(agruparPorDegrau([[], []])).toEqual([]);
  });
});

describe('agruparPorDegrau — o que fica FORA de Destaques', () => {
  it('as copas estaduais femininas são excluídas, e cada exclusão tem motivo escrito', () => {
    /* Excluir é uma decisão editorial. Ela é declarada em FORA_DE_DESTAQUES com o motivo, para
       ninguém achar que sumiram por bug — e para a próxima pessoa poder discordar. */
    for (const [id, motivo] of Object.entries(FORA_DE_DESTAQUES)) {
      expect(motivo.length, `exclusão ${id} sem motivo`).toBeGreaterThan(10);
    }
    const r = agruparPorDegrau([[c(ID.cariocaFem, 'Campeonato Carioca Feminino')]]);
    expect(r).toEqual([]);
  });

  it('as âncoras de alcance NACIONAL continuam entrando', () => {
    const r = agruparPorDegrau([[c(ID.brasileiraoFem, 'Brasileirão Feminino A1')]]);
    expect(r[0].itens[0].name).toBe('Brasileirão Feminino A1');
  });
});

describe('mapa de degraus', () => {
  it('todo id mapeado aponta para um degrau válido', () => {
    for (const [id, degrau] of Object.entries(DEGRAU_POR_ID)) {
      expect(ORDEM_DEGRAUS, `${id} tem degrau inválido`).toContain(degrau);
    }
  });

  it('nenhum id está mapeado E excluído ao mesmo tempo', () => {
    const ambos = Object.keys(DEGRAU_POR_ID).filter((id) => FORA_DE_DESTAQUES[id]);
    expect(ambos, 'id em dois estados: escolha um').toEqual([]);
  });
});
