/**
 * T567 — destino pós-login (`?next=`), com proteção contra OPEN REDIRECT.
 *
 * POR QUE ISTO EXISTE: o formulário de login fazia `router.push('/')` fixo. Quem chegava de
 * `/admin` — que manda para `/auth/login?next=/admin` — entrava e era jogado na home, tendo de
 * navegar de novo até a área restrita. O Operador relatou exatamente isso: "área de login não está
 * habilitada". A sessão era criada; o retorno é que se perdia.
 *
 * A VALIDAÇÃO NÃO É OPCIONAL. Aceitar `next` cru é uma vulnerabilidade de OPEN REDIRECT: um link
 * como `/auth/login?next=https://site-falso.com` levaria o usuário, JÁ AUTENTICADO, para um site
 * de terceiro logo depois de ele digitar a senha — a tela em que ele mais confia no remetente.
 * É vetor clássico de phishing, e o prejuízo é a credencial recém-digitada.
 *
 * A regra é ALLOWLIST DE FORMA, não lista de sites proibidos:
 *   - tem de começar com `/` (caminho interno);
 *   - NÃO pode começar com `//` nem `/\` — o navegador trata `//evil.com` como protocol-relative,
 *     ou seja, host externo disfarçado de caminho;
 *   - não pode conter esquema (`http:`, `javascript:`) nem quebra de linha.
 *
 * Qualquer coisa fora disso cai no destino padrão. Recusar é seguro; adivinhar não é.
 */

/** Para onde ir quando não há destino válido. */
export const DESTINO_PADRAO = '/';

export function caminhoInternoSeguro(bruto: string | null | undefined): string {
  if (!bruto) return DESTINO_PADRAO;

  const valor = bruto.trim();

  // Tem de ser caminho absoluto interno.
  if (!valor.startsWith('/')) return DESTINO_PADRAO;

  // `//host` e `/\host` são interpretados pelo navegador como HOST externo, não como caminho.
  if (valor.startsWith('//') || valor.startsWith('/\\')) return DESTINO_PADRAO;

  // Esquema embutido (`/redirect?to=javascript:...`) e controle de linha.
  if (/[\x00-\x1f\x7f]/.test(valor)) return DESTINO_PADRAO;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(valor)) return DESTINO_PADRAO;

  /* DEFESA EM PROFUNDIDADE: esquema EXECUTÁVEL em qualquer posição da URL, inclusive dentro do
   * valor de uma query.
   *
   * Tecnicamente, `/redirect?to=javascript:alert(1)` é um caminho interno seguro — o navegador lê
   * a URL como `https://site/redirect?to=...`, e o `javascript:` ali é só texto de parâmetro. Não
   * executa nada. Bloquear é conservador.
   *
   * Mas o custo de bloquear é zero (nenhum destino legítimo de pós-login carrega `javascript:` ou
   * `data:` numa query) e o custo de errar a análise uma vez é execução de script no contexto do
   * site. Quando o benefício é hipotético e o prejuízo é uma vulnerabilidade, a escolha é recusar.
   * Sem esta linha, um redirector interno que um dia repasse o parâmetro adiante vira o furo. */
  if (/(?:javascript|data|vbscript|file):/i.test(valor)) return DESTINO_PADRAO;

  // Backslash sozinho também é normalizado para `/` por alguns navegadores.
  if (valor.includes('\\')) return DESTINO_PADRAO;

  return valor;
}
