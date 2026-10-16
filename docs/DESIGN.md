# Brasswake design and acceptance

Resolved defaults under the user's explicit choose-defaults instruction (Grill with Docs):

1. Original salvage expedition on a compact 40×28 authored coastal mineral field.
2. Simulation boundary: world creation, commands, fixed 10Hz step, serialization. This is the agreed testing seam from the task's deterministic simulation requirement.
3. Progression: finite ironstone → furnace plate → assembler gear → assembler survey → lab (8) → craft and power beacon (100 ticks).
4. Transport: one slot per directional belt, two items/sec ceiling; snapshot movement prevents teleporting through multiple tiles. Arms transfer rear-to-front at one item/sec, filtered to the destination's valid inputs. No implicit inventory teleport between machines.
5. Economy: all recipes declare input/output quantities. Inputs remain reserved by presence until completion; recipe changes require empty inventory. Removal refunds stored items and the machine, but not burned fuel energy or partial progress.
6. Energy: coal gives 100 ticks of furnace work or generator operation. A generator supplies 24kW, poles link within 6 tiles, consumers within 4. Allocation is deterministic by entity order, all-or-nothing per consumer.
7. UI: a following orthographic camera, reach 6, wheel zoom, WASD, R, Q, F, E, numeric hotbar, click, right-click and Space. Machine panel supports deliberate manual transfer for bootstrapping.
8. Persistence: versioned local save, explicit Save/Load, autosave every 30 simulated seconds.

Trade-offs: one belt lane and no splitters/undergrounds; fuel generator abstracts boiler water/steam; no fluids, pollution, enemies or combat; one research milestone; finite handcrafted map; buildings are traversable to keep small-grid construction workable. Original canvas art, original title/story. No Factorio code, assets or text copied.

Authoritative research consulted 2026-10-16:
- https://wiki.factorio.com/Controls — movement, mining, inventory, rotation and zoom conventions.
- https://wiki.factorio.com/Inserters — fixed rear/front transfer, inventories and filtering, energy.
- https://wiki.factorio.com/Electric_system — pole coverage and interconnected supply.
- https://wiki.factorio.com/Belt_transport_system — directional physical items and backpressure; our single lane is an explicit simplification.

Acceptance: deterministic extraction, transport/congestion, inserters, recipes, fuel, power and save tests; fully automated multistage production; strict TS and Vite build; headless browser interaction; separate native verification log. Public repository only, no deployed hosting.
