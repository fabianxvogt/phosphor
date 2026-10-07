import { cp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const modules = (await readdir(root)).filter((file) => file.endsWith(".mjs"));
const files = [
  "index.html",
  "output.html",
  "styles.css",
  "app.js",
  "sw.js",
  ...modules,
];
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(resolve(root,file)));
const revision = hash.digest("hex").slice(0,16);
for (const file of files) {
  await cp(resolve(root, file), resolve(dist, file));
}
const worker = await readFile(resolve(root,"sw.js"),"utf8");
await writeFile(resolve(dist,"sw.js"),worker.replace("__BUILD__",revision));
await cp(
  resolve(root, ".openai/hosting.json"),
  resolve(dist, ".openai/hosting.json"),
);
console.log(`Built static site in ${dist}`);
