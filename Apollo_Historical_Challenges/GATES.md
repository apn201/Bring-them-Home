# Build gate ledger

Preparation completed on 15 November 2026. No application slice is certified complete yet.

| Gate | Current status | Evidence / remaining requirement |
| --- | --- | --- |
| Preparation | complete | Source snapshots, primary PDFs, sample audio, archive catalogue, flight builds and headless WASM acquisition smoke |
| G0 | partial | `package.json`/`package-lock.json`, TypeScript/Vite/Vitest project, runtime asset checks and ADR-001 added. Node v24.14.1 build passes. Supplied Python/assembler verification could not be rerun in this Windows workspace because Python is unavailable; corresponding old WASM source rebuild remains untested. |
| G1 | partial | A dedicated worker now loads the real LM131R1 ROM into the supplied ddc65e7be WASM; worker messages drive the DSKY relay/lamp decoder and a fresh-instance deterministic restart. `npm run build` and input-code unit tests pass. Browser/device smoke, native parity, validated step units and complete snapshots remain. |
| G2 | partial | Slice 2 now has a project-owned responsive DSKY panel and tested channel-010 relay decoder, full keyboard/pointer controls, annunciator handling, accessible text outputs, and a real worker trace. Browser visual/device and rapid-input integration checks remain. |
| G3 | partial | Typed phase runtime, worker-cycle clock, deterministic input log, correctable V35 entry recovery, explicit divergence, debrief and fresh-instance restart are implemented and unit-tested. Browser touch, render-rate and hidden-tab integration checks remain. |
| G4 | partial research | Activation ACT-30 and dictionary PGNS-54 located and visually inspected; audio mapping, finer procedure/units and all release locators remain |
| G5 | pending | Minimal IMU/CDU model, validated historical checkpoints and replay |
| G6 | pending | Episode audio production and measured synchronisation |
| G7 | pending | First collection release checks |
| G8 | later | PC+2 evidence/model/content |
| G9 | later | Odyssey CM/uplink content |

Next implementation task: execute Slice 0, then make Slice 1's real-computer browser demo. Do not mark the headless acquisition smoke as G1 passed.

## Implementation update — 15 November 2026

The browser demo source is now in `src/`, with the two runtime binaries copied by hash into `public/`. `npm run assets:verify`, `npm run content:validate`, `npm run replay:verify`, `npm run test`, `npm run build`, and the supplied `node tools/probe_wasm.mjs` pass on this workspace. The DSKY qualification card is explicitly a modern training exercise; Aquarius chapters remain unavailable because G4 evidence is incomplete. No historical content gate has been promoted by this UI work.

Slice 2 update: the panel uses a project-generated, unbranded front-on visual plate with live display, lamp and interaction overlays. The relay decoder receives raw channel 010/011/163 values from the AGC worker; the visible diagnostic trace contains only worker input/output, cycle count, erasable-memory hash and raw erasable words. This advances implementation but does not certify G2 until browser input/load and device checks are run.

Slice 3 update: the DSKY qualification drill now runs on typed scenario phases rather than a checklist alone. It has a worker-cycle scenario clock, cycle-stamped event log, recoverable incorrect entry path, explicit divergence on RSET, restart reset, assistance count and debrief. This does not unlock Aquarius: its real mission content remains held at G4/G5 while procedure evidence, peripheral behaviour and audio alignment are completed.
