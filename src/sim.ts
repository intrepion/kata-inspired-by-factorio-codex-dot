export type Inventory = Record<string, number>;
export type Kind =
  | "drill"
  | "belt"
  | "arm"
  | "furnace"
  | "assembler"
  | "pole"
  | "generator"
  | "chest"
  | "lab"
  | "beacon";
export interface Entity {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  dir: number;
  inv: Inventory;
  out: Inventory;
  progress: number;
  fuel: number;
  recipe: string;
  powered: boolean;
  status: string;
}
export interface World {
  version: 1;
  tick: number;
  player: { x: number; y: number };
  inventory: Inventory;
  patches: Record<string, { item: string; left: number }>;
  entities: Entity[];
  research: number;
  won: boolean;
  nextId: number;
}
export const dirs = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const recipes: Record<
  string,
  { input: Inventory; output: Inventory; time: number }
> = {
  plate: { input: { ore: 1 }, output: { plate: 1 }, time: 20 },
  gear: { input: { plate: 2 }, output: { gear: 1 }, time: 20 },
  survey: { input: { gear: 1, plate: 1 }, output: { survey: 1 }, time: 30 },
  belt: { input: { plate: 1 }, output: { belt: 3 }, time: 0 },
  arm: { input: { plate: 2, gear: 1 }, output: { arm: 1 }, time: 0 },
  drill: { input: { plate: 5, gear: 2 }, output: { drill: 1 }, time: 0 },
  furnace: { input: { stone: 5 }, output: { furnace: 1 }, time: 0 },
  assembler: {
    input: { plate: 5, gear: 3 },
    output: { assembler: 1 },
    time: 0,
  },
  pole: { input: { plate: 1 }, output: { pole: 2 }, time: 0 },
  generator: {
    input: { plate: 8, gear: 3 },
    output: { generator: 1 },
    time: 0,
  },
  chest: { input: { stone: 2 }, output: { chest: 1 }, time: 0 },
  lab: { input: { plate: 5, gear: 2 }, output: { lab: 1 }, time: 0 },
  beacon: { input: { plate: 10, gear: 5 }, output: { beacon: 1 }, time: 0 },
};
export const demand: Partial<Record<Kind, number>> = {
  drill: 3,
  arm: 1,
  assembler: 4,
  lab: 4,
  beacon: 8,
};
export const key = (x: number, y: number) => `${x},${y}`;
export const total = (i: Inventory) =>
  Object.values(i).reduce((a, b) => a + b, 0);
export const add = (i: Inventory, k: string, n = 1) => {
  i[k] = (i[k] || 0) + n;
};
export const has = (i: Inventory, cost: Inventory) =>
  Object.entries(cost).every(([k, n]) => (i[k] || 0) >= n);
export function spend(i: Inventory, cost: Inventory) {
  if (!has(i, cost)) return false;
  for (const [k, n] of Object.entries(cost)) i[k] -= n;
  return true;
}
export function createWorld(): World {
  const w: World = {
    version: 1,
    tick: 0,
    player: { x: 8, y: 10 },
    inventory: {
      drill: 2,
      belt: 24,
      arm: 10,
      furnace: 2,
      assembler: 2,
      pole: 8,
      generator: 1,
      lab: 1,
      chest: 2,
      coal: 30,
      stone: 10,
    },
    patches: {},
    entities: [],
    research: 0,
    won: false,
    nextId: 1,
  };
  for (const [cx, cy, item] of [
    [5, 7, "ore"],
    [6, 16, "coal"],
    [17, 15, "stone"],
  ] as const)
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -1; dy <= 1; dy++)
        w.patches[key(cx + dx, cy + dy)] = { item, left: 70 };
  return w;
}
export const at = (w: World, x: number, y: number) =>
  w.entities.find((e) => e.x === x && e.y === y);
export const reachable = (w: World, x: number, y: number) =>
  Math.hypot(w.player.x - x, w.player.y - y) <= 6;
