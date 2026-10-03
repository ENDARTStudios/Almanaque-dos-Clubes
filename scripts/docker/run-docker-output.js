const { spawn } = require('child_process');
const fs = require('fs');

// Executar comando Docker
const proc = spawn('docker', ['exec', 'almanaque-postgres', 'cat', '/var/lib/postgresql/data/pg_hba.conf'], {
  shell: true
});

let output = '';
proc.stdout.on('data', (data) => {
  output += data.toString();
});

proc.stderr.on('data', (data) => {
  output += 'ERR: ' + data.toString();
});

proc.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Output:', output || '(vazio)');
  
  // Salvar em arquivo
  fs.writeFileSync('docker-output.txt', output);
  console.log('\nSalvo em docker-output.txt');
});