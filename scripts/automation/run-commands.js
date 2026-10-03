const { spawnSync } = require('child_process');
const fs = require('fs');

const result = spawnSync('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'], {
  shell: true,
  encoding: 'utf8'
});

console.log('=== Resultado do docker exec ===');
console.log('Status:', result.status);
console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);