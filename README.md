# Brasswake — The Relay Field

An original, playable factory expedition inspired by Factorio's top-down construction and physical logistics. Restore a silent coastal relay by automating ironstone, plates, gears and survey packs, conducting research, and powering the final beacon. Original canvas art and story; no copied game assets.

## Run

Node 24 recommended.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5230. `npm run build` produces `dist/`.

## Controls

| Action | Control |
|---|---|
| Move / following camera | WASD |
| Select structures | 1–9, 0 or hotbar |
| Build / inspect | Left click |
| Rotate held / hovered structure | R |
| Clear hand | Q |
| Mine bare deposit | Hold F over tile |
| Recover machine and stored items | Right click |
| Inventory / manual crafting | E |
| Zoom | Mouse wheel |
| Pause | Space / Pause |
| Save / restore | Header buttons; autosave every 30 simulated seconds |

Build, mine, recover and panel transfers require six-tile reach. Buildings are traversable. A gold dot indicates each structure's facing. Green/red corner lamps indicate electricity.

## Production

Start with machines, poles, belts and coal, but no plates or research. Place a drill on blue ore, facing a belt. Belts only pass to belts; an arm between the belt and furnace feeds the furnace. Arms pick up behind and put down ahead. Use inspection controls to insert coal in furnace and generator. Poles link within 6 tiles and cover machines within 4. Each generator supplies 24kW. Follow the in-game field guide.

| Process | Input | Output | Time | Power |
|---|---|---|---|---|
| Drill | 1 finite deposit unit | 1 ore/coal/stone | 2s | 3kW |
| Furnace | 1 ore | 1 plate | 2s | coal; 1 coal / 10 working seconds |
| Gear assembler | 2 plates | 1 gear | 2s | 4kW |
| Survey assembler | 1 gear + 1 plate | 1 survey pack | 3s | 4kW |
| Lab | 1 survey pack | 1 research, goal 8 | 3s | 4kW |
| Beacon | researched 8 | victory | 10s | 8kW |
| Arm | rear item | front item | 1s | 1kW |
| Belt | rear/side item | next belt | 0.5s/tile | none |

Assemblers have selectable recipes; empty them before switching. Manual recipes are visible in the inventory panel. Manual crafting cannot bypass smelting or survey assembly. Stored machine outputs cap at 20, drill output at 10, inputs at 40 shared items, belts at 1. Coal gives generators 10 seconds; generation burns coal while the connected network operates, even idle. Capacity allocation favors earlier-built consumers. Beacon placement requires research and crafting (10 plates + 5 gears).

## Scope and simplifications

Single belt lane (one item per tile), no splitters/undergrounds, discrete transfer. A fuel generator replaces the boiler/steam/fluid chain. No fluids, pollution, combat or enemies. One research milestone, one finite authored map. Partial progress and burned fuel energy are lost when recovering machines; physical items are returned. No background progress while closed. Local browser saves, one expedition slot. Desktop keyboard/mouse intended.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
# or all three:
npm run check
```

Tests cover finite extraction, reach, conservation, blocked transport, inserter filtering, crafting, fuel starvation, power capacity, deterministic save/reload, and a complete automated production chain ending in victory. Browser and native verification are recorded separately in [docs/VERIFICATION.md](docs/VERIFICATION.md).

See [design and research](docs/DESIGN.md). MIT licensed. `.gitignore` contains the official github/gitignore Global Linux, Windows and macOS templates followed by stack ignores.

The public GitHub Actions workflow runs formatting, simulation tests, strict compilation, a production build and isolated Chromium regressions on every push. Native gameplay is verified separately, never inferred from CI.

## Play online

[Play on GitHub Pages](https://intrepion.github.io/kata-inspired-by-factorio-codex-dot/). Return to the [Kata Arcade](https://intrepion.github.io/).
