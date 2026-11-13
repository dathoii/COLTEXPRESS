import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'release/server');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'server/src/index.ts')],
  outfile: resolve(outDir, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['node:*', 'bufferutil', 'utf-8-validate'],
  banner: {
    js: "import { createRequire as __coltCreateRequire } from 'node:module'; const require = __coltCreateRequire(import.meta.url);",
  },
  sourcemap: true,
});

console.log('Built server bundle -> release/server/server.mjs');
