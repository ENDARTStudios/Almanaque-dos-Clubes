const { spawnSync } = require('child_process');
const fs = require('fs');

// Executar docker ps
const ps = spawnSync('docker', ['ps'], { shell: true, encoding: 'utf8' });
console.log('docker ps:', ps.stdout || ps.stderr);

// Executar pg_hba.conf
const pg = spawnSync('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'], { shell: true, encoding: 'utf8' });
console.log('pg_hba.conf:', pg.stdout || pg.stderr);

// Executar tabelas
const tb = spawnSync('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt'], { shell: true, encoding: 'utf8' });
console.log('tabelas:', tb.stdout || tb.stderr);

// Alterar para md5
const ch = spawnSync('docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf'], { shell: true, encoding: 'utf8' });
console.log('alterar:', ch.stdout || ch.stderr);

// Recarregar
const re = spawnSync('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();'], { shell: true, encoding: 'utf8' });
console.log('recarregar:', re.stdout || re.stderr);

// Salvar resultados
fs.writeFileSync('pg_hba_result.txt', pg.stdout || '');
fs.writeFileSync('tables_result.txt', tb.stdout || '');
fs.writeFileSync('docker_ps.txt', ps.stdout || '');

console.log('\nArquivos salvos!');