/**
 * Teste da auditoria de instruções de agente (`scripts/agents-audit.mjs`).
 *
 * POR QUE ESTE TESTE EXISTE
 *   A ferramenta nasceu de um achado real: a skill `release-loop` mandava `git commit --no-verify`
 *   por causa de um bug que já havia sido corrigido — e era obedecida. Num dia, 8 commits saíram
 *   pulando a verificação por causa dela.
 *
 *   O que este arquivo trava é a fronteira mais delicada: distinguir
 *     (a) COMANDO que contorna verificação  -> tem de acusar
 *     (b) MENÇÃO histórica ao comando       -> NÃO pode acusar
 *   Se (b) acusar, o relatório vira ruído e a pessoa aprende a ignorá-lo — o fracasso que a
 *   ferramenta existe para evitar. Foi um falso positivo real: a própria explicação da correção
 *   fazia a ferramenta acusar.
 *
 * Roda com `node --test scripts/agents-audit.test.mjs`. Sem framework novo.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(repoRoot, 'scripts/agents-audit.mjs');

/**
 * Roda o auditor contra um repositório FALSO, para não depender do estado do repo real (que passa
 * hoje e passaria mesmo se a lógica quebrasse). Monta `.dsh/skills/x/SKILL.md` + `package.json`.
 */
