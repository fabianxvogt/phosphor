import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

function moduleImports(text) {
  // Tokenize strings/templates/comments as units so shader text and comments
  // cannot invent dependencies. Only literal import specifiers are reachable.
  const tokens = [...text.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[(){};*.]/g)]
    .map(match => match[0]).filter(token => !token.startsWith("//") && !token.startsWith("/*"));
  const refs = [];
  const isString = token => token?.[0] === '"' || token?.[0] === "'";
  for (let i=0;i<tokens.length;i++) {
    const token = tokens[i];
    if (token !== "import" && token !== "export") continue;
    let specifier;
    if (token === "import" && isString(tokens[i+1])) specifier = tokens[i+1];
    else if (token === "import" && tokens[i+1] === "(" && isString(tokens[i+2])) specifier = tokens[i+2];
    else if (tokens[i+1] !== "." && tokens[i+1] !== "(" && (token === "import" || tokens[i+1] === "{" || tokens[i+1] === "*")) {
      for (let j=i+1;j<tokens.length;j++) {
        if (tokens[j] === ";" || tokens[j] === "import" || tokens[j] === "export") break;
        if (tokens[j] === "from" && isString(tokens[j+1])) { specifier=tokens[j+1];break; }
      }
    }
    if (specifier) refs.push(specifier[0] === '"' ? JSON.parse(specifier) : specifier.slice(1,-1).replace(/\\'/g,"'").replace(/\\\\/g,"\\"));
  }
  return refs;
}

// The beat worklet is loaded by audioWorklet.addModule(), not an import.
export async function walkAssets(root, entries = ["index.html", "stage.html", "update.html", "beat-worklet.mjs"]) {
  const visited = new Set();
  async function visit(file) {
    const path = resolve(root, file);
    file = relative(root, path);
    if (file === ".." || file.startsWith("../")) {
      throw new Error(`Unsafe asset: ${file}`);
    }
    if (visited.has(file)) return;
    visited.add(file);
    const text = await readFile(path, "utf8");
    const refs = [];
    if (extname(file) === ".html") {
      for (const tag of text.replace(/<!--[\s\S]*?-->/g,"").matchAll(/<(?:script|link)\b[^>]*>/gi)) {
        const ref = tag[0].match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i);
        if (ref) refs.push(ref[1]);
      }
    } else if (/\.(?:mjs|js)$/.test(file)) {
      refs.push(...moduleImports(text));
    }
    for (const ref of refs) {
      if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
      const local = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
      if (!local) continue;
      await visit(relative(root, resolve(local.startsWith("/") ? root : dirname(path), local.replace(/^\//, ""))));
    }
  }
  for (const entry of entries) await visit(entry);
  return [...visited].sort();
}

export async function build(root) {
  const dist = resolve(root, "dist");
  const files = [...await walkAssets(root), "sw.js"];
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(resolve(root, file)));
  }
  const revision = hash.digest("hex").slice(0, 16);
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const file of files) {
    await mkdir(dirname(resolve(dist, file)), { recursive: true });
    await cp(resolve(root, file), resolve(dist, file));
  }
  const assets = ["./", ...files.map(file => `./${file}`)];
  const worker = await readFile(resolve(root, "sw.js"), "utf8");
  await writeFile(resolve(dist, "sw.js"), worker.replace("__BUILD__", revision).replace('["__ASSETS__"]', JSON.stringify(assets)));
  console.log(`Built ${files.length} reachable assets in ${dist} (${revision})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
}
