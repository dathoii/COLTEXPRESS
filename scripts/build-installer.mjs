import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

// 1. Ensure production client & self-contained server bundles are fresh
run('npm run build');

// 2. Build Windows NSIS installer via electron-builder (no npm/Node required by end user)
const ebCmd = resolve(root, 'node_modules/.bin/electron-builder.cmd');
run(`"${ebCmd}" --win nsis --x64 --config electron-builder.yml`);

// 3. Copy final installer into release/ColtExpressOnline-Setup.exe
const srcExe = resolve(root, 'dist-installer/ColtExpressOnline-Setup.exe');
const destExe = resolve(root, 'release/ColtExpressOnline-Setup.exe');
if (!existsSync(srcExe)) {
  throw new Error(`Expected NSIS installer not found at ${srcExe}`);
}
mkdirSync(dirname(destExe), { recursive: true });
copyFileSync(srcExe, destExe);
const mb = (statSync(destExe).size / (1024 * 1024)).toFixed(2);
console.log(`Windows Installer ready: ${destExe} (${mb} MB)`);
