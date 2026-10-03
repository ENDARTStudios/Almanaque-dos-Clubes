import { exec } from 'child_process';
import { writeFile } from 'fs/promises';

const commands = [
  'docker ps',
  'docker exec almanaque-postgres cat /var/lib/postgresql/data/pg_hba.conf',
  'docker exec almanaque-postgres psql -U almanaque -d almanaque -c "\\dt"'
];

let output = '';

for (const cmd of commands) {
  await new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      output += `\n=== ${cmd} ===\n`;
      output += stdout;
      if (stderr) output += '\nSTDERR: ' + stderr;
      if (err) output += '\nERROR: ' + err.message;
      resolve();
    });
  });
}

await writeFile('exec-output.txt', output);
console.log(output);
console.log('Copiado para exec-output.txt');