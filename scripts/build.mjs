import { build } from 'vite';
import { cp, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../.build/', import.meta.url));
await build({
  root: `${root}frontend`,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://eunjae.pages.dev') },
  build: { outDir: output, emptyOutDir: true },
});
// main / (root) is the Pages publishing directory. Keep the existing CNAME intact.
await rm(`${root}assets`, { recursive: true, force: true });
for (const name of await readdir(output)) await cp(`${output}${name}`, `${root}${name}`, { recursive: true });
await writeFile(`${root}.nojekyll`, '');
await rm(output, { recursive: true, force: true });
