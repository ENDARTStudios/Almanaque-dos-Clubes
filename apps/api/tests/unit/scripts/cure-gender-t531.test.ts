/**
 * T531 — testes da decisão da cura de gender. O que é travado aqui:
 *
 *  1. P21 é quem manda (feminino corrige, MASCULINO nunca é tocado — nome engana);
 *  2. sem P21, só o nome que DECLARA feminino (marcador como palavra, não substring);
 *  3. leitura do P21 nos dois formatos que a API do Wikidata devolve.
 */
import { describe, expect, it } from 'vitest';
import { genderVerdict, nameDeclaresFemale, p21Of } from '../../../src/scripts/cure-gender-t531.js';

describe('T531 — veredito da cura de gender', () => {
  it('P21 feminino corrige, independente do nome', () => {
    expect(genderVerdict('Q6581072', 'Sport Club Qualquer')).toBe('wikidata_p21_female');
  });

  it('P21 MASCULINO nunca é corrigido (nome engana, dado manda)', () => {
    // É o contador de falsos candidatos do relatório.
    expect(genderVerdict('Q6581097', 'Alguma Coisa Women')).toBe('wikidata_p21_male');
  });

  it('sem P21, o nome que declara feminino decide', () => {
    expect(genderVerdict(null, 'Seleção Brasileira de Futebol Feminino')).toBe(
      'name_declares_female',
    );
    expect(genderVerdict(null, "Peñarol women's")).toBe('name_declares_female');
    expect(genderVerdict(null, 'Associação X (futebol feminino)')).toBe('name_declares_female');
    expect(genderVerdict(null, 'Barcelona Femminile')).toBe('name_declares_female');
  });

  it('sem P21 e sem marcador no nome: fora (não adivinha)', () => {
    expect(genderVerdict(null, 'Club Atlético Peñarol')).toBe('sem_fonte');
    expect(genderVerdict(null, 'Santos Futebol Clube')).toBe('sem_fonte');
  });

  it('marcador tem de ser PALAVRA (não substring de outro nome)', () => {
    expect(nameDeclaresFemale('Femininense FC')).toBe(false);
    expect(nameDeclaresFemale('Women’s United')).toBe(true);
    expect(nameDeclaresFemale('Clube Feminino de Futebol')).toBe(true);
  });

  it('lê o P21 nos dois formatos da API', () => {
    expect(p21Of({ claims: { P21: [{ mainsnak: { datavalue: { value: 'Q6581072' } } }] } })).toBe(
      'Q6581072',
    );
    expect(
      p21Of({
        claims: {
          P21: [{ mainsnak: { datavalue: { value: { id: 'Q6581072', 'entity-type': 'item' } } } }],
        },
      }),
    ).toBe('Q6581072');
    expect(p21Of({ claims: {} })).toBeNull();
  });
});
