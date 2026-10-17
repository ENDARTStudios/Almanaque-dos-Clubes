/**
 * Teste do pré-voo de diff (`scripts/preflight.mjs`).
 *
 * POR QUE ESTE TESTE EXISTE
 *   A peça com mais chance de errar é `classificar`: ela decide se uma falha de portão é CÓDIGO
 *   (vermelho, pare) ou AMBIENTE (não medido, o CI mede). Errar para um lado esconde defeito real;
 *   para o outro, inventa vermelho e ensina a ignorar vermelho. As duas são ruins, e
 *   nenhuma das duas aparece rodando o script à mão uma vez.
 *
 * O que NÃO está coberto aqui, e por quê: a execução de verdade dos portões (depende de git, pnpm
 * e do estado do diretório) e a saída formatada. Este arquivo testa a LÓGICA, que é a parte que
 * não pode mentir.
 *
 * Roda com `node --test scripts/preflight.test.mjs`. Sem framework novo.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { classificar, pacoteDe, naoCoberto } from './preflight.mjs';

describe('classificar — código ou ambiente?', () => {
  test('o erro real que apareceu nesta máquina é classificado como AMBIENTE', () => {
    /* Este texto não é inventado: foi a saída literal de `api:test` na máquina do Operador,
       quando o Postgres local recusou a credencial. Foi assim que a ferramenta aprendeu a
       distinguir — e é o caso que não pode voltar a ser reportado como "portão vermelho". */
    const saida =
      'Authentication failed against database server, the provided database credentials for ' +
      '`almanaque` are not valid.';
    const r = classificar(saida);
    assert.equal(r.ambiente, true);
    assert.match(r.motivo, /Postgres/);
    // A evidência tem de vir junto: sem ela, a classificação não é auditável.
    assert.match(r.evidencia, /Authentication failed/);
  });

  test('banco fora do ar é ambiente', () => {
    assert.equal(classificar("Can't reach database server at `localhost:5432`").ambiente, true);
    assert.equal(classificar('connect ECONNREFUSED 127.0.0.1:5432').ambiente, true);
  });

  test('ERRO DE TIPO é CÓDIGO — não pode ser classificado como ambiente', () => {
    const r = classificar(
      "src/components/X.tsx(24,7): error TS2322: Type 'string' is not assignable",
    );
    assert.equal(r.ambiente, false);
  });

  test('TESTE QUE FALHOU POR ASSERTIVA é CÓDIGO', () => {
    const saida = [
      'FAIL tests/unit/x.test.ts > a regra',
      'AssertionError: expected 200 to be 404',
      '  expected: 404',
      '  received: 200',
    ].join('\n');
    assert.equal(classificar(saida).ambiente, false);
  });

  test('lint com erro é CÓDIGO', () => {
    assert.equal(classificar('✖ 3 problems (3 errors, 0 warnings)').ambiente, false);
  });

  test('saída vazia não inventa classificação', () => {
    assert.deepEqual(classificar(''), { ambiente: false });
  });

  test('falha que menciona o banco no MEIO do log e também um TS é AMBIENTE (documentado)', () => {
    /* Limite conhecido e declarado no próprio script: ele olha a assinatura, não a semântica.
       Se as duas coisas aparecem, a primeira assinatura vence. O teste fixa esse comportamento
       para a decisão ser explícita em vez de acidental. */
    const saida = 'error TS2322: falhou\nAuthentication failed against database server';
    assert.equal(classificar(saida).ambiente, true);
  });
});

describe('pacoteDe — a qual pacote pertence um caminho', () => {
  test('arquivos de cada pacote', () => {
    assert.equal(pacoteDe('apps/web/src/app/page.tsx'), 'web');
    assert.equal(pacoteDe('apps/api/src/modules/clubs/routes.ts'), 'api');
    assert.equal(pacoteDe('apps/worker/src/index.ts'), 'worker');
    assert.equal(pacoteDe('packages/domain/src/index.ts'), 'domain');
  });

  test('o diretório do pacote em si (sem arquivo depois)', () => {
    assert.equal(pacoteDe('apps/web'), 'web');
  });

  test('fora de pacote é null — e isso acende todos', () => {
    assert.equal(pacoteDe('package.json'), null);
    assert.equal(pacoteDe('turbo.json'), null);
    assert.equal(pacoteDe('plugins/almanaque-design/tools/audit-motion.mjs'), null);
  });

  test('não confunde prefixo: apps/webx NÃO é apps/web', () => {
    assert.equal(pacoteDe('apps/webx/foo.ts'), null);
  });

  test('apps/worker não é lido como apps/web', () => {
    assert.equal(pacoteDe('apps/worker/src/a.ts'), 'worker');
  });
});

describe('naoCoberto — o que os portões NÃO veem', () => {
  const nomes = (arqs) =>
    naoCoberto(arqs.map((caminho) => ({ caminho, marca: 'M' }))).map((a) => a.o);

  test('tela em apps/web acende o aviso de renderização', () => {
    assert.ok(nomes(['apps/web/src/app/clubs/page.tsx']).includes('Tela renderizada'));
  });

  test('dicionário de i18n acende o aviso de chave — o caso do "pages.admin.title"', () => {
    assert.ok(nomes(['apps/web/src/i18n/dictionaries/pt-br.ts']).includes('Chave de i18n'));
  });

  test('rota de API sem teste acende o aviso de rota', () => {
    assert.ok(
      nomes(['apps/api/src/modules/competitions/routes.ts']).includes('Rota de API sem teste novo'),
    );
  });

  test('rota de API COM teste não acende', () => {
    const avisos = nomes([
      'apps/api/src/modules/competitions/routes.ts',
      'apps/api/tests/integration/competitions.test.ts',
    ]);
    assert.ok(!avisos.includes('Rota de API sem teste novo'));
  });

  test('arquivo de autenticação acende o aviso de segurança', () => {
    assert.ok(
      nomes(['apps/web/src/components/OperatorGate.tsx']).includes('Superfície de segurança'),
    );
  });

  test('CSS acende o aviso de token de tema', () => {
    assert.ok(nomes(['apps/web/src/app/globals.css']).includes('Token de tema'));
  });

  test('migração acende o aviso de schema', () => {
    assert.ok(
      nomes(['apps/api/prisma/migrations/20260101_x/migration.sql']).includes('Schema ou migração'),
    );
  });

  test('arquivo irrelevante não acende nada', () => {
    assert.deepEqual(nomes(['README.md']), []);
  });

  test('todo aviso tem explicação e próximo passo — não é só um emoji', () => {
    const avisos = naoCoberto(
      ['apps/web/src/app/x/page.tsx', 'apps/web/src/app/globals.css'].map((caminho) => ({
        caminho,
        marca: 'M',
      })),
    );
    assert.ok(avisos.length >= 2);
    for (const a of avisos) {
      assert.ok(a.o && a.o.length > 0, 'aviso sem título');
      assert.ok(a.porque.length > 40, `aviso "${a.o}" sem explicação útil`);
      assert.ok(a.como.length > 5, `aviso "${a.o}" sem próximo passo`);
    }
  });
});
