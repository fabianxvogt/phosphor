import test from "node:test";
import assert from "node:assert/strict";
import scenes from "../scenes.mjs";
import { catalogLooks, catalogClip, lookId } from "../catalog.mjs";
import { presetSnapshot } from "../session.mjs";
import {
  FAMILY_CATALOG,
  VISUAL_STYLES,
  familyMetadata,
  catalogFamilies,
  matchesCatalogIdentity,
} from "../family-catalog.mjs";

const looks = catalogLooks(scenes);
const sceneById = (id) => scenes.find((scene) => scene.id === id);

test("all existing renderers have explicit identity, structural variants and searchable visual styles", () => {
  const styles = new Set(VISUAL_STYLES.map(([id]) => id));
  for (const id of Object.keys(FAMILY_CATALOG)) {
    const scene = sceneById(id);
    assert.ok(scene, id);
    const identity = familyMetadata(scene);
    assert.ok(
      identity.family && identity.algorithm && identity.description,
      id,
    );
    assert.ok(identity.styles.length > 0, id);
    assert.ok(
      identity.styles.every((style) => styles.has(style)),
      id,
    );
    for (const look of looks.filter((look) => look.sceneId === id)) {
      assert.ok(look.variant, look.id);
      assert.ok(
        !/^(Architecture|Group|Seed composition|Planting density) \d/.test(
          look.variant,
        ),
        look.id,
      );
      assert.ok(
        look.styles.every((style) => styles.has(style)),
        look.id,
      );
    }
  }
});

test("Gray–Scott renderers share a catalog family without rewriting saved identity", () => {
  const chemistry = looks.filter((look) =>
    ["acid", "evolution"].includes(look.sceneId),
  );
  assert.equal(new Set(chemistry.map((look) => look.familyId)).size, 1);
  assert.equal(new Set(chemistry.map((look) => look.family)).size, 1);
  assert.deepEqual(
    new Set(chemistry.map((look) => look.variant)),
    new Set(["Acid Mycelium", "Garden Relief"]),
  );
  const grouped = catalogFamilies(looks, scenes);
  assert.equal(grouped.length, scenes.length - 1);
  const family = grouped.find((entry) => entry.id === "reaction-diffusion");
  assert.deepEqual(family.sceneIds, ["acid", "evolution"]);
  assert.equal(family.count, chemistry.length);
  for (const look of chemistry) {
    assert.equal(look.id, lookId(look.snapshot));
    assert.equal(catalogClip(look).snapshot.scene, look.sceneId);
    assert.equal(matchesCatalogIdentity(look, { family: family.id }), true);
    assert.equal(matchesCatalogIdentity(look, { family: look.sceneId }), true);
    assert.equal(matchesCatalogIdentity(look, { family: "hopf" }), false);
  }
});

test("variant names expose algorithmic structures instead of numbered control positions", () => {
  assert.equal(
    looks.find((look) => look.id === "cathedral:Prismatic Nave").variant,
    "Nave",
  );
  assert.equal(
    looks.find((look) => look.id === "wallpaper:p6m Snowflake").variant,
    "p6m",
  );
  assert.equal(
    looks.find((look) => look.id === "tapestry:90 · Nested linen").variant,
    "Rule 90 · Cascade",
  );
  assert.equal(
    looks.find((look) => look.id === "life:313 Vortex").variant,
    "Cyclic · 313",
  );
  assert.equal(
    looks.find((look) => look.id === "quasicrystal:Penrose Rhombs").family,
    "Aperiodic Tilings",
  );
  const swarm = looks.find((look) => look.id === "swarm:Murmuration");
  assert.equal(swarm.variant, "Curl Flow");
  assert.match(swarm.description, /no neighbour-based Boids rules/);
});

test("visual filters compose with family filters and follow the actual variant", () => {
  const sunflower = looks.find((look) => look.id === "phyllotaxis:Sunflower");
  const sphere = looks.find(
    (look) => look.id === "phyllotaxis:Fibonacci Sphere",
  );
  assert.equal(matchesCatalogIdentity(sunflower, { style: "organic" }), true);
  assert.equal(matchesCatalogIdentity(sunflower, { style: "spatial" }), false);
  assert.equal(
    matchesCatalogIdentity(sphere, { style: "spatial", family: "phyllotaxis" }),
    true,
  );
  assert.equal(
    matchesCatalogIdentity(sphere, { style: "spatial", family: "hopf" }),
    false,
  );
  for (const [style] of VISUAL_STYLES)
    assert.ok(
      looks.some((look) => matchesCatalogIdentity(look, { style })),
      style,
    );
});

test("future registered scenes can declare catalog identity without breaking generic fallback", () => {
  const source = sceneById("pulse");
  const scene = {
    ...source,
    id: "study",
    name: "A Study",
    catalog: {
      familyId: "study-group",
      family: "Studies",
      algorithm: "Study map",
      description: "A bounded study.",
      styles: ["geometric"],
      variants: ["A", "B", "C", "D"],
    },
  };
  const entries = catalogLooks([scene]);
  assert.equal(entries[0].family, "Studies");
  assert.equal(entries[0].variant, "A");
  assert.deepEqual(
    catalogFamilies(entries, [{ id: scene.id, name: scene.name }]).map(
      (entry) => entry.id,
    ),
    ["study-group"],
  );
  const fallback = familyMetadata({
    id: "unknown",
    name: "Unknown",
    description: "A novel scene. More details.",
  });
  assert.equal(fallback.familyId, "unknown");
  assert.equal(fallback.family, "Unknown");
  assert.equal(fallback.description, "A novel scene.");
});
