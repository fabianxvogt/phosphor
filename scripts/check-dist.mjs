import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = resolve(root, 'dist');
const appPath = resolve(dist, 'app.js');
const appSource = await readFile(appPath, 'utf8');
const relativeImports = [...appSource.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1]);

if (relativeImports.length === 0) throw new Error('dist/app.js has no local module imports to verify');

for (const importPath of relativeImports) {
  const sourcePath = resolve(root, importPath);
  const distPath = resolve(dist, importPath);
  if (!relative(dist, distPath) || relative(dist, distPath).startsWith('..')) throw new Error(`Unsafe dist import path: ${importPath}`);
  const [sourceBytes, distBytes] = await Promise.all([readFile(sourcePath), readFile(distPath)]);
  if (!sourceBytes.equals(distBytes)) throw new Error(`dist copy differs from source: ${importPath}`);
}

console.log(`Verified dist/app.js local imports: ${relativeImports.join(', ')}`);
