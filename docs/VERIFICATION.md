# Verification record

2026-10-16. Automated and native evidence are distinct.

## Automated

- Strict TypeScript compilation and Vite production bundle pass.
- Nine deterministic simulation tests cover extraction, finite patches, reach, item conservation, recipe costs, output recovery, belt movement and backpressure, inserter filtering, fuel starvation/consumption, power capacity/disconnection, save roundtrip and a complete automated two-drill production layout.
- Full-chain fixture supplies extra generator hardware and coal, then uses real finite deposits through furnaces, gears, surveys, research and beacon crafting/victory. No plates, gears or surveys are injected. Final beacon gears are handcrafted from recovered real plates.
- Three headless Playwright tests verify fresh start, guide, placement, inspection, inventory, save/reload, absence of page exceptions, actual mining, character movement, stationary-pointer targeting after camera movement, modal input isolation, and malformed-load retention.

## Native Chrome

Dedicated ⚙ Brasswake QA session at port 5230, after Human Resource Machine explicitly released shared native-browser slot. Existing project tabs and saves were left untouched.

Fresh start, paused construction using number hotkeys: drill on ore at (5,7), belt (6,7), arm (7,7), furnace (8,7), fueled generator (8,9), pole (8,8). Added linked poles, gear assembler and survey assembler. Ran and observed physical ore, fueled plate output, automatic arm transfer through gear and survey production. Manually supplied extra plates to survey assembler and collected packs into the lab. Lab reached 8/8 research. Manually mined coal with held F to extend furnace supply. This native layout used manual transfers for bootstrapping and lab feeding; the separately tested simulation layout is fully automated.

Native beacon crafted from 10 real plates + 5 real gears and powered to victory. Observed “SIGNAL RECEIVED” and “You brought the coast online.” Save/reload restored victory, research8/8 and10 structures. WASD moved sector8.0 to8.8. After fixes, guide ignored Space/WASD and preserved paused state and coordinates. Dedicated deliverable tab retained. Clicked Chrome Cancel debugging control; fresh native AX diff verified infobar container and controls removed. Slot explicitly released to Fibbage.

Initial nohup preview did not survive its shell; replaced by a detached session process. Reload then succeeded with the completed native save.

## Independent review

Separate Standards and Spec reviewers found stale pointer coordinates after camera/zoom changes, insufficient malformed-save validation, modal keyboard pause leakage, and a browser test title overstating mining coverage. All findings fixed; both independent reviewers rechecked and reported no remaining blockers. Full `npm run check` passes formatting, 9 simulation tests, strict TypeScript, production build and 3 headless browser tests.
