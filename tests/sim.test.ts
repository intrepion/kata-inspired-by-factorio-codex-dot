import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  place,
  step,
  at,
  key,
  craft,
  insert,
  serialize,
  deserialize,
  remove,
  mine,
  total,
  type World,
  type Kind,
  type Entity,
} from "../src/sim";
function build(w: World, kind: Kind, x: number, y: number, dir = 1): Entity {
  w.player = { x, y };
  assert.ok(place(w, kind, x, y, dir), `${kind} ${x},${y}`);
  return at(w, x, y)!;
}
function run(w: World, n: number) {
  for (let i = 0; i < n; i++) step(w);
}
function powered() {
  const w = createWorld();
  const g = build(w, "generator", 9, 10);
  g.inv.coal = 20;
  build(w, "pole", 9, 9);
  return w;
}
test("finite manual mining, reach, crafting and recovered inventories conserve items", () => {
  const w = createWorld();
  w.player = { x: 5, y: 7 };
  const before = w.patches[key(5, 7)].left;
  assert.ok(mine(w, 5, 7));
  assert.equal(w.patches[key(5, 7)].left, before - 1);
  assert.equal(w.inventory.ore, 1);
  assert.equal(mine(w, 17, 15), false);
  w.inventory.plate = 2;
  assert.ok(craft(w, "gear"));
  assert.equal(w.inventory.plate, 0);
  assert.equal(w.inventory.gear, 1);
  assert.equal(craft(w, "survey"), false);
  const e = build(w, "chest", 6, 7);
  e.inv.plate = 3;
  remove(w, 6, 7);
  assert.equal(w.inventory.plate, 3);
});
test("drill extracts finite patch only with power and stops on a full output", () => {
  const w = powered();
  const e = build(w, "drill", 7, 7);
  w.patches[key(7, 7)].left = 2;
  run(w, 100);
  assert.equal(w.patches[key(7, 7)].left, 0);
  assert.equal(e.out.ore, 2);
  e.powered = false;
  const bare = createWorld(),
    d = build(bare, "drill", 5, 7);
  run(bare, 100);
  assert.equal(total(d.out), 0);
});
test("belts move one tile per interval, block and preserve every real item", () => {
  const w = createWorld(),
    a = build(w, "belt", 10, 10),
    b = build(w, "belt", 11, 10),
    c = build(w, "belt", 12, 10);
  insert(a, "ore");
  run(w, 5);
  assert.equal(b.inv.ore, 1);
  assert.equal(total(c.inv), 0);
  run(w, 10);
  assert.equal(c.inv.ore, 1);
  insert(a, "ore");
  insert(b, "ore");
  run(w, 100);
  assert.equal(
    [a, b, c].reduce((n, e) => n + total(e.inv), 0),
    3,
  );
});
test("inserter filters destination inputs, transfers output and blocks without loss", () => {
  const w = powered(),
    a = build(w, "chest", 8, 10),
    arm = build(w, "arm", 8, 11, 2),
    f = build(w, "furnace", 8, 12);
  a.inv.gear = 2;
  a.inv.ore = 1;
  run(w, 10);
  assert.equal(f.inv.ore, 1);
  assert.equal(a.inv.gear, 2);
  assert.equal(a.inv.ore, 0);
  assert.equal(arm.powered, true);
});
test("furnace consumes coal once per 100 working ticks, explicit ore input and plate output", () => {
  const w = createWorld(),
    f = build(w, "furnace", 8, 10);
  f.inv.ore = 6;
  run(w, 30);
  assert.equal(total(f.out), 0);
  f.inv.coal = 1;
  run(w, 100);
  assert.equal(f.out.plate, 5);
  assert.equal(f.inv.ore, 1);
  assert.equal(f.inv.coal, 0);
  assert.equal(f.fuel, 0);
  run(w, 100);
  assert.equal(f.out.plate, 5);
});
test("capacity and disconnected poles prevent power creation", () => {
  const w = powered();
  w.inventory.beacon = 4;
  w.research = 8;
  const a = build(w, "beacon", 10, 9),
    b = build(w, "beacon", 11, 9),
    c = build(w, "beacon", 12, 9),
    d = build(w, "beacon", 9, 8);
  run(w, 1);
  assert.ok(a.powered && b.powered && c.powered);
  assert.equal(d.powered, false);
  const far = build(w, "pole", 25, 20);
  run(w, 1);
  assert.equal(far.powered, false);
});
test("save roundtrip deterministically preserves in-flight cycles and fuel", () => {
  const w = powered(),
    f = build(w, "furnace", 10, 10);
  f.inv = { ore: 8, coal: 3 };
  run(w, 37);
  const restored = deserialize(serialize(w));
  run(w, 100);
  run(restored, 100);
  assert.deepEqual(restored, w);
  assert.throws(() => deserialize('{"version":2}'));
});
test("automated production: deposit → drill → belts → arm → furnace → arm → gear assembler → survey assembler → lab → powered final beacon", () => {
  const w = createWorld();
  w.inventory = {
    ...w.inventory,
    generator: 3,
    pole: 8,
    arm: 12,
    assembler: 2,
    beacon: 0,
  };
  const gen = build(w, "generator", 9, 5);
  gen.inv.coal = 40;
  build(w, "pole", 8, 4);
  build(w, "pole", 13, 4);
  build(w, "pole", 18, 4);
  const gen2 = build(w, "generator", 14, 4);
  gen2.inv.coal = 40;
  const drill = build(w, "drill", 7, 7),
    belt = build(w, "belt", 8, 7);
  build(w, "belt", 9, 7);
  build(w, "arm", 10, 7);
  const furnace = build(w, "furnace", 11, 7);
  furnace.inv.coal = 10;
  build(w, "arm", 12, 7);
  const gears = build(w, "assembler", 13, 7);
  build(w, "arm", 14, 7);
  const survey = build(w, "assembler", 15, 7);
  survey.recipe = "survey";
  build(w, "arm", 16, 7);
  const lab = build(w, "lab", 17, 7);
  // Second smelting line supplies the extra plate required per pack.
  const d2 = build(w, "drill", 7, 6);
  build(w, "belt", 8, 6);
  build(w, "belt", 9, 6);
  build(w, "belt", 10, 6);
  build(w, "arm", 11, 6);
  const f2 = build(w, "furnace", 12, 6);
  f2.inv.coal = 10;
  build(w, "arm", 13, 6);
  build(w, "belt", 14, 6, 0);
  build(w, "belt", 14, 5);
  build(w, "belt", 15, 5, 2);
  build(w, "arm", 15, 6, 2);
  run(w, 3000);
  assert.equal(w.research, 8, JSON.stringify(w.entities));
  assert.ok(w.patches[key(7, 7)].left < 70);
  assert.ok(drill.out.ore >= 0 && total(belt.inv) <= 1 && d2.out.ore >= 0);
  assert.ok(lab.powered);
  // Recover genuine surplus held in machine buffers after research.
  for (const e of [furnace, f2, gears, survey]) {
    w.player = { x: e.x, y: e.y };
    remove(w, e.x, e.y);
  }
  assert.ok(craft(w, "beacon"), JSON.stringify(w.inventory));
  gen.inv.coal = 5;
  gen2.inv.coal = 5;
  const beacon = build(w, "beacon", 18, 7);
  run(w, 100);
  assert.equal(beacon.powered, true);
  assert.equal(w.won, true);
});
