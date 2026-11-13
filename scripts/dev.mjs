import { spawn } from 'node:child_process';

const procs = [
  spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', shell: true }),
  spawn('npm', ['run', 'dev:client'], { stdio: 'inherit', shell: true }),
];

process.on('SIGINT', () => {
  for (const p of procs) p.kill();
  process.exit(0);
});