function rodarEm(conteudoSkill, extra = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'agents-audit-'));
  try {
    mkdirSync(join(raiz, 'scripts'), { recursive: true });
    mkdirSync(join(raiz, 'plugins'), { recursive: true });
    mkdirSync(join(raiz, '.dsh/skills/teste'), { recursive: true });
    // O script é executado de dentro da raiz falsa: ele resolve o repo a partir do próprio path,
    // então copiamo-lo para lá mantém o comportamento real.
    const destino = join(raiz, 'scripts/agents-audit.mjs');
    writeFileSync(destino, readFileSync(SCRIPT));
    writeFileSync(join(raiz, '.dsh/skills/teste/SKILL.md'), conteudoSkill);
    writeFileSync(
      join(raiz, 'package.json'),
      JSON.stringify({
        scripts: { 'ui:audit:ci': 'x', 'agents:audit': 'y', ...(extra.scripts ?? {}) },
      }),
    );
    for (const [caminho, txt] of Object.entries(extra.arquivos ?? {})) {
      mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
      writeFileSync(join(raiz, caminho), txt);
    }
    try {
      const saida = execFileSync(process.execPath, [destino, '--json'], {
        cwd: raiz,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return JSON.parse(saida);
    } catch (err) {
      // Saída 1 é esperada quando há bloqueio: o JSON ainda vai em stdout.
      const saida = `${err.stdout ?? ''}`;
      if (saida.trim().startsWith('{')) return JSON.parse(saida);
      throw err;
    }
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

describe('contorno de verificação: comando acusa, menção não', () => {
  test('(a) `git commit --no-verify` como COMANDO é acusado', () => {
    const r = rodarEm('# skill\n\n```bash\ngit commit --no-verify -m "x"\n```\n');
    const ids = r.avisos.map((a) => a.regra);
    assert.ok(
      ids.includes('contorno-de-verificacao'),
      `esperava aviso, veio: ${JSON.stringify(r)}`,
    );
  });

  test('(b) MENÇÃO histórica ao comando NÃO é acusada', () => {
    /* Este é o texto que a correção real deixou na skill: explica que o comando era usado e não
       deve mais ser. Acusar isso é punir a documentação da própria correção. */
    const r = rodarEm(
      '# skill\n\nA instrução antiga era usar `git commit --no-verify`. **O bug foi corrigido.**\n' +
        '**Não use `--no-verify`**: ele pula a verificação.\n',
    );
    assert.equal(r.avisos.length, 0, `não deveria acusar: ${JSON.stringify(r.avisos)}`);
  });

  test('push forçado sem lease, como comando, é acusado', () => {
    const r = rodarEm('# skill\n\ngit push --force origin main\n');
    assert.ok(r.avisos.some((a) => a.regra === 'contorno-de-verificacao'));
  });

  test('`git push --force-with-lease` NÃO é acusado — é a prática correta', () => {
    const r = rodarEm('# skill\n\ngit push --force-with-lease origin feat/x\n');
    assert.equal(r.avisos.length, 0, `--force-with-lease é legítimo: ${JSON.stringify(r.avisos)}`);
  });
});

describe('caminhos citados', () => {
  test('caminho em backtick que não existe é bloqueio', () => {
    const r = rodarEm('# skill\n\nLeia `docs/NAO-EXISTE.md` antes.\n');
    assert.ok(r.bloqueios.some((b) => b.regra === 'caminho-inexistente'));
  });

  test('caminho que existe não é bloqueio', () => {
    const r = rodarEm('# skill\n\nLeia `docs/OK.md`.\n', {
      arquivos: { 'docs/OK.md': 'conteudo' },
    });
    assert.equal(r.bloqueios.length, 0);
  });

  test('isenção declarada com motivo não é bloqueio', () => {
    const r = rodarEm('# skill\n\nNão tente `scripts/x.ts` localmente.\n');
    assert.equal(r.bloqueios.length, 0, 'scripts/x.ts está isento com motivo no script');
  });
});

describe('scripts do package.json', () => {
  test('`pnpm script-inexistente` é bloqueio', () => {
    const r = rodarEm('# skill\n\nRode `pnpm nao-existe`.\n');
    assert.ok(r.bloqueios.some((b) => b.regra === 'script-inexistente'));
  });

  test('script real não é bloqueio', () => {
    const r = rodarEm('# skill\n\nRode `pnpm ui:audit:ci`.\n');
    assert.equal(r.bloqueios.length, 0);
  });

  test('subcomando do pnpm não é bloqueio (`pnpm info <pacote>`)', () => {
    const r = rodarEm('# skill\n\nUse `pnpm info react`.\n');
    assert.equal(r.bloqueios.length, 0, 'subcomandos estão isentos');
  });
});

describe('segredos', () => {
  test('chave AWS é bloqueio', () => {
    const r = rodarEm('# skill\n\nkey: AKIAIOSFODNN7EXAMPLE\n');
    assert.ok(r.bloqueios.some((b) => b.regra === 'segredo'));
  });

  test('token do GitHub é bloqueio', () => {
    const r = rodarEm('# skill\n\ntoken ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n');
    assert.ok(r.bloqueios.some((b) => b.regra === 'segredo'));
  });

  test('chave privada é bloqueio', () => {
    const r = rodarEm('# skill\n\n-----BEGIN RSA PRIVATE KEY-----\n');
    assert.ok(r.bloqueios.some((b) => b.regra === 'segredo'));
  });

  test('texto normal não é segredo', () => {
    const r = rodarEm('# skill\n\nO token de sessão fica em cookie httpOnly.\n');
    assert.equal(r.bloqueios.length, 0);
  });
});

describe('veredito', () => {
  test('arquivo limpo dá veredito verde', () => {
    const r = rodarEm('# skill\n\nRode `pnpm ui:audit:ci`. Leia `docs/OK.md`.\n', {
      arquivos: { 'docs/OK.md': 'x' },
    });
    assert.equal(r.veredito, 'verde');
  });

  test('bloqueio dá veredito falhou', () => {
    const r = rodarEm('# skill\n\nLeia `docs/NAO-EXISTE.md`.\n');
    assert.equal(r.veredito, 'falhou');
  });

  test('o próprio repo real passa (regressão de verdade)', () => {
    /* Roda contra o repositório de verdade: se alguém reintroduzir uma instrução falsa, este
       teste fica vermelho antes do gate. É o teste que mais importa daqui a seis meses. */
    const saida = execFileSync(process.execPath, [SCRIPT, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const r = JSON.parse(saida);
    assert.equal(r.veredito, 'verde', `repo real tem bloqueio: ${JSON.stringify(r.bloqueios)}`);
    assert.ok(r.arquivos > 40, `esperava varrer os arquivos de instrução, veio ${r.arquivos}`);
  });
});
