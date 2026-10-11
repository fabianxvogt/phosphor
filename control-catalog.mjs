// Catalog panel of the control window (D65, D68): every look — authored and
// own — as a card with a thumbnail, a favourite heart, a 0–10 half-star
// rating, Play and Edit. The first 32 cards of the current view carry the
// grid keys (the control stores them in the set; the stage plays them).
// Cards are keyed by look id and reused, so a status update or a rating
// never rebuilds what the pointer or keyboard focus is on.
//
// Sorting: ratings apply at once (set, stage, autopilot), but the order is
// frozen while the pointer is over the list or a rating has focus; it
// re-sorts when the pointer leaves, focus leaves the list, the search or
// family filter changes, or Sort is pressed — then the last rated card is
// scrolled into view. Favourites always come first (D68).
import { sortCatalog, ratingOf, lookPalette, MAX_RATING } from "./catalog.mjs";
import { paletteMatrix } from "./thumbnail-palette.mjs";
import { paletteById } from "./palettes.mjs";
import {
  catalogFamilies,
  matchesCatalogIdentity,
  VISUAL_STYLES,
} from "./family-catalog.mjs";

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
// Search ignores case and accents ("mobius" finds "Möbius").
const fold = (text) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const format = (rating) =>
  rating === null
    ? "—"
    : Number.isInteger(rating)
      ? `${rating}`
      : rating.toFixed(1);

