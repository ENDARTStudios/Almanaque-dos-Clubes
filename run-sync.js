const { spawnSync } = require('child_process');
const fs = require('fs');

// Executar docker ps
const result = spawnSync('docker', ['ps'], { encoding: 'utf8' });

console.log('Status:', result.status);
console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);

fs.writeFileSync('sync-output.txt', `Status: ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
console.log('Salvo em sync-output.txt');