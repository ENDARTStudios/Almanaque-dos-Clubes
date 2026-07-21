import { exec } from 'child_process';
import { writeFileSync, appendFileSync } from 'fs';

function runCmd(cmd, callback) {
  exec(cmd, (err, stdout, stderr) => {
    callback(stdout || stderr, err);
  });
}

// Executar comando e salvar
runCmd('docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf', (output) => {
  console.log('pg_hba.conf:', output);
  writeFileSync('STEP1-pg_hba.conf.txt', output);
});

runCmd('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\dt"', (output) => {
  console.log('Tabelas:', output);
  writeFileSync('STEP6-tables.txt', output);
});

// Alterar para md5
runCmd('docker exec almanaque-postgres sed -i "s/scram-sha-256/md5/" /var/lib/postgresql/data/pg_hba.conf', () => {
  console.log('Alterado para md5');
});

// Recarregar
runCmd('docker exec almanaque-postgres psql -U almanaque -d almanaque -c "SELECT pg_reload_conf();"', (output) => {
  console.log('Recarregado:', output);
});

console.log('Aguarde a conclusão...');