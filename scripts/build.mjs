import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'core.mjs']) {
  await cp(resolve(root, file), resolve(dist, file));
}
await cp(resolve(root, '.openai/hosting.json'), resolve(dist, '.openai/hosting.json'));
console.log(`Built static site in ${dist}`);
