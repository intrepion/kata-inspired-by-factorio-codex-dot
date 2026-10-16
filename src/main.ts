import "./style.css";
import {
  createWorld,
  place,
  remove,
  mine,
  craft,
  step,
  at,
  key,
  dirs,
  total,
  transfer,
  take,
  serialize,
  deserialize,
  recipes,
  demand,
  reachable,
  type Kind,
  type World,
} from "./sim";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("world"),
  ctx = canvas.getContext("2d")!;
let w: World = createWorld(),
  selected: Kind | null = null,
  dir = 1,
  zoom = 38,
  hover = { x: 8, y: 10 },
  inspected: number | null = null,
  paused = false,
  inventoryOpen = false,
  last = performance.now(),
  acc = 0,
  mineTimer = 0;
const keys = new Set<string>(),
  storage = "brasswake-save-v1";
const kinds: Kind[] = [
  "drill",
  "belt",
  "arm",
  "furnace",
  "assembler",
  "pole",
  "generator",
  "chest",
  "lab",
  "beacon",
];
const icons: Record<Kind, string> = {
  drill: "⚒",
  belt: "»",
  arm: "↗",
  furnace: "♨",
  assembler: "⚙",
  pole: "ϟ",
  generator: "▥",
  chest: "▣",
  lab: "⌬",
  beacon: "⟡",
};
const colors: Record<string, string> = {
  ore: "#87b8cb",
  coal: "#252e32",
  stone: "#c0bcb0",
  plate: "#c8e0e1",
  gear: "#ddad64",
  survey: "#a3d99a",
};
function notify(s: string) {
  $("notice").textContent = s;
}
function save() {
  try {
    localStorage.setItem(storage, serialize(w));
    notify("Expedition saved.");
  } catch {
    notify("Storage unavailable. Keep this tab open.");
  }
}
function load() {
  try {
    const raw = localStorage.getItem(storage);
    if (!raw) {
      notify("No local save yet.");
      return;
    }
    w = deserialize(raw);
    inspected = null;
    notify("Expedition restored.");
    panel();
  } catch {
    notify("Save could not be read. Current expedition retained.");
  }
}
function panel() {
  $("toolbar").innerHTML = kinds
    .map(
      (k, i) =>
        `<button class="tool ${selected === k ? "selected" : ""}" data-kind="${k}"><small>${(i + 1) % 10} · ${w.inventory[k] || 0}</small><b>${icons[k]}</b>${k}</button>`,
    )
    .join("");
  $("toolbar")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          selected =
            selected === b.dataset.kind ? null : (b.dataset.kind as Kind);
          panel();
        }),
    );
  $("objective").innerHTML =
    `<div class="card"><small class="eyebrow">${w.won ? "SIGNAL RECEIVED" : "MISSION / RELAY RESTORATION"}</small><h3>${w.won ? "You brought the coast online." : w.research >= 8 ? "03 / Raise a beacon" : "02 / Study the field"}</h3><p>${w.won ? "Your factory is still running. Expand, refine, and watch the belts flow." : w.research >= 8 ? "Craft a beacon (10 plates + 5 gears), place it, and supply 8 kW for 10 seconds." : "Automate 8 survey packs: ore → plate → gear + plate → survey → lab."}</p><div class="track"><i style="width:${(w.research / 8) * 100}%"></i></div><p>Research ${w.research} / 8 · ${w.entities.length} structures</p></div>`;
  const e = w.entities.find((a) => a.id === inspected);
  $("inspection").innerHTML = e
    ? `<h3>${icons[e.kind]} ${e.kind} → ${["north", "east", "south", "west"][e.dir]}</h3><p class="status">${e.status} ${demand[e.kind] ? `· ${demand[e.kind]} kW` : ""}</p><p>Input: ${
        Object.entries(e.inv)
          .filter(([, n]) => n)
          .map(([k, n]) => `${k} ${n}`)
          .join(", ") || "empty"
      }<br>Output: ${
        Object.entries(e.out)
          .filter(([, n]) => n)
          .map(([k, n]) => `${k} ${n}`)
          .join(", ") || "empty"
      }<br>Cycle: ${e.progress} · fuel: ${e.fuel} ticks</p>${e.kind === "assembler" ? '<button id="recipe">Recipe: ' + e.recipe + " ↻</button>" : ""}<div class="row"><button id="take">Collect output</button><button id="rotate">Rotate R</button></div>${["ore", "coal", "plate", "gear", "survey"].map((k) => `<div class="row"><span>${k} (${w.inventory[k] || 0})</span><button data-feed="${k}">Insert 5</button></div>`).join("")}`
    : '<div class="card"><h3>01 / Make a working line</h3><p>Drill on blue ore → belt → arm → furnace.<br>Add coal to the furnace. Power drills and arms using a coal-fed generator and poles.</p><p>Click a structure to open its controls.</p></div>';
  $("take")?.addEventListener("click", () => {
    if (e) take(w, e);
    panel();
  });
  $("rotate")?.addEventListener("click", () => {
    if (e && reachable(w, e.x, e.y)) e.dir = (e.dir + 1) % 4;
    panel();
  });
  $("recipe")?.addEventListener("click", () => {
    if (e && reachable(w, e.x, e.y)) {
      if (total(e.inv) + total(e.out) || e.progress) {
        notify(
          "Empty inputs and outputs before changing recipe. Recover and rebuild to reset.",
        );
        return;
      }
      e.recipe = e.recipe === "gear" ? "survey" : "gear";
      panel();
    }
  });
  $("inspection")
    .querySelectorAll<HTMLButtonElement>("[data-feed]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (e && !transfer(w, e, b.dataset.feed!, 5))
            notify("Cannot insert: check reach, item, and capacity.");
          panel();
        }),
    );
  $("inventory").innerHTML = inventoryOpen
    ? `<h3>Satchel & handcrafting</h3><div class="stock">${Object.entries(
        w.inventory,
      )
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `<span>${k} <b>${n}</b></span>`)
        .join("")}</div>${Object.entries(recipes)
        .filter(([k]) => !["plate", "survey"].includes(k))
        .map(
          ([k, r]) =>
            `<button class="craft" data-craft="${k}">Craft ${Object.entries(
              r.output,
            )
              .map(([i, n]) => `${n} ${i}`)
              .join("")}<small>${Object.entries(r.input)
              .map(([i, n]) => `${n} ${i}`)
              .join(" + ")}</small></button>`,
        )
        .join("")}`
    : '<button id="satchel">Open inventory / E</button>';
  $("satchel")?.addEventListener("click", () => {
    inventoryOpen = true;
    panel();
  });
  $("inventory")
    .querySelectorAll<HTMLButtonElement>("[data-craft]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          notify(
            craft(w, b.dataset.craft!) ? "Crafted." : "Missing ingredients.",
          );
          panel();
        }),
    );
  $("pause").textContent = paused ? "Resume" : "Pause";
}
function pos(x: number, y: number) {
  return {
    x: (x - w.player.x) * zoom + canvas.width / 2,
    y: (y - w.player.y) * zoom + canvas.height / 2,
  };
}
function draw() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
  ctx.fillStyle = "#4c5b4b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < 40; x++)
    for (let y = 0; y < 28; y++) {
      const p = pos(x, y),
        noise = (x * 73 + y * 37) % 11;
      ctx.fillStyle = noise < 3 ? "#4c5948" : noise < 7 ? "#505e4d" : "#53614f";
      ctx.fillRect(p.x - zoom / 2, p.y - zoom / 2, zoom - 1, zoom - 1);
      if ((x * 7 + y * 3) % 17 === 0) {
        ctx.fillStyle = "#63715a";
        ctx.fillRect(p.x + 5, p.y + 5, 3, 7);
      }
      const patch = w.patches[key(x, y)];
      if (patch?.left) {
        ctx.fillStyle = colors[patch.item];
        for (let i = 0; i < 5; i++) {
          const a = ((((i * 7 + x) % 15) - 7) * zoom) / 32,
            b = ((((i * 11 + y) % 15) - 7) * zoom) / 32;
          ctx.beginPath();
          ctx.ellipse(p.x + a, p.y + b, zoom * 0.14, zoom * 0.1, i, 0, 7);
          ctx.fill();
        }
      }
    }
  const poles = w.entities.filter((e) => e.kind === "pole");
  ctx.strokeStyle = "#d3ba7777";
  ctx.lineWidth = 1;
  for (const e of poles) {
    const p = pos(e.x, e.y);
    for (const f of poles)
      if (f.id > e.id && Math.hypot(e.x - f.x, e.y - f.y) <= 6) {
        const q = pos(f.x, f.y);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 + 15, q.x, q.y);
        ctx.stroke();
      }
  }
  for (const e of w.entities) {
    const p = pos(e.x, e.y),
      s = zoom * 0.78;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "#14252277";
    ctx.fillRect(-s / 2 + 3, -s / 2 + 5, s, s);
    ctx.fillStyle =
      e.kind === "belt"
        ? "#333c34"
        : e.kind === "furnace"
          ? "#8d6750"
          : e.kind === "assembler"
            ? "#547c78"
            : e.kind === "generator"
              ? "#657b5e"
              : "#8d8a62";
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = e.id === inspected ? "#fff0a4" : "#a4b09a";
    ctx.lineWidth = e.id === inspected ? 3 : 1;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = "#e9d49e";
    ctx.font = `${zoom * 0.55}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icons[e.kind], 0, 0);
    const [dx, dy] = dirs[e.dir];
    ctx.fillStyle = "#f5ce75";
    ctx.beginPath();
    ctx.arc(dx * s * 0.4, dy * s * 0.4, zoom * 0.07, 0, 7);
    ctx.fill();
    if (demand[e.kind]) {
      ctx.fillStyle = e.powered ? "#b9df8c" : "#f7895e";
      ctx.fillRect(-s / 2, -s / 2, 5, 5);
    }
    const item = Object.keys(e.inv).find((k) => e.inv[k] > 0);
    if (e.kind === "belt" && item) {
      ctx.fillStyle = colors[item] || "#fff";
      ctx.beginPath();
      ctx.arc(
        dx * ((w.tick % 5) / 5 - 0.5) * zoom * 0.5,
        dy * ((w.tick % 5) / 5 - 0.5) * zoom * 0.5,
        zoom * 0.13,
        0,
        7,
      );
      ctx.fill();
    }
    if (e.status === "Producing") {
      ctx.fillStyle = "#f8b450";
      ctx.fillRect(
        -s / 2,
        s / 2 - 4,
        s * (e.progress / recipes[e.recipe].time),
        3,
      );
    }
    ctx.restore();
  }
  const h = pos(hover.x, hover.y);
  ctx.strokeStyle = reachable(w, hover.x, hover.y) ? "#f5d48a" : "#e47e67";
  ctx.lineWidth = 2;
  ctx.strokeRect(h.x - zoom / 2, h.y - zoom / 2, zoom, zoom);
  if (selected) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#ebcd81";
    ctx.font = `${zoom * 0.6}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(icons[selected] + ["↑", "→", "↓", "←"][dir], h.x, h.y + 8);
    ctx.globalAlpha = 1;
  }
  const p = pos(w.player.x, w.player.y);
  ctx.fillStyle = "#1e2d28";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 10, 10, 5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e2af65";
  ctx.fillRect(p.x - 7, p.y - 7, 14, 16);
  ctx.fillStyle = "#e4dcc3";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 10, 7, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#456268";
  ctx.fillRect(p.x - 5, p.y - 13, 10, 4);
  $("coordinates").textContent =
    `SECTOR ${w.player.x.toFixed(1)} / ${w.player.y.toFixed(1)}   •   ${Math.round((zoom / 38) * 100)}%   •   facing ${["N", "E", "S", "W"][dir]}`;
  $("stats").textContent =
    `${paused ? "PAUSED" : "LIVE"} · ${(w.tick / 10).toFixed(0)}s · ${w.entities.filter((e) => e.powered && demand[e.kind]).reduce((s, e) => s + demand[e.kind]!, 0)} kW online`;
}
canvas.addEventListener("mousemove", (ev) => {
  const r = canvas.getBoundingClientRect();
  hover = {
    x: Math.round((ev.clientX - r.left - r.width / 2) / zoom + w.player.x),
    y: Math.round((ev.clientY - r.top - r.height / 2) / zoom + w.player.y),
  };
});
canvas.onclick = () => {
  const e = at(w, hover.x, hover.y);
  if (e) {
    inspected = e.id;
    selected = null;
  } else if (selected) {
    notify(
      place(w, selected, hover.x, hover.y, dir)
        ? `${selected} placed.`
        : "Cannot build: check stock, reach, tile, deposit or research.",
    );
  } else {
    const p = w.patches[key(hover.x, hover.y)];
    notify(
      p
        ? `${p.item}: ${p.left} remaining. Hold F to mine.`
        : "Select a machine in the hotbar.",
    );
  }
  panel();
};
canvas.oncontextmenu = (ev) => {
  ev.preventDefault();
  notify(
    remove(w, hover.x, hover.y)
      ? "Structure and stored items recovered."
      : "No reachable structure.",
  );
  panel();
};
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = Math.max(22, Math.min(64, zoom - e.deltaY * 0.04));
  },
  { passive: false },
);
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).tagName === "BUTTON")
    (e.target as HTMLElement).blur();
  keys.add(e.key.toLowerCase());
  if (e.repeat) return;
  if (e.key === " ") {
    e.preventDefault();
    paused = !paused;
  }
  if (e.key.toLowerCase() === "e") inventoryOpen = !inventoryOpen;
  if (e.key.toLowerCase() === "q") selected = null;
  if (e.key.toLowerCase() === "r") {
    if (selected) dir = (dir + 1) % 4;
    else {
      const ent = at(w, hover.x, hover.y);
      if (ent && reachable(w, ent.x, ent.y)) ent.dir = (ent.dir + 1) % 4;
    }
  }
  if (/^[0-9]$/.test(e.key)) selected = kinds[(Number(e.key) + 9) % 10];
  panel();
});
window.onkeyup = (e) => keys.delete(e.key.toLowerCase());
window.onblur = () => keys.clear();
$("save").onclick = save;
$("load").onclick = load;
$("pause").onclick = () => {
  paused = !paused;
  panel();
};
const guide = $<HTMLDialogElement>("guide");
$("help").onclick = () => {
  paused = true;
  guide.showModal();
  panel();
};
$("closeGuide").onclick = () => {
  guide.close();
  paused = false;
  panel();
};
$("new").onclick = () => {
  w = createWorld();
  inspected = null;
  guide.close();
  paused = false;
  save();
  panel();
};
guide.addEventListener("cancel", () => {
  paused = false;
  panel();
});
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.15);
  last = now;
  if (!paused) {
    let dx = Number(keys.has("d")) - Number(keys.has("a")),
      dy = Number(keys.has("s")) - Number(keys.has("w"));
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    w.player.x = Math.max(1, Math.min(38, w.player.x + dx * dt * 4));
    w.player.y = Math.max(1, Math.min(26, w.player.y + dy * dt * 4));
    acc += dt;
    while (acc >= 0.1) {
      step(w);
      acc -= 0.1;
      if (w.tick % 10 === 0) panel();
      if (w.tick % 300 === 0) save();
    }
    mineTimer -= dt;
    if (keys.has("f") && mineTimer <= 0) {
      notify(
        mine(w, hover.x, hover.y)
          ? "Mined one resource."
          : "Mine bare deposits within 6 tiles.",
      );
      mineTimer = 0.35;
      panel();
    }
  }
  draw();
  requestAnimationFrame(frame);
}
if (localStorage.getItem(storage)) load();
else notify("Welcome, engineer. Open the field guide to plan your first line.");
panel();
requestAnimationFrame(frame);