export function place(w: World, kind: Kind, x: number, y: number, dir = 1) {
  if (
    x < 1 ||
    y < 1 ||
    x > 38 ||
    y > 26 ||
    !reachable(w, x, y) ||
    at(w, x, y) ||
    !(w.inventory[kind] > 0)
  )
    return false;
  if (kind === "drill" && !w.patches[key(x, y)]?.left) return false;
  if (kind === "beacon" && w.research < 8) return false;
  w.inventory[kind]--;
  w.entities.push({
    id: w.nextId++,
    kind,
    x,
    y,
    dir,
    inv: {},
    out: {},
    progress: 0,
    fuel: 0,
    recipe: kind === "furnace" ? "plate" : "gear",
    powered: false,
    status: "Waiting",
  });
  return true;
}
export function remove(w: World, x: number, y: number) {
  const e = at(w, x, y);
  if (!e || !reachable(w, x, y)) return false;
  add(w.inventory, e.kind);
  for (const inv of [e.inv, e.out])
    for (const [k, n] of Object.entries(inv)) add(w.inventory, k, n);
  w.entities = w.entities.filter((a) => a !== e);
  return true;
}
export function mine(w: World, x: number, y: number) {
  const p = w.patches[key(x, y)];
  if (!p?.left || !reachable(w, x, y) || at(w, x, y)) return false;
  p.left--;
  add(w.inventory, p.item);
  return true;
}
export function craft(w: World, name: string) {
  if (name === "survey" || name === "plate") return false;
  const r = recipes[name];
  if (!r || !spend(w.inventory, r.input)) return false;
  for (const [k, n] of Object.entries(r.output)) add(w.inventory, k, n);
  return true;
}
export function accepts(e: Entity, item: string) {
  if (total(e.inv) >= 40) return false;
  if (e.kind === "belt") return total(e.inv) < 1;
  if (e.kind === "chest") return true;
  if (e.kind === "generator") return item === "coal";
  if (e.kind === "furnace") return item === "coal" || item === "ore";
  if (e.kind === "assembler") return !!recipes[e.recipe]?.input[item];
  if (e.kind === "lab") return item === "survey";
  return false;
}
export function insert(e: Entity, item: string) {
  if (!accepts(e, item)) return false;
  add(e.inv, item);
  return true;
}
export function transfer(w: World, e: Entity, item: string, n = 1) {
  if (!reachable(w, e.x, e.y)) return false;
  let moved = false;
  for (let i = 0; i < n; i++) {
    if (!(w.inventory[item] > 0) || !insert(e, item)) break;
    w.inventory[item]--;
    moved = true;
  }
  return moved;
}
export function take(w: World, e: Entity) {
  if (!reachable(w, e.x, e.y)) return;
  for (const inv of [
    e.out,
    ...(e.kind === "chest" || e.kind === "belt" ? [e.inv] : []),
  ])
    for (const [k, n] of Object.entries(inv)) {
      add(w.inventory, k, n);
      inv[k] = 0;
    }
}
function burn(e: Entity) {
  if (e.fuel <= 0 && (e.inv.coal || 0) > 0) {
    e.inv.coal--;
    e.fuel = 100;
  }
  return e.fuel > 0;
}
function power(w: World) {
  for (const e of w.entities) e.powered = false;
  const poles = w.entities.filter((e) => e.kind === "pole"),
    seen = new Set<number>();
  for (const start of poles) {
    if (seen.has(start.id)) continue;
    const net = [start];
    seen.add(start.id);
    for (let i = 0; i < net.length; i++)
      for (const p of poles)
        if (
          !seen.has(p.id) &&
          Math.hypot(p.x - net[i].x, p.y - net[i].y) <= 6
        ) {
          seen.add(p.id);
          net.push(p);
        }
    const networkIds = new Set(net.map((p) => p.id));
    const near = (e: Entity) => {
      const owner = poles
        .filter((p) => Math.hypot(p.x - e.x, p.y - e.y) <= 4)
        .sort(
          (a, b) =>
            Math.hypot(a.x - e.x, a.y - e.y) -
              Math.hypot(b.x - e.x, b.y - e.y) || a.id - b.id,
        )[0];
      return owner !== undefined && networkIds.has(owner.id);
    };
    const generators = w.entities.filter(
      (e) => e.kind === "generator" && near(e) && burn(e),
    );
    let capacity = generators.length * 24;
    for (const e of w.entities.filter((e) => demand[e.kind] && near(e))) {
      if (e.powered) continue;
      const need = demand[e.kind]!;
      if (capacity >= need) {
        capacity -= need;
        e.powered = true;
      }
    }
    for (const e of generators) {
      e.powered = true;
      e.fuel--;
    }
  }
}
export function step(w: World) {
  w.tick++;
  power(w);
  // Snapshot occupancy prevents an item moving multiple tiles in one tick.
  if (w.tick % 5 === 0) {
    const occupied = new Set(
      w.entities
        .filter((e) => e.kind === "belt" && total(e.inv) > 0)
        .map((e) => e.id),
    );
    for (const e of w.entities.filter(
      (e) => e.kind === "belt" && occupied.has(e.id),
    )) {
      const [dx, dy] = dirs[e.dir],
        dest = at(w, e.x + dx, e.y + dy);
      const item = Object.keys(e.inv).find((k) => e.inv[k] > 0);
      if (
        dest?.kind === "belt" &&
        !occupied.has(dest.id) &&
        item &&
        insert(dest, item)
      ) {
        e.inv[item]--;
        occupied.add(dest.id);
      }
    }
  }
  for (const e of w.entities) {
    e.status = "Waiting for inputs";
    if (demand[e.kind] && !e.powered) {
      e.status = "No power";
      continue;
    }
    if (e.kind === "arm") {
      if (w.tick % 10) continue;
      const [dx, dy] = dirs[e.dir],
        src = at(w, e.x - dx, e.y - dy),
        dest = at(w, e.x + dx, e.y + dy);
      if (src && dest) {
        const inv =
          src.kind === "belt" || src.kind === "chest" ? src.inv : src.out;
        const item = Object.keys(inv).find(
          (k) => inv[k] > 0 && accepts(dest, k),
        );
        if (item && insert(dest, item)) {
          inv[item]--;
          e.status = "Transferring";
        }
      }
    }
    if (e.kind === "drill") {
      const p = w.patches[key(e.x, e.y)];
      if (p?.left && total(e.out) < 10) {
        e.progress++;
        e.status = "Extracting";
        if (e.progress >= 20) {
          p.left--;
          add(e.out, p.item);
          e.progress = 0;
        }
      }
      const [dx, dy] = dirs[e.dir],
        dest = at(w, e.x + dx, e.y + dy),
        item = Object.keys(e.out).find((k) => e.out[k] > 0);
      if (dest && item && insert(dest, item)) e.out[item]--;
    }
    if (e.kind === "furnace" || e.kind === "assembler") {
      const r = recipes[e.recipe];
      if (r && has(e.inv, r.input) && total(e.out) < 20) {
        if (e.kind === "furnace" && !burn(e)) {
          e.status = "Needs coal";
          continue;
        }
        e.status = "Producing";
        e.progress++;
        if (e.kind === "furnace") e.fuel--;
        if (e.progress >= r.time) {
          spend(e.inv, r.input);
          for (const [k, n] of Object.entries(r.output)) add(e.out, k, n);
          e.progress = 0;
        }
      }
    }
    if (e.kind === "lab" && (e.inv.survey || 0) > 0 && w.research < 8) {
      e.status = "Researching";
      e.progress++;
      if (e.progress >= 30) {
        e.inv.survey--;
        w.research++;
        e.progress = 0;
      }
    }
    if (e.kind === "beacon" && w.research >= 8) {
      e.status = "Transmitting";
      e.progress++;
      if (e.progress >= 100) w.won = true;
    }
  }
}
export function serialize(w: World) {
  return JSON.stringify(w);
}
export function deserialize(raw: string): World {
  const w = JSON.parse(raw) as World;
  const count = (n: unknown): n is number =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  const inventory = (i: Inventory) =>
    i &&
    typeof i === "object" &&
    !Array.isArray(i) &&
    Object.entries(i).every(([k, n]) => /^[a-z]+$/.test(k) && count(n));
  const coordinate = (n: number, max: number) =>
    Number.isFinite(n) && n >= 0 && n <= max;
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
  if (
    !w ||
    w.version !== 1 ||
    !count(w.tick) ||
    !count(w.research) ||
    w.research > 8 ||
    typeof w.won !== "boolean" ||
    !count(w.nextId) ||
    !inventory(w.inventory) ||
    !w.player ||
    !coordinate(w.player.x, 39) ||
    !coordinate(w.player.y, 27) ||
    !w.patches ||
    typeof w.patches !== "object" ||
    !Array.isArray(w.entities) ||
    w.entities.length > 1120
  )
    throw Error("Invalid save");
  const ids = new Set<number>(),
    positions = new Set<string>();
  for (const e of w.entities) {
    if (
      !e ||
      !kinds.includes(e.kind) ||
      !count(e.id) ||
      e.id >= w.nextId ||
      ids.has(e.id) ||
      !count(e.x) ||
      !count(e.y) ||
      !coordinate(e.x, 38) ||
      !coordinate(e.y, 26) ||
      positions.has(key(e.x, e.y)) ||
      !count(e.dir) ||
      e.dir > 3 ||
      !inventory(e.inv) ||
      !inventory(e.out) ||
      !count(e.progress) ||
      !count(e.fuel) ||
      typeof e.powered !== "boolean" ||
      typeof e.status !== "string" ||
      !recipes[e.recipe] ||
      (e.kind === "furnace" && e.recipe !== "plate") ||
      (e.kind === "assembler" && !["gear", "survey"].includes(e.recipe))
    )
      throw Error("Invalid entity");
    ids.add(e.id);
    positions.add(key(e.x, e.y));
  }
  for (const [position, p] of Object.entries(w.patches))
    if (
      !/^\d+,\d+$/.test(position) ||
      !p ||
      !["ore", "coal", "stone"].includes(p.item) ||
      !count(p.left)
    )
      throw Error("Invalid deposit");
  return w;
}
