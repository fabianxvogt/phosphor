// D57: bright anchors, darker colour fields and vivid accents for projection
// on black. IDs are portable set data; names and mood tags serve curation.
export const MOODS = Object.freeze([
  "warm",
  "cold",
  "acid",
  "mono",
  "deep",
  "peak",
]);

export const PALETTES = Object.freeze(
  [
    {
      id: "phosphor",
      name: "Phosphor",
      moods: ["acid", "peak"],
      colors: { primary: "#d5ff5f", secondary: "#5364ff", accent: "#ff5bc8" },
    },
    {
      id: "ember",
      name: "Ember",
      moods: ["warm"],
      colors: { primary: "#ffe3a1", secondary: "#a82b12", accent: "#ff793d" },
    },
    {
      id: "flare",
      name: "Flare",
      moods: ["warm", "peak"],
      colors: { primary: "#fff0c2", secondary: "#d51d42", accent: "#ff941f" },
    },
    {
      id: "copper",
      name: "Copper",
      moods: ["warm", "deep"],
      colors: { primary: "#ffd9a3", secondary: "#793c2a", accent: "#db8e56" },
    },
    {
      id: "solar",
      name: "Solar",
      moods: ["warm", "peak"],
      colors: { primary: "#fff4b0", secondary: "#cb510c", accent: "#ffb52e" },
    },
    {
      id: "rose",
      name: "Rose",
      moods: ["warm"],
      colors: { primary: "#ffe0de", secondary: "#b83168", accent: "#ff927d" },
    },
    {
      id: "carmine",
      name: "Carmine",
      moods: ["warm", "peak"],
      colors: { primary: "#ffd4cd", secondary: "#86113a", accent: "#ff375d" },
    },
    {
      id: "glacier",
      name: "Glacier",
      moods: ["cold"],
      colors: { primary: "#d8fbff", secondary: "#2359bc", accent: "#53cfdc" },
    },
    {
      id: "arctic",
      name: "Arctic",
      moods: ["cold", "deep"],
      colors: { primary: "#f2f7ff", secondary: "#3b5379", accent: "#90b2d8" },
    },
    {
      id: "cobalt",
      name: "Cobalt",
      moods: ["cold", "deep"],
      colors: { primary: "#c2e4ff", secondary: "#1837a1", accent: "#688fff" },
    },
    {
      id: "tidal",
      name: "Tidal",
      moods: ["cold", "deep"],
      colors: { primary: "#bdffed", secondary: "#105f6a", accent: "#3bc0b8" },
    },
    {
      id: "ultraviolet",
      name: "Ultraviolet",
      moods: ["cold", "peak"],
      colors: { primary: "#edddff", secondary: "#5a249c", accent: "#c277ff" },
    },
    {
      id: "electric",
      name: "Electric",
      moods: ["cold", "peak"],
      colors: { primary: "#d9ffff", secondary: "#0c668c", accent: "#32caff" },
    },
    {
      id: "acid-yellow",
      name: "Acid Yellow",
      moods: ["acid", "peak"],
      colors: { primary: "#faffb3", secondary: "#506c13", accent: "#bfdc26" },
    },
    {
      id: "orchid",
      name: "Orchid",
      moods: ["acid"],
      colors: { primary: "#ffd7fc", secondary: "#71228b", accent: "#dc6adf" },
    },
    {
      id: "tangerine",
      name: "Tangerine",
      moods: ["acid", "peak"],
      colors: { primary: "#fff0ad", secondary: "#922386", accent: "#ff842b" },
    },
    {
      id: "toxic",
      name: "Toxic",
      moods: ["acid"],
      colors: { primary: "#edffcf", secondary: "#126548", accent: "#80d546" },
    },
    {
      id: "silver",
      name: "Silver",
      moods: ["mono", "cold"],
      colors: { primary: "#f4f4ef", secondary: "#454b55", accent: "#a1aab4" },
    },
    {
      id: "chalk",
      name: "Chalk",
      moods: ["mono", "warm"],
      colors: { primary: "#fff2d5", secondary: "#514536", accent: "#c6b492" },
    },
    {
      id: "ice-ink",
      name: "Ice & Ink",
      moods: ["mono", "cold"],
      colors: { primary: "#e5fcff", secondary: "#283f59", accent: "#7aadb6" },
    },
    {
      id: "redline",
      name: "Redline",
      moods: ["mono", "warm", "peak"],
      colors: { primary: "#ffe0db", secondary: "#601c26", accent: "#e74a5c" },
    },
    {
      id: "petrol",
      name: "Petrol",
      moods: ["deep", "cold"],
      colors: { primary: "#c4f5e9", secondary: "#203f64", accent: "#6c9c94" },
    },
    {
      id: "velvet",
      name: "Velvet",
      moods: ["deep", "warm"],
      colors: { primary: "#ffdbbb", secondary: "#472951", accent: "#b6738a" },
    },
    {
      id: "goldrush",
      name: "Goldrush",
      moods: ["peak", "warm"],
      colors: { primary: "#fff5cb", secondary: "#6f299e", accent: "#ffa822" },
    },
  ].map((palette) =>
    Object.freeze({
      ...palette,
      moods: Object.freeze(palette.moods),
      colors: Object.freeze(palette.colors),
    }),
  ),
);

const byId = new Map(PALETTES.map((palette) => [palette.id, palette]));
export const paletteById = (id) => byId.get(id);
