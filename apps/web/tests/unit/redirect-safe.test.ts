/**
 * T567 — `caminhoInternoSeguro`: o destino pós-login, com proteção contra OPEN REDIRECT.
 *
 * POR QUE ISTO PRECISA DE TESTE E NÃO SÓ DE CÓDIGO
 *   O parâmetro `next` é controlado por quem monta o LINK. Aceitá-lo cru significa que
 *   `/auth/login?next=https://site-falso.com` leva o usuário — JÁ AUTENTICADO, logo depois de
 *   digitar a senha — para um site de terceiro. É o momento em que ele mais confia no remetente,
 *   e é vetor clássico de phishing: a vítima digita a credencial na tela legítima e é entregue ao
 *   atacante em seguida.
 *
 *   A defesa é ALLOWLIST DE FORMA (tem de ser caminho interno), e não lista de sites proibidos:
 *   lista de proibidos sempre tem buraco; regra de forma, não.
 */
import { describe, it, expect } from 'vitest';
import { caminhoInternoSeguro, DESTINO_PADRAO } from '@/lib/redirect-safe';

describe('caminhoInternoSeguro — aceita caminho interno', () => {
  it('aceita o caso que originou a função: voltar para /admin', () => {
    // O `/admin` manda para `/auth/login?next=/admin`; sem isto o Operador caía na home.
    expect(caminhoInternoSeguro('/admin')).toBe('/admin');
  });

  it('aceita caminhos internos com query, âncora e sub-rota', () => {
    expect(caminhoInternoSeguro('/dashboard')).toBe('/dashboard');
    expect(caminhoInternoSeguro('/clubs?country=DE')).toBe('/clubs?country=DE');
    expect(caminhoInternoSeguro('/admin/observability')).toBe('/admin/observability');
    expect(caminhoInternoSeguro('/metodologia#fontes')).toBe('/metodologia#fontes');
  });

  it('aceita a raiz', () => {
    expect(caminhoInternoSeguro('/')).toBe('/');
  });
});

describe('caminhoInternoSeguro — RECUSA tudo que sai do site', () => {
  it('recusa URL absoluta com esquema (o ataque direto)', () => {
    expect(caminhoInternoSeguro('https://site-falso.com')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('http://site-falso.com/login')).toBe(DESTINO_PADRAO);
  });

  it('recusa protocol-relative `//host` — host externo disfarçado de caminho', () => {
    /* Este é o caso que uma checagem ingênua (`startsWith('/')`) deixaria passar: `//evil.com` '
       começa com barra e é interpretado pelo NAVEGADOR como host externo. */
    expect(caminhoInternoSeguro('//site-falso.com')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('//site-falso.com/admin')).toBe(DESTINO_PADRAO);
  });

  it('recusa `/\\host` — a mesma armadilha com backslash', () => {
    expect(caminhoInternoSeguro('/\\site-falso.com')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('/admin\\..\\..')).toBe(DESTINO_PADRAO);
  });

  it('recusa `javascript:` e outros esquemas executáveis', () => {
    // `javascript:` num redirect executa script no contexto do site.
    expect(caminhoInternoSeguro('javascript:alert(1)')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('data:text/html,<script>')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('vbscript:msgbox')).toBe(DESTINO_PADRAO);
  });

  it('recusa esquema executável DENTRO da query — defesa em profundidade', () => {
    /* Tecnicamente `/redirect?to=javascript:...` é caminho interno seguro: o navegador lê como
       `https://site/redirect?to=...` e o `javascript:` é texto de parâmetro. Mas o custo de
       bloquear é zero (nenhum destino legítimo de pós-login carrega isso) e o custo de errar a
       análise uma vez é execução de script no contexto do site. Recusar é a escolha certa. */
    expect(caminhoInternoSeguro('/redirect?to=javascript:alert(1)')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('/x?u=JaVaScRiPt:alert(1)')).toBe(DESTINO_PADRAO);
  });

  it('NÃO recusa query legítima que só parece suspeita', () => {
    // O bloqueio é de esquema executável, não de qualquer coisa com dois-pontos.
    expect(caminhoInternoSeguro('/clubs?country=DE')).toBe('/clubs?country=DE');
    expect(caminhoInternoSeguro('/busca?q=flamengo&page=2')).toBe('/busca?q=flamengo&page=2');
    expect(caminhoInternoSeguro('/competicoes?country=BR&type=liga')).toBe(
      '/competicoes?country=BR&type=liga',
    );
  });

  it('recusa quebra de linha e caractere de controle (header injection)', () => {
    expect(caminhoInternoSeguro('/admin\nLocation: https://x.com')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('/admin\r\nSet-Cookie: a=b')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('/admin\u0000')).toBe(DESTINO_PADRAO);
  });

  it('recusa relativo sem barra inicial', () => {
    expect(caminhoInternoSeguro('admin')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('../admin')).toBe(DESTINO_PADRAO);
  });

  it('recusa ausência e vazio sem quebrar', () => {
    expect(caminhoInternoSeguro(null)).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro(undefined)).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('   ')).toBe(DESTINO_PADRAO);
  });

  it('recusa o disfarce que engana humano: domínio do próprio site como usuário', () => {
    // `almanaquedosclubes.com@evil.io` — o host real é `evil.io`.
    expect(caminhoInternoSeguro('https://almanaquedosclubes.com@evil.io')).toBe(DESTINO_PADRAO);
    expect(caminhoInternoSeguro('//almanaquedosclubes.com@evil.io')).toBe(DESTINO_PADRAO);
  });
});

describe('caminhoInternoSeguro — a invariante que resume a defesa', () => {
  it('TODO retorno ou é caminho interno, ou é o padrão', () => {
    const tentativas = [
      '/admin',
      '//evil.com',
      'https://evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '/ok',
      'admin',
      '/a\nb',
      '  /espaco  ',
    ];
    for (const t of tentativas) {
      const r = caminhoInternoSeguro(t);
      const seguro =
        r === DESTINO_PADRAO ||
        (r.startsWith('/') && !r.startsWith('//') && !r.includes('\\') && !r.includes('\n'));
      expect(seguro, `"${t}" devolveu "${r}", que não é seguro`).toBe(true);
    }
  });
});
