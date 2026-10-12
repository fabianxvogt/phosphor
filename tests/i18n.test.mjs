import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { parsers } from "prettier/plugins/babel";
import {
  dictionaries,
  resolveLocale,
  translate,
  lookName,
  variantName,
} from "../i18n/index.mjs";
import scenes from "../scenes.mjs";
import { catalogLooks } from "../catalog.mjs";
import { effectDefinitions, GLOBAL_EFFECTS } from "../rhythm.mjs";
import { PALETTES } from "../palettes.mjs";
import { VISUAL_STYLES } from "../family-catalog.mjs";

const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
test("locale follows ordered browser preferences and regional variants", () => {
  for (const [languages, expected] of [
    [["de-DE", "en"], "de"],
    [["en-GB", "de"], "en"],
    [["de-AT"], "de"],
    [["de-CH"], "de"],
    [["EN-us"], "en"],
    [["fr-FR", "de-DE", "en"], "de"],
    [["fr-FR"], "en"],
    [[], "en"],
  ])
    assert.equal(resolveLocale(languages), expected);
});

test("dictionaries have identical keys and preserve every interpolation", () => {
  const { en, de } = dictionaries;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  for (const [key, value] of Object.entries(en)) {
    assert.equal(typeof value, "string", key);
    assert.ok(value.trim(), key);
    assert.ok(de[key]?.trim(), key);
    assert.deepEqual(placeholders(de[key]), placeholders(value), key);
  }
  assert.equal(
    translate("Imported “{value1}”.", { value1: "$& <me> {value1}" }, "de"),
    "„$& <me> {value1}“ importiert.",
  );
  assert.equal(translate("unknown-key", {}, "de"), "unknown-key");
  assert.equal(translate("Cancel", {}, "fr"), "Cancel");
});

test("every family, built-in look, parameter, palette and rhythm effect has copy", () => {
  const texts = [
    ...catalogLooks(scenes).flatMap((look) => [
      look.name,
      look.family,
      look.sourceFamily,
      /^Rule |^Cyclic · /.test(look.variant) ? null : look.variant,
      look.algorithm,
      look.description,
    ]),
    ...scenes.flatMap((scene) => [
      scene.name,
      ...scene.schema.map((d) => d.label),
      ...effectDefinitions(scene).flatMap((d) => [d.label, d.description]),
    ]),
    ...GLOBAL_EFFECTS.flatMap((d) => [d.label, d.description]),
    ...PALETTES.map((p) => p.name),
    ...VISUAL_STYLES.map(([, label]) => label),
  ];
  const missing = [...new Set(texts.filter(Boolean))].filter(
    (text) => !Object.hasOwn(dictionaries.en, text),
  );
  assert.deepEqual(missing, []);
  assert.equal(variantName("Rule 90 · Cascade", "de"), "Regel 90 · Kaskade");
  assert.equal(
    variantName("Cyclic · Griffeath CCA", "de"),
    "Zyklisch · Griffeath CCA",
  );
});

test("translation never changes names of own looks or edited drafts", () => {
  const name = "New show";
  assert.equal(lookName({ id: "own-a", name }), name);
  assert.equal(lookName({ look: "own-a", name }), name);
  assert.equal(lookName({ id: "acid:0", name, nameEdited: true }), name);
});

test("all literal translation calls and HTML markers reference a dictionary entry", async () => {
  const root = new URL("../", import.meta.url);
  const missing = [];
  const visit = (node, file) => {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      node.callee?.name === "tr" &&
      node.arguments[0]?.type === "StringLiteral"
    ) {
      const key = node.arguments[0].value;
      if (!Object.hasOwn(dictionaries.en, key)) missing.push(`${file}: ${key}`);
    }
    for (const [key, value] of Object.entries(node))
      if (!["loc", "tokens", "comments", "extra"].includes(key)) {
        if (Array.isArray(value)) value.forEach((child) => visit(child, file));
        else if (value && typeof value === "object") visit(value, file);
      }
  };
  for (const file of await readdir(root)) {
    if (!/\.(mjs|html)$/.test(file)) continue;
    const source = await readFile(new URL(file, root), "utf8");
    if (file.endsWith(".mjs")) visit(parsers.babel.parse(source), file);
    for (const match of source.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) {
      const key = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      if (!Object.hasOwn(dictionaries.en, key)) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});
