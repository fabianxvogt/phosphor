import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const dist=resolve(root,'dist');
const visited=new Set();
async function verify(file){
  if(visited.has(file))return;
  visited.add(file);
  const sourcePath=resolve(root,file),distPath=resolve(dist,file);
  if(relative(dist,distPath).startsWith('..'))throw new Error(`Unsafe import: ${file}`);
  const [source,copy]=await Promise.all([readFile(sourcePath),readFile(distPath)]);
  if(!source.equals(copy))throw new Error(`Distribution differs: ${file}`);
  const imports=[...source.toString().matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map(m=>m[1]);
  for(const path of imports)await verify(relative(root,resolve(sourcePath,'..',path)));
}
for(const file of ['app.js','output.mjs','index.html','output.html','styles.css'])await verify(file);
const worker=await readFile(resolve(dist,'sw.js'),'utf8');
if(worker.includes('__BUILD__'))throw new Error('Offline cache revision not stamped');
for(const path of [...worker.matchAll(/['"]\.\/([^'"]+)['"]/g)].map(m=>m[1]))await readFile(resolve(dist,path));
console.log(`Verified ${visited.size} distribution assets and revisioned offline cache.`);