// The rating widget: a role="slider" with ten stars (half steps) and a
// separate "never" (0) toggle. Arrow keys move in 0.5 steps; Home/End go to
// 0/10; Delete clears. Only those keys are kept from the grid's shortcuts.
const SLIDER_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Delete",
  "Backspace",
]);
function ratingWidget(look, getRating, setRating) {
  const stars = Array.from({ length: MAX_RATING }, () =>
    el("span", { className: "star", textContent: "★", ariaHidden: "true" }),
  );
  const slider = el("div", {
    className: "stars",
    role: "slider",
    tabIndex: 0,
    ariaLabel: `Rating for ${look.name}`,
    ariaValueMin: "0",
    ariaValueMax: String(MAX_RATING),
    title:
      "Rate 0.5–10 (left half of a star: half). Click the current value to clear.",
  });
  slider.append(...stars);
  const never = el("button", {
    className: "never",
    type: "button",
    textContent: "0",
    title: "Never play (rating 0)",
    ariaLabel: `Never play ${look.name}`,
  });
  // The value badge sits on the thumbnail; it previews the pointed value.
  const value = el("output", { className: "badge" });
  const paint = (shown, rating) => {
    stars.forEach((star, i) => {
      star.className = `star ${shown >= i + 1 ? "full" : shown >= i + 0.5 ? "half" : ""}`;
    });
    slider.classList.toggle("unrated", rating === null);
    const preview = shown !== (rating ?? 0);
    value.textContent =
      !preview && rating === 0
        ? "never"
        : `★ ${format(preview ? shown : rating)}`;
    value.hidden = !preview && rating === null;
    value.classList.toggle("never", !preview && rating === 0);
    value.classList.toggle("preview", preview);
  };
  const sync = () => {
    const rating = getRating();
    paint(rating ?? 0, rating);
    if (rating === null) slider.removeAttribute("aria-valuenow");
    else slider.ariaValueNow = String(rating);
    slider.ariaValueText =
      rating === null
        ? "unrated"
        : rating === 0
          ? "0, never"
          : `${rating} of 10`;
    never.ariaPressed = String(rating === 0);
  };
  const pointed = (event) => {
    const star = event.target.closest?.(".star");
    if (!star) return null;
    const i = stars.indexOf(star);
    const box = star.getBoundingClientRect();
    return event.clientX < box.left + box.width / 2 ? i + 0.5 : i + 1;
  };
  slider.addEventListener("pointermove", (event) => {
    const v = pointed(event);
    if (v !== null) paint(v, getRating());
  });
  slider.addEventListener("pointerleave", sync);
  slider.addEventListener("click", (event) => {
    const v = pointed(event);
    if (v === null) return;
    setRating(v === getRating() ? null : v);
  });
  never.addEventListener("click", () =>
    setRating(getRating() === 0 ? null : 0),
  );
  // A pointer rating does not take keyboard focus, so leaving the list with
  // the pointer re-sorts at once; Tab still reaches the slider.
  for (const target of [slider, never])
    target.addEventListener("mousedown", (event) => event.preventDefault());
  slider.addEventListener("keydown", (event) => {
    if (!SLIDER_KEYS.has(event.key) || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation(); // arrows rate here instead of nudging the clock
    const rating = getRating();
    const step =
      { ArrowRight: 0.5, ArrowUp: 0.5, PageUp: 1 }[event.key] ??
      { ArrowLeft: -0.5, ArrowDown: -0.5, PageDown: -1 }[event.key] ??
      0;
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MAX_RATING;
    else if (event.key === "Delete" || event.key === "Backspace") next = null;
    else if (rating === null) next = step > 0 ? step : 0;
    else next = Math.max(0, Math.min(MAX_RATING, rating + step));
    if (next !== rating) setRating(next);
  });
  // Releasing a held arrow key must not reach the window either.
  slider.addEventListener("keyup", (event) => {
    if (SLIDER_KEYS.has(event.key)) event.stopPropagation();
  });
  sync();
  return {
    node: el("div", { className: "rating" }, never, slider),
    value,
    sync,
  };
}

export const SHOW = [
  ["all", "All looks"],
  ["favorites", "Favourites"],
  ["rated", "Rated"],
  ["unrated", "Unrated"],
  ["own", "Own looks"],
];

export class CatalogPanel {
  constructor({
    looks, // catalogLooks(scenes, set.looks)
    families, // [{ id, name }]
    list, // scroll container
    search,
    family,
    character = document.getElementById("catalogCharacter"), // visual-style select
    show, // select: SHOW
    sortButton,
    title,
    count,
    getRatings,
    getFavorites, // () => [id]
    keyLabel, // (index 0–31) => label
    onRate, // (id, rating | null)
    onFavorite, // (id, on)
    onPlay, // (look)
    onEdit, // (look)
    onOrder, // ([id]) after every sort: the visible order
    thumbnails, // Thumbnails
    palette = null, // shared show colours, if enabled
  }) {
    Object.assign(this, {
      looks,
      families,
      list,
      search,
      family,
      character,
      show,
      sortButton,
      title,
      count,
      getRatings,
      getFavorites,
      keyLabel,
      onRate,
      onFavorite,
      onPlay,
      onEdit,
      onOrder,
      thumbnails,
      palette,
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "palette-filter-defs");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs><filter id="catalog-palette" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" /></filter></defs>';
    this.paletteMatrix = svg.querySelector("feColorMatrix");
    if (palette)
      this.paletteMatrix.setAttribute("values", paletteMatrix(palette));
    document.body.append(svg);
    this.cards = new Map(); // id → { node, look, widget, thumb, … }
    this.order = [];
    this.stale = 0; // ratings or favourites changed since the last sort
    this.lastRated = null;
    this.pointerInside = false;
    this.live = null;
    this.pending = null;
    this.selected = null;
    show.replaceChildren(
      ...SHOW.map(([value, label]) =>
        el("option", { value, textContent: label }),
      ),
    );
    this.#families();
    character?.replaceChildren(
      el("option", { value: "", textContent: "All visual styles" }),
      ...VISUAL_STYLES.map(([value, textContent]) =>
        el("option", { value, textContent }),
      ),
    );
    this.observer =
      "IntersectionObserver" in globalThis
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const card = entry.target.card;
                card.visible = entry.isIntersecting;
                if (entry.isIntersecting)
                  thumbnails?.want(card.look.id, card.snapshot);
                else thumbnails?.forget(card.look.id);
              }
            },
            // The viewport is the root, so cards clipped by the list's
            // scroll box or below the page fold are not rendered.
            { rootMargin: "120px 0px" },
          )
        : null;
    search.addEventListener("input", () => this.sort());
    family.addEventListener("change", () => this.sort());
    character?.addEventListener("change", () => this.sort());
    show.addEventListener("change", () => this.sort());
    sortButton.addEventListener("click", () => this.sort());
    list.addEventListener("pointerenter", () => (this.pointerInside = true));
    list.addEventListener("pointerleave", () => {
      this.pointerInside = false;
      if (!list.contains(document.activeElement)) this.#settle();
    });
    list.addEventListener("focusout", (event) => {
      if (!list.contains(event.relatedTarget) && !this.pointerInside)
        this.#settle();
    });
    this.sort();
  }

  #families() {
    const value = this.family.value;
    const families = catalogFamilies(this.looks, this.families);
    this.family.replaceChildren(
      el("option", {
        value: "",
        textContent: `All families (${families.length})`,
      }),
      ...families.map((f) =>
        el("option", {
          value: f.id,
          textContent: `${f.name} (${f.count})`,
        }),
      ),
    );
    this.family.value =
      families.find((f) => f.id === value || f.sceneIds.includes(value))?.id ??
      "";
    this.title.replaceChildren(
      "Catalog",
      el("span", {
        className: "catalog-total",
        textContent: `${this.looks.length} looks · ${families.length} families`,
      }),
    );
  }

  // Own looks were added, edited or deleted: rebuild their cards.
  setLooks(looks) {
    const ids = new Set(looks.map((look) => look.id));
    for (const [id, card] of this.cards)
      if (!ids.has(id) || card.look.own) {
        this.observer?.unobserve(card.node);
        card.node.remove();
        this.cards.delete(id);
        if (card.look.own) this.thumbnails?.invalidate(id);
      }
    this.looks = looks;
    this.#families();
    this.sort();
  }

  #card(look) {
    let card = this.cards.get(look.id);
    if (card) return card;
    const palette =
      look.palette && look.palette !== "custom"
        ? paletteById(look.palette)
        : look.palette === "custom"
          ? { colors: look.snapshot.palette }
          : paletteById(lookPalette(look));
    const colors = this.palette ?? palette.colors;
    const snapshot = { ...look.snapshot, palette: { ...colors } };
    const { primary, secondary, accent } = colors;
    const thumb = el("div", {
      className: "thumb",
      style: `background:linear-gradient(120deg,${secondary},${primary} 55%,${accent})`,
    });
    const widget = ratingWidget(
      look,
      () => ratingOf(this.getRatings(), look.id),
      (rating) => this.#rate(look.id, rating),
    );
    const key = el("kbd", { className: "key", hidden: true });
    thumb.append(key, widget.value);
    if (look.own)
      thumb.append(
        el("span", {
          className: "own",
          textContent: "own",
          title: "Your own look",
        }),
      );
    // The thumbnail plays the look, like a grid key, with native keyboard semantics.
    thumb.role = "button";
    thumb.tabIndex = 0;
    thumb.ariaLabel = `Play ${look.name}`;
    thumb.addEventListener("click", () => this.onPlay(look));
    thumb.addEventListener("keydown", (event) => {
      if (
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.key !== "Enter" && event.key !== " ")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) this.onPlay(look);
    });
    thumb.title = "Play (preview here; live when the stage is open)";
    const heart = el("button", {
      className: "heart",
      type: "button",
      textContent: "♡",
      title: "Favourite: in your live set, listed first",
      ariaLabel: `Favourite ${look.name}`,
      onclick: () => this.#favorite(look.id),
    });
    heart.addEventListener("mousedown", (event) => event.preventDefault());
    const identity = look.variant
      ? `${look.family} · ${look.variant}`
      : look.family;
    const node = el(
      "article",
      {
        className: "look",
        role: "listitem",
        ariaLabel: `${look.name} · ${identity}`,
      },
      thumb,
      el(
        "div",
        { className: "look-body" },
        el(
          "div",
          { className: "look-title" },
          el("div", {
            className: "look-name",
            textContent: look.name,
            title: look.name,
          }),
          heart,
        ),
        el("div", {
          className: "look-meta",
          textContent: identity,
          title: identity,
        }),
        el(
          "details",
          { className: "look-tools" },
          el("summary", {
            textContent: "Rate & edit",
            ariaLabel: `Rate and edit ${look.name}`,
          }),
          el(
            "p",
            { className: "look-algorithm" },
            el("strong", {
              textContent: look.algorithm ?? "Generative visual",
            }),
            document.createTextNode(`. ${look.description ?? ""}`),
          ),
          widget.node,
          el(
            "div",
            { className: "look-actions" },
            el("button", {
              className: "play",
              type: "button",
              textContent: "▶ Play",
              title: "Preview here; plays live when the stage is open",
              onclick: () => this.onPlay(look),
            }),
            el("button", {
              className: "edit",
              type: "button",
              textContent: "Edit",
              title: "Open in the look editor (save changes as an own look)",
              onclick: () => this.onEdit(look),
            }),
          ),
        ),
      ),
    );
    // Pointer-opened details must not pin sorting after the pointer leaves.
    // Keyboard activation still keeps focus in the card for rating/navigation.
    node
      .querySelector("summary")
      .addEventListener("mousedown", (event) => event.preventDefault());
    card = {
      node,
      look,
      widget,
      thumb,
      heart,
      key,
      snapshot,
      text: fold(
        `${look.name} ${look.family} ${look.sourceFamily ?? ""} ${look.variant ?? ""} ${look.algorithm ?? ""} ${look.description ?? ""} ${look.styles?.join(" ") ?? ""}`,
      ),
    };
    node.card = card;
    this.cards.set(look.id, card);
    this.#paintHeart(card);
    this.showThumbnail(look.id);
    return card;
  }

  #paintHeart(card) {
    const on = this.getFavorites().includes(card.look.id);
    card.heart.ariaPressed = String(on);
    card.heart.textContent = on ? "♥" : "♡";
    card.node.classList.toggle("favorite", on);
  }

  #rate(id, rating) {
    this.onRate(id, rating);
    this.cards.get(id)?.widget.sync();
    this.lastRated = id;
    this.stale++;
    this.#updateCount();
  }

  #favorite(id) {
    const on = !this.getFavorites().includes(id);
    this.onFavorite(id, on);
    const card = this.cards.get(id);
    if (card) this.#paintHeart(card);
    this.lastRated = id;
    this.stale++;
    this.#updateCount();
    if (!this.pointerInside && !this.list.contains(document.activeElement))
      this.#settle();
  }

  #settle() {
    if (this.stale) this.sort();
  }

  #updateCount() {
    const shown = this.order.length;
    this.count.textContent =
      shown === this.looks.length ? "" : `${shown} shown`;
    this.sortButton.hidden = !this.stale;
    this.sortButton.textContent = `Sort (${this.stale} changed)`;
  }

  #visible(look, ratings, favorites, words, family, show) {
    if (
      !matchesCatalogIdentity(look, {
        family,
        style: this.character?.value ?? "",
      })
    )
      return false;
    const rating = ratingOf(ratings, look.id);
    if (show === "favorites" && !favorites.has(look.id)) return false;
    if (show === "rated" && rating === null) return false;
    if (show === "unrated" && rating !== null) return false;
    if (show === "own" && !look.own) return false;
    return words.every((word) => this.#card(look).text.includes(word));
  }

  // Rebuilds the visible order from favourites, ratings, search and filters.
  sort() {
    const words = fold(this.search.value).split(/\s+/).filter(Boolean);
    const ratings = this.getRatings();
    const favorites = new Set(this.getFavorites());
    const visible = sortCatalog(this.looks, ratings, favorites).filter((look) =>
      this.#visible(
        look,
        ratings,
        favorites,
        words,
        this.family.value,
        this.show.value,
      ),
    );
    const scrollTop = this.list.scrollTop;
    this.list.replaceChildren(...visible.map((look) => this.#card(look).node));
    if (!visible.length) {
      const own =
        this.show.value === "own" && !this.looks.some((look) => look.own);
      this.list.append(
        el(
          "div",
          { className: "catalog-empty", role: "status" },
          el("strong", {
            textContent: own
              ? "Your next look starts here"
              : "No matching looks",
          }),
          el("p", {
            textContent: own
              ? "Choose a look, make it yours, then save it as an own look."
              : "Try another search or reset the filters to explore the catalog.",
          }),
          el("button", {
            textContent: "Explore all looks",
            onclick: () => {
              this.search.value = "";
              this.family.value = "";
              if (this.character) this.character.value = "";
              this.show.value = "all";
              this.show.dispatchEvent(new Event("change"));
            },
          }),
        ),
      );
    }
    this.order = visible.map((look) => look.id);
    if (this.observer) {
      this.observer.disconnect();
      for (const id of this.order)
        this.observer.observe(this.cards.get(id).node);
    }
    this.list.scrollTop = scrollTop;
    const rated = this.lastRated && this.cards.get(this.lastRated)?.node;
    if (this.stale && rated?.isConnected) this.#reveal(rated);
    this.stale = 0;
    for (const card of this.cards.values()) this.#paintHeart(card);
    this.#updateCount();
    this.#highlight();
    this.refreshKeys();
    this.onOrder?.(this.order.slice(0, 32));
  }

  // Key badges on the first 32 visible cards (labels follow the layout).
  refreshKeys() {
    for (const card of this.cards.values()) card.key.hidden = true;
    this.order.slice(0, 32).forEach((id, i) => {
      const key = this.cards.get(id)?.key;
      if (!key) return;
      key.textContent = this.keyLabel?.(i) ?? "";
      key.hidden = !key.textContent;
    });
  }

  first() {
    return this.order[0] ?? null;
  }

  // Scrolls only the catalog list (never the page) so a card is visible.
  reveal(id) {
    const node = this.cards.get(id)?.node;
    if (node?.isConnected) this.#reveal(node);
  }

  #reveal(node) {
    const list = this.list.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    if (box.top < list.top) this.list.scrollTop += box.top - list.top - 8;
    else if (box.bottom > list.bottom)
      this.list.scrollTop += box.bottom - list.bottom + 8;
  }

  // Ratings or favourites changed elsewhere (import, another tab).
  refresh() {
    for (const card of this.cards.values()) {
      card.widget.sync();
      this.#paintHeart(card);
    }
    if (!this.pointerInside && !this.list.contains(document.activeElement))
      this.sort();
  }

  showThumbnail(id) {
    const card = this.cards.get(id);
    const result = this.thumbnails?.get(id);
    if (!card || !result?.url || card.thumb.querySelector("img")) return;
    card.thumb.prepend(
      el("img", {
        src: result.url,
        alt: "",
        width: 192,
        height: 108,
        decoding: "async",
      }),
    );
  }

  setPalette(colors) {
    if (JSON.stringify(colors) === JSON.stringify(this.palette)) return;
    this.palette = { ...colors };
    this.paletteMatrix.setAttribute("values", paletteMatrix(colors));
    for (const card of this.cards.values()) {
      card.snapshot.palette = { ...colors };
      card.thumb.style.background = `linear-gradient(120deg,${colors.secondary},${colors.primary} 55%,${colors.accent})`;
    }
  }

  // Live / pending look ids from the show status.
  setStatus(live, pending) {
    if (live === this.live && pending === this.pending) return;
    this.live = live;
    this.pending = pending;
    this.#highlight();
  }

  // The look open in the editor.
  setSelected(id) {
    this.selected = id;
    this.#highlight();
  }

  #highlight() {
    for (const card of this.cards.values()) {
      card.node.classList.toggle("live", card.look.id === this.live);
      card.node.classList.toggle("pending", card.look.id === this.pending);
      card.node.classList.toggle("selected", card.look.id === this.selected);
    }
  }
}
