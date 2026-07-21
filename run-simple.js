const { execFileSync } = require('child_process');
const fs = require('fs');

try {
  // Executar docker ps
  const ps = execFileSync('docker', ['ps'], { encoding: 'utf8', stdio: 'pipe' });
  fs.writeFileSync('docker-ps.txt', ps);
  console.log('docker ps executado. Resultado salvo em docker-ps.txt');
} catch (e) {
  fs.writeFileSync('docker-ps-err.txt', e.message);
  console.log('Erro salvo em docker-ps-err.txt:', e.message);
}