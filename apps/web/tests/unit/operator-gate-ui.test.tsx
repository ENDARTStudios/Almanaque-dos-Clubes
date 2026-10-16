// @vitest-environment jsdom
/**
 * T571 — a TELA DE LOGIN do admin, com as strings RESOLVIDAS.
 *
 * O defeito que estes testes travam: eu havia posto as chaves em `admin.*` no dicionário central e
 * o componente pedia `t('pages.admin.*')` — caminho que NÃO EXISTE. O `t()` devolve a PRÓPRIA CHAVE
 * quando não encontra, então a tela mostrava literalmente "pages.admin.title" no lugar de
 * "Administração". O Operador viu isso na tela, não em teste.
 *
 * Por que nenhum portão pegou: `t()` aceita `string` e devolve `string`. O typecheck valida o TIPO,
 * não a EXISTÊNCIA da chave. Um `t()` tipado por união de chaves pegaria — mas isso é mudança de
 * arquitetura de i18n, não deste PR.
 *
 * A asserção (a) é a que importa: nenhuma string visível pode PARECER uma chave.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

vi.mock('@/i18n/Provider', () => ({
  useI18n: () => ({ locale: 'pt-br' as const }),
}));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get } }));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ status: authStatus }),
}));
let authStatus: 'loading' | 'authed' | 'anon' = 'anon';

import OperatorGate from '@/components/OperatorGate';

async function montar() {
  render(
    <OperatorGate>
      <p data-testid="conteudo">conteúdo protegido</p>
    </OperatorGate>,
  );
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

/** Qualquer coisa com cara de chave de i18n não resolvida. */
function pareceChave(texto: string): boolean {
  return /\b(pages|components|admin|nav|common)\.[a-zA-Z]+(\.[a-zA-Z]+)*\b/.test(texto);
}

beforeEach(() => {
  authStatus = 'anon';
  get.mockReset();
  get.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe('OperatorGate — a tela de login do admin', () => {
  it('(a) NENHUMA string visível é uma chave não resolvida', async () => {
    await montar();
    const texto = document.body.textContent ?? '';
    // O defeito exato: a tela exibia "pages.admin.title".
    expect(texto).not.toContain('pages.admin');
    expect(pareceChave(texto), `texto com cara de chave: "${texto.slice(0, 120)}"`).toBe(false);
  });

  it('(b) mostra o título e o motivo em português, e leva ao login', async () => {
    await montar();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'Entrar na administração',
    );
    const link = screen.getByTestId('operator-login-link');
    expect(link.getAttribute('href')).toContain('/auth/login');
    // `next` preserva o destino: sem ele o Operador entra e cai na home.
    expect(link.getAttribute('href')).toContain('next=');
    expect(link.textContent).toContain('Entrar');
  });

  it('(c) anônimo NÃO vê o conteúdo protegido', async () => {
    await montar();
    expect(screen.queryByTestId('conteudo')).toBeNull();
  });

  it('(d) autenticado e autorizado vê o conteúdo', async () => {
    authStatus = 'authed';
    get.mockResolvedValue({ data: [] }); // /admin/users responde 200
    await montar();
    expect(screen.getByTestId('conteudo')).toBeTruthy();
  });

  it('(e) autenticado mas RECUSADO (403) declara a recusa, sem revelar quem pode', async () => {
    authStatus = 'authed';
    get.mockImplementation(async () => {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    });
    await montar();
    expect(screen.queryByTestId('conteudo')).toBeNull();
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('não tem acesso');
    // Entregar o e-mail do operador daria o alvo exato a quem tentou.
    expect(texto.toLowerCase()).not.toContain('endart');
  });

  it('(f) falha de REDE (não 403) NÃO é lida como falta de permissão', async () => {
    authStatus = 'authed';
    get.mockImplementation(async () => {
      throw Object.assign(new Error('rede'), { status: 503 });
    });
    await montar();
    const texto = document.body.textContent ?? '';
    /* Dizer "sua conta não tem acesso" quando o servidor está fora é afirmação falsa sobre o
       usuário — ele vai procurar um problema de permissão que não existe. */
    expect(texto).not.toContain('não tem acesso');
    expect(texto).toContain('Não foi possível confirmar');
  });

  it('(g) 401 leva ao login, em vez de dizer que falta permissão', async () => {
    authStatus = 'authed';
    get.mockImplementation(async () => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    });
    await montar();
    expect(screen.getByTestId('operator-login-link')).toBeTruthy();
  });
});
