/**
 * T565 — gate de operador: só o dono do site nas superfícies internas.
 *
 * O que o Operador pediu: "a área do admin é restrita apenas o operador (dono do site) deve
 * conter login e senha e todos os mecanismos de segurança".
 *
 * O que já existia e o que faltava: a API protegia com `authenticate + requireRole('admin')`.
 * Isso responde "tem o PAPEL admin?" — e qualquer conta que receba esse papel, por engano, por
 * escalada de privilégio ou por um seed mal configurado, entrava. O que faltava é a pergunta
 * diferente e mais restrita: "esta pessoa É o operador?".
 *
 * Estes testes cobrem a DECISÃO de autorização isolada do Fastify, e os casos escolhidos são os
 * que separam um gate de verdade de um gate decorativo.
 */
import { describe, it, expect } from 'vitest';
import { ehOperador } from '../../src/modules/auth/operator.middleware.js';

describe('ehOperador — a decisão de autorização', () => {
  it('aceita o e-mail do operador', () => {
    expect(ehOperador('endart.studios@gmail.com')).toBe(true);
  });

  it('aceita variação de caixa e espaço (é a mesma identidade)', () => {
    expect(ehOperador('ENDART.STUDIOS@GMAIL.COM')).toBe(true);
    expect(ehOperador('  endart.studios@gmail.com  ')).toBe(true);
    expect(ehOperador('Endart.Studios@Gmail.Com')).toBe(true);
  });

  it('recusa sem e-mail, vazio ou nulo (fail-closed)', () => {
    // O caso que importa: identidade ausente NÃO é identidade aprovada. Um gate que trata
    // "sem e-mail" como "passa" abre exatamente quando o token não traz a claim.
    expect(ehOperador(null)).toBe(false);
    expect(ehOperador(undefined)).toBe(false);
    expect(ehOperador('')).toBe(false);
    expect(ehOperador('   ')).toBe(false);
  });

  it('recusa qualquer outro e-mail', () => {
    expect(ehOperador('outro@gmail.com')).toBe(false);
    expect(ehOperador('admin@almanaquedosclubes.com')).toBe(false);
    expect(ehOperador('endart.studios@gmail.com.br')).toBe(false);
  });

  it('NÃO casa por prefixo, sufixo ou substring', () => {
    /* Esta é a família de erros que transforma uma allowlist em porta aberta. Se a comparação
       fosse `includes` ou `startsWith`, todos estes passariam: */
    expect(ehOperador('xendart.studios@gmail.com')).toBe(false); // prefixo
    expect(ehOperador('endart.studios@gmail.com.evil.io')).toBe(false); // sufixo/domínio forjado
    expect(ehOperador('nao-endart.studios@gmail.com')).toBe(false);
    expect(ehOperador('endart.studios@gmail.co')).toBe(false);
  });

  it('NÃO casa por domínio (senão qualquer gmail entra)', () => {
    expect(ehOperador('qualquer@gmail.com')).toBe(false);
    expect(ehOperador('gmail.com')).toBe(false);
    expect(ehOperador('@gmail.com')).toBe(false);
  });

  it('não confunde com o domínio parecido', () => {
    expect(ehOperador('endart.studios@gmail.com ')).toBe(true); // só espaço nas pontas
    expect(ehOperador('endart.studios+tag@gmail.com')).toBe(false); // alias NÃO é a mesma caixa
    expect(ehOperador('endartstudios@gmail.com')).toBe(false); // sem o ponto
  });
});
