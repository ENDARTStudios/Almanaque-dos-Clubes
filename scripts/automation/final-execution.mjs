import { spawnSync } from 'child_process';

// Executar todos os comandos
const commands = [
  'docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf',
  'docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"',
  'docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf',
  'docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\dt"'
];

for (const cmd of commands) {
  console.log(`\nExecutando: ${cmd}`);
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8', stdio: 'pipe' });
  console.log('stdout:', result.stdout || '(vazio)');
  console.log('stderr:', result.stderr || '(vazio)');
  console.log('exit code:', result.status);
}