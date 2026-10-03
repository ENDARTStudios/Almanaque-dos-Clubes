import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

// Executar docker ps
const ps = spawnSync('docker', ['ps'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('docker ps:', ps.stdout || ps.stderr);

// Executar pg_hba.conf
const pg = spawnSync('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('pg_hba.conf:', pg.stdout || pg.stderr);

// Executar tabelas
const tb = spawnSync('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', '\\dt'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('tabelas:', tb.stdout || tb.stderr);

// Alterar para md5
const ch = spawnSync('docker', ['exec', 'almanaque-postgres', 'sed', '-i', 's/scram-sha-256/md5/', '/var/lib/postgresql/data/pg_hba.conf'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('alterar:', ch.stdout || ch.stderr);

// Recarregar
const re = spawnSync('docker', ['exec', 'almanaque-postgres', 'psql', '-U', 'almanaque', '-d', 'almanaque', '-c', 'SELECT pg_reload_conf();'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('recarregar:', re.stdout || re.stderr);

// Rerun pg_hba.conf após alteração
const pg2 = spawnSync('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('pg_hba.conf (após md5):', pg2.stdout || pg2.stderr);

// Salvar resultados
writeFileSync('STEP1-pg_hba.conf.txt', pg2.stdout || '');
writeFileSync('STEP6-tables.txt', tb.stdout || '');
writeFileSync('STEP3-after-md5.txt', pg2.stdout || '');

console.log('\nArquivos salvos!');