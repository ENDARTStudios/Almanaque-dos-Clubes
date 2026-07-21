const { execSync } = require('child_process');
const fs = require('fs');

const cwd = 'd:\\PROJETOS\\Almanaque dos Clubes\\Almanaque dos Clubes';
const log = [];

try {
  // 1. Alterar método de autenticação
  log.push('\n=== PASSO 1: Alterar método de autenticação ===');
  const r1 = execSync('docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf', { cwd, encoding: 'utf8' });
  log.push(r1.toString());
} catch (e) {
  log.push('Erro: ' + (e.message || e));
}

try {
  // 2. Recarregar configuração
  log.push('\n=== PASSO 2: Recarregar configuração ===');
  const r2 = execSync('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"', { cwd, encoding: 'utf8' });
  log.push(r2.toString());
} catch (e) {
  log.push('Erro: ' + (e.message || e));
}

try {
  // 3. pg_hba.conf
  log.push('\n=== PASSO 3: pg_hba.conf ===');
  const r3 = execSync('docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf', { cwd, encoding: 'utf8' });
  log.push(r3.toString());
} catch (e) {
  log.push('Erro: ' + (e.message || e));
}

try {
  // 4. Listar tabelas
  log.push('\n=== PASSO 6: Listar tabelas ===');
  const r4 = execSync('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\dt"', { cwd, encoding: 'utf8' });
  log.push(r4.toString());
} catch (e) {
  log.push('Erro: ' + (e.message || e));
}

console.log(log.join('\n'));

// Salvar em arquivo
fs.writeFileSync('sync-log.txt', log.join('\n'));
console.log('\nSalvo em sync-log.txt');