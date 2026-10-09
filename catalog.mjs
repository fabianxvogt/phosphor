// Look catalog (D65): every authored look of every family, rated 0–10 in
// half steps. Pure and data-driven from scenes.mjs, so it grows with the
// families. Ratings live in the set (`ratings`, keyed by look id); 0 means
// "never play", no entry means unrated (weighted like a 5).
import { presetSnapshot } from "./session.mjs";
import { PALETTES } from "./palettes.mjs";
import { clipFrom } from "./show-set.mjs";

export const UNRATED_WEIGHT = 5;
export const MAX_RATING = 10;

export const lookId = (snapshot) => `${snapshot.scene}:${snapshot.preset}`;

export function validRating(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_RATING &&
    Number.isInteger(value * 2)
  );
}

// A valid rating, or null when the look is unrated.
export function ratingOf(ratings, id) {
  if (!ratings || !Object.hasOwn(ratings, id)) return null;
  return validRating(ratings[id]) ? ratings[id] : null;
}

// The human label of a look's structural type, from the type parameter's
// schema label ("Form · bars / tunnel / grid / shards" → "tunnel"). Labels
// without a list fall back to their head and the value ("Composition 2").
export function variantLabel(scene, params) {
  const key = scene.type?.key;
  const field = key && scene.schema.find((f) => f.key === key);
  if (!field) return null;
  const value = params[key];
  const label = String(field.label ?? key);
  const head = label.split(/\s*[·:]\s*/)[0].trim() || key;
  const count = Math.round(field.max - field.min) + 1;
  const lists = [];
  const tail = label.match(/[·:]\s*(.*)$/)?.[1];
  if (tail?.includes("/")) lists.push(tail.split("/").map((s) => s.trim()));
  if (label.includes("·") && !label.includes("/"))
    lists.push(label.split("·").map((s) => s.trim()));
  for (const names of lists) {
    let i = -1;
    if (names.length === count) i = Math.round(value - field.min);
    else if (names.length === scene.type.values.length)
      i = scene.type.values.indexOf(value);
    if (names[i]) return names[i];
  }
  return `${head} ${Number.isFinite(value) ? +value.toFixed(2) : value}`;
}

export function catalogLooks(scenes) {
  return scenes.flatMap((scene, s) =>
    scene.presets.map((preset, index) => {
      const snapshot = presetSnapshot(scene, index);
      return {
        id: lookId(snapshot),
        sceneId: scene.id,
        family: scene.name,
        number: scene.number ?? s + 1,
        index,
        name: preset.name,
        variant: variantLabel(scene, snapshot.params),
        snapshot,
      };
    }),
  );
}

// Rated looks (best first), then unrated, then looks rated 0; ties keep
// family number and preset order. Returns a new array.
export function sortCatalog(looks, ratings) {
  const group = (r) => (r === null ? 1 : r > 0 ? 0 : 2);
  return looks
    .map((look) => ({ look, rating: ratingOf(ratings, look.id) }))
    .sort(
      (a, b) =>
        group(a.rating) - group(b.rating) ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        a.look.number - b.look.number ||
        a.look.index - b.look.index,
    )
    .map((entry) => entry.look);
}

// One item with probability proportional to weightOf(item); items weighing
// 0 are never chosen. null when nothing has weight.
export function weightedChoice(items, weightOf, random) {
  let total = 0;
  for (const item of items) total += Math.max(0, weightOf(item) || 0);
  if (!(total > 0)) return null;
  let x = random() * total;
  let last = null;
  for (const item of items) {
    const weight = Math.max(0, weightOf(item) || 0);
    if (!weight) continue;
    last = item;
    if (x < weight) return item;
    x -= weight;
  }
  return last;
}

export const ratingWeight = (rating) => rating ?? UNRATED_WEIGHT;

// Weighted by rating (unrated = 5, 0 never). Looks in `exclude` (recently
// played) are skipped unless nothing else could play.
export function pickWeighted(looks, ratings, random, exclude = new Set()) {
  const weight = (look) => ratingWeight(ratingOf(ratings, look.id));
  return (
    weightedChoice(
      looks.filter((look) => !exclude.has(look.id)),
      weight,
      random,
    ) ?? weightedChoice(looks, weight, random)
  );
}

// A stable library palette per look (hash of its id), so thumbnails, Play and
// To slot agree and stay put when families are added.
export function lookPalette(look) {
  let hash = 2166136261;
  for (let i = 0; i < look.id.length; i++)
    hash = Math.imul(hash ^ look.id.charCodeAt(i), 16777619);
  return PALETTES[(hash >>> 0) % PALETTES.length].id;
}

// An unsaved clip for a look (page/slot −1 when played).
export function catalogClip(look, { id = look.id, palette } = {}) {
  return clipFrom(look.snapshot, {
    id,
    name: look.name,
    palette: palette ?? lookPalette(look),
  });
}
