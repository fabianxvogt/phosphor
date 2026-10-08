import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { walkAssets } from "./build.mjs";

export async function verifyDistribution(root, dist = resolve(root, "dist")) {
  const files = await walkAssets(root);
  const worker = await readFile(resolve(dist, "sw.js"), "utf8");
  if (worker.includes("__BUILD__") || worker.includes("__ASSETS__")) {
    throw new Error("Offline cache revision/assets not stamped");
  }
  const list = worker.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/);
  if (!list) throw new Error("Offline cache asset list missing");
  const assets = new Set(JSON.parse(list[1]));
  for (const file of files) {
    if (!assets.has(`./${file}`)) throw new Error(`Reachable asset not precached: ${file}`);
    const [source, copy] = await Promise.all([
      readFile(resolve(root, file)),
      readFile(resolve(dist, file)),
    ]);
    if (!source.equals(copy)) throw new Error(`Distribution differs: ${file}`);
  }
  for (const asset of assets) {
    if (asset !== "./" && (!asset.startsWith("./") || asset.includes(".."))) throw new Error(`Unsafe precache asset: ${asset}`);
    await readFile(resolve(dist, asset === "./" ? "index.html" : asset.slice(2)));
  }
  return files.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await verifyDistribution(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  console.log(`Verified ${count} reachable distribution assets and revisioned offline cache.`);
}
