const { spawnSync } = require('child_process');
const fs = require('fs');

const cwd = 'd:\\PROJETOS\\Almanaque dos Clubes\\Almanaque dos Clubes';
const log = [];

function runCmd(label, cmd, args) {
  log.push(`\n${label}`);
  log.push('='.repeat(50));
  const result = spawnSync(cmd, args, { encoding: 'utf8', cwd, shell: true });
  log.push(`Status: ${result.status}`);
  if (result.stdout) log.push(`STDOUT:\n${result.stdout}`);
  if (result.stderr) log.push(`STDERR:\n${result.stderr}`);
  return result;
}

// 1. Alterar método de autenticação
runCmd('PASSO 1: Alterando método de autenticação', 'docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf']);

// 2. Recarregar configuração
runCmd('PASSO 2: Recarregando configuração', 'docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();']);

// 3. Verificar pg_hba.conf
runCmd('PASSO 3: Conteúdo pg_hba.conf', 'docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf']);

// 4. Listar tabelas
runCmd('PASSO 6: Listando tabelas', 'docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt']);

// Salvar log
fs.writeFileSync('full-diagnostic-log.txt', log.join('\n'));
console.log('Log salvo em full-diagnostic-log.txt');
console.log(log.join('\n'));