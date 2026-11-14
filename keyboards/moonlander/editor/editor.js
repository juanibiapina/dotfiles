const ROW_LENGTHS = [14, 14, 14, 12, 12, 6];

function place(pos) {
  let start = 0;
  for (let row = 0; row < ROW_LENGTHS.length; row++) {
    const length = ROW_LENGTHS[row];
    if (pos < start + length) {
      const entry = pos - start + 1;
      return { row: row + 1, entry, hand: entry <= length / 2 ? "left" : "right" };
    }
    start += length;
  }
  throw new Error(`no key at position ${pos}`);
}

function createLayout({ layerNames, keycodes }) {
  const original = keycodes.map((layer) => [...layer]);
  let current = original.map((layer) => [...layer]);

  const get = (key) => current[key.layer][key.pos];
  const set = (key, keycode) => {
    current[key.layer][key.pos] = keycode;
  };

  function changes() {
    const list = [];
    current.forEach((layer, index) =>
      layer.forEach((keycode, pos) => {
        const from = original[index][pos];
        if (keycode !== from) {
          list.push({ layer: index, layerName: layerNames[index], pos, ...place(pos), from, to: keycode });
        }
      }),
    );
    return list;
  }

  return {
    keycode: get,
    changed: (key) => get(key) !== original[key.layer][key.pos],
    swap(a, b) {
      const keycode = get(a);
      set(a, get(b));
      set(b, keycode);
    },
    clear: (key) => set(key, "KC_NO"),
    assign: (key, keycode) => set(key, keycode),
    reset() {
      current = original.map((layer) => [...layer]);
    },
    changes,
    report() {
      const list = changes();
      if (list.length === 0) return "";
      return [
        "Apply these Moonlander layout changes to keyboards/moonlander/keymap.c in the dotfiles repo.",
        "Keys are named by layer and their place in LAYOUT_moonlander: the row as written in keymap.c and the 1-based entry in that row.",
        "",
        ...list.map(
          (c) => `- ${c.layerName} [${c.layer}], row ${c.row}, entry ${c.entry} (${c.hand} hand): ${c.from} → ${c.to}`,
        ),
        "",
        "For new keycodes, also update the labels and colours of the drawing and key_colour in keymap.c, as docs/moonlander.md describes.",
      ].join("\n");
    },
  };
}

const SVG_NS = "http://www.w3.org/2000/svg";
const isOwnClass = (name) => name === "key" || name.startsWith("keypos-") || name.startsWith("ed-");

const container = document.getElementById("drawing");
const pristine = container.querySelector("svg").cloneNode(true);
const toolbar = {
  selected: document.getElementById("selected"),
  keycode: document.getElementById("keycode"),
  keycodes: document.getElementById("keycodes"),
  clear: document.getElementById("clear"),
  count: document.getElementById("count"),
  reset: document.getElementById("reset"),
  copy: document.getElementById("copy"),
  report: document.getElementById("report"),
};

const layerNames = [...pristine.querySelectorAll("g[class^='layer-']")].map((g) =>
  g.getAttribute("class").slice("layer-".length),
);
const layout = createLayout({ layerNames, keycodes: KEYMAP.layers.slice(0, layerNames.length) });

let keyAt = new Map();
let elementOf = new Map();
let selected = null;

function bind(svg) {
  keyAt = new Map();
  elementOf = new Map();
  svg.querySelectorAll("g[class^='layer-']").forEach((layerGroup, layer) => {
    layerGroup.querySelectorAll("g[class*='keypos-']").forEach((g) => {
      const pos = Number([...g.classList].find((c) => c.startsWith("keypos-")).slice("keypos-".length));
      const key = { layer, pos };
      keyAt.set(g, key);
      elementOf.set(`${layer}:${pos}`, g);
    });
  });
}

const element = (key) => elementOf.get(`${key.layer}:${key.pos}`);
const keyElement = (node) => node?.closest?.("g[class*='keypos-']") ?? null;

function drawingOf(g) {
  return {
    type: [...g.classList].filter((c) => !isOwnClass(c)),
    labels: [...g.children].filter((child) => child.tagName !== "rect"),
  };
}

function setDrawing(g, { type, labels }) {
  const rect = g.querySelector(":scope > rect");
  [...g.classList].filter((c) => !isOwnClass(c)).forEach((c) => g.classList.remove(c));
  g.classList.add(...type);
  rect.setAttribute("class", ["key", ...type].join(" "));
  [...g.children].filter((child) => child.tagName !== "rect").forEach((child) => child.remove());

  const top = Number(rect.getAttribute("y"));
  const width = Number(rect.getAttribute("width"));
  const height = Number(rect.getAttribute("height"));
  for (const label of labels) {
    g.append(label);
    const texts = label.tagName === "text" ? [label] : [...label.querySelectorAll("text")];
    for (const text of texts) {
      if (text.classList.contains("shifted")) text.setAttribute("y", top + 2);
      if (text.classList.contains("hold")) text.setAttribute("y", top + height - 2);
      fit(text, width - 6);
    }
  }
}

function fit(text, width) {
  if (!text.hasAttribute("data-ed-style")) text.setAttribute("data-ed-style", text.getAttribute("style") ?? "");
  const style = text.getAttribute("data-ed-style");
  text.setAttribute("style", style);
  const natural = text.getBBox().width;
  if (natural > width) {
    const scale = Math.floor((100 * width) / natural);
    const size = Number(style.match(/font-size:\s*(\d+)%/)?.[1] ?? 100);
    text.setAttribute("style", `${style.replace(/font-size:[^;]*;?/, "")}; font-size: ${Math.floor((size * scale) / 100)}%`);
  }
}

const drawingByKeycode = new Map();
bind(pristine);
keyAt.forEach((key, g) => {
  const keycode = layout.keycode(key);
  const drawing = drawingOf(g);
  if (keycode !== "KC_NO" && !drawing.type.includes("held") && !drawingByKeycode.has(keycode)) {
    drawingByKeycode.set(keycode, drawing);
  }
});

function newDrawing(keycode) {
  const known = drawingByKeycode.get(keycode);
  if (known) return { type: [...known.type], labels: known.labels.map((label) => label.cloneNode(true)) };
  if (keycode === "KC_NO") return { type: [], labels: [] };
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", 0);
  text.setAttribute("y", 0);
  text.setAttribute("class", "key tap");
  const words = keycode.replace(/^KC_/, "").split("_").filter(Boolean);
  words.forEach((word, index) => {
    const line = document.createElementNS(SVG_NS, "tspan");
    line.setAttribute("x", 0);
    line.setAttribute("dy", index === 0 ? `${-0.6 * (words.length - 1)}em` : "1.2em");
    line.textContent = word;
    text.append(line);
  });
  return { type: [], labels: [text] };
}

function describe(key) {
  const { row, entry, hand } = place(key.pos);
  return `${layerNames[key.layer]}, row ${row}, entry ${entry} (${hand} hand): ${layout.keycode(key)}`;
}

function select(key) {
  if (selected) element(selected)?.classList.remove("ed-selected");
  selected = key;
  if (key) element(key).classList.add("ed-selected");
  toolbar.selected.textContent = key
    ? describe(key)
    : "Click a key to select it, or drag it onto another key to swap them.";
  toolbar.keycode.disabled = !key;
  toolbar.clear.disabled = !key;
  toolbar.keycode.value = key ? layout.keycode(key) : "";
}

function refresh() {
  keyAt.forEach((key, g) => g.classList.toggle("ed-changed", layout.changed(key)));
  const count = layout.changes().length;
  toolbar.count.textContent = count === 0 ? "No changes" : count === 1 ? "1 change" : `${count} changes`;
  toolbar.reset.disabled = count === 0;
  toolbar.copy.disabled = count === 0;
  toolbar.report.textContent = layout.report();
  if (selected) toolbar.selected.textContent = describe(selected);
}

function clearKey(key) {
  layout.clear(key);
  setDrawing(element(key), newDrawing("KC_NO"));
  refresh();
  select(key);
}

function assignKey(key, keycode) {
  layout.assign(key, keycode);
  setDrawing(element(key), newDrawing(keycode));
  refresh();
  select(key);
}

function swapKeys(a, b) {
  layout.swap(a, b);
  const first = element(a);
  const second = element(b);
  const drawingA = drawingOf(first);
  const drawingB = drawingOf(second);
  setDrawing(first, drawingB);
  setDrawing(second, drawingA);
  refresh();
  select(b);
}

function reset() {
  layout.reset();
  container.querySelector("svg").replaceWith(pristine.cloneNode(true));
  bind(container.querySelector("svg"));
  selected = null;
  select(null);
  refresh();
}

let drag = null;

container.addEventListener("pointerdown", (event) => {
  const g = keyElement(event.target);
  if (!g || event.button !== 0) return;
  event.preventDefault();
  drag = { source: g, x: event.clientX, y: event.clientY, moved: false, over: null };
});

document.addEventListener("pointermove", (event) => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
  drag.moved = true;
  drag.source.classList.add("ed-dragging");
  const over = keyElement(document.elementFromPoint(event.clientX, event.clientY));
  const target = over && over !== drag.source ? over : null;
  if (target !== drag.over) {
    drag.over?.classList.remove("ed-drop");
    target?.classList.add("ed-drop");
    drag.over = target;
  }
});

document.addEventListener("pointerup", () => {
  if (!drag) return;
  const { source, moved, over } = drag;
  drag = null;
  source.classList.remove("ed-dragging");
  over?.classList.remove("ed-drop");
  if (moved && over) swapKeys(keyAt.get(source), keyAt.get(over));
  else if (!moved) select(keyAt.get(source));
});

container.addEventListener("click", (event) => {
  if (keyElement(event.target)) event.preventDefault();
});

toolbar.keycode.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && selected) {
    const keycode = toolbar.keycode.value.trim();
    if (keycode) assignKey(selected, keycode);
  }
  if (event.key === "Escape") toolbar.keycode.blur();
});

document.addEventListener("keydown", (event) => {
  if (event.target === toolbar.keycode) return;
  if ((event.key === "Delete" || event.key === "Backspace") && selected) {
    event.preventDefault();
    clearKey(selected);
  }
  if (event.key === "Escape") select(null);
});

toolbar.clear.addEventListener("click", () => selected && clearKey(selected));
toolbar.reset.addEventListener("click", reset);

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

toolbar.copy.addEventListener("click", async () => {
  const copied = await writeClipboard(layout.report());
  toolbar.copy.textContent = copied ? "Copied" : "Copy failed";
  setTimeout(() => {
    toolbar.copy.textContent = "Copy changes";
  }, 1500);
});

toolbar.keycodes.append(
  ...[...new Set(KEYMAP.layers.flat())].sort().map((keycode) => Object.assign(document.createElement("option"), { value: keycode })),
);

bind(container.querySelector("svg"));
refresh();
