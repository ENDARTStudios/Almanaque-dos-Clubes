import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

// Testar Docker
console.log('Testando Docker...');

const result = spawnSync('docker', ['--version'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('Versão do Docker:', result.stdout || result.stderr);
console.log('Exit code:', result.status);

// Testar docker ps
const ps = spawnSync('docker', ['ps'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('Docker ps stdout:', ps.stdout);
console.log('Docker ps stderr:', ps.stderr);
console.log('Docker ps exit code:', ps.status);

// Testar docker-compose
const dc = spawnSync('docker-compose', ['ps'], { shell: true, encoding: 'utf8', stdio: 'pipe' });
console.log('Docker-compose ps stdout:', dc.stdout);
console.log('Docker-compose ps stderr:', dc.stderr);
console.log('Docker-compose ps exit code:', dc.status);

writeFileSync('docker-test-result.txt', `Docker version: ${result.stdout || result.stderr}\nDocker ps: ${ps.stdout || ps.stderr}\nDocker-compose: ${dc.stdout || dc.stderr}`);