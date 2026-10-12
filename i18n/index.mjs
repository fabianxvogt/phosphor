import en from "./en.mjs";
import de from "./de.mjs";

export const dictionaries = { en, de };

// Honour the browser's ordered language preferences, including regional tags.
export function resolveLocale(languages = []) {
  for (const language of languages) {
    const base = String(language).toLowerCase().split(/[-_]/)[0];
    if (Object.hasOwn(dictionaries, base)) return base;
  }
  return "en";
}

export const locale = resolveLocale(
  typeof window === "undefined"
    ? ["en"]
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language],
);

export function translate(key, values = {}, language = locale) {
  const table = Object.hasOwn(dictionaries, language)
    ? dictionaries[language]
    : en;
  const message = Object.hasOwn(table, key)
    ? table[key]
    : Object.hasOwn(en, key)
      ? en[key]
      : (key ?? "");
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}
export const tr = translate;

// Only declared copy is translated. Never inspect or rewrite user content.
export function translateDocument(root = document) {
  if (root.documentElement) root.documentElement.lang = locale;
  for (const attr of [
    "text",
    "title",
    "aria-label",
    "aria-description",
    "placeholder",
    "alt",
    "content",
  ]) {
    const marker = attr === "text" ? "data-i18n" : `data-i18n-${attr}`;
    const nodes = [...root.querySelectorAll(`[${marker}]`)];
    if (root.matches?.(`[${marker}]`)) nodes.unshift(root);
    for (const node of nodes) {
      const value = tr(node.getAttribute(marker));
      if (attr === "text") node.textContent = value;
      else node.setAttribute(attr, value);
    }
  }
}

const numberFormats = new Map();
export function formatNumber(
  value,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0,
) {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  if (!numberFormats.has(key))
    numberFormats.set(
      key,
      new Intl.NumberFormat(locale, {
        maximumFractionDigits,
        minimumFractionDigits,
      }),
    );
  return numberFormats.get(key).format(value);
}

export const beatCount = (value) =>
  tr(value === 1 ? "{value1} beat" : "{value1} beats", {
    value1: formatNumber(value),
  });

// Canonical names and IDs stay in set data; only built-in names are translated.
export function lookName(look) {
  return look?.own ||
    look?.nameEdited ||
    String(look?.id ?? look?.look ?? "").startsWith("own-")
    ? look.name
    : tr(look?.name);
}

// Browser exceptions are supplied by the platform rather than our dictionaries.
// Translate common actionable failures; preserve technical diagnostics otherwise.
export function errorText(error) {
  const key = {
    NotAllowedError: "error.permission",
    PermissionDeniedError: "error.permission",
    NotFoundError: "error.device",
    NotReadableError: "error.busy",
    QuotaExceededError: "error.storage",
    SyntaxError: "error.json",
  }[error?.name];
  return key ? tr(key) : (error?.message ?? String(error));
}

// Variants with a numeric rule are composed from canonical catalog metadata.
export function variantName(value, language = locale) {
  const rule = /^Rule (\d+) · (.+)$/.exec(value ?? "");
  if (rule)
    return translate(
      "Rule {rule} · {variant}",
      {
        rule: rule[1],
        variant: translate(rule[2], {}, language),
      },
      language,
    );
  const cyclic = /^Cyclic · (.+)$/.exec(value ?? "");
  if (cyclic)
    return translate("Cyclic · {variant}", { variant: cyclic[1] }, language);
  return translate(value, {}, language);
}
