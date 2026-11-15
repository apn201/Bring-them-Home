# Apollo Historical Challenges — build and asset starter pack

A set of scientifically grounded browser mini games about carrying out real Apollo procedures. No free flight. Original guidance software, original communications, short historical episodes, training and repeatable attempts.

**Start here:** [BUILD_SPEC.md](BUILD_SPEC.md). For a ready-to-paste implementation request, use [CODEX_START_PROMPT.md](CODEX_START_PROMPT.md).

## Contents

| File / directory | Purpose |
| --- | --- |
| BUILD_SPEC.md | Technical contracts, historical corridor rules and ten gated implementation slices |
| GATES.md | Honest starting ledger: acquisition complete, application gates pending |
| ASSET_MANIFEST.json | Acquired files, provenance, sizes and SHA-256 hashes |
| SOFTWARE_LOCK.json | Exact source revisions, binary identities and validation scope |
| RESEARCH_NOTES.md | Verified findings, page locators, alignment worksheet and unresolved work |
| AUDIO_PLAN.md | Acquired sample, archive catalogue and episode audio workflow |
| THIRD_PARTY_NOTICES.md | Provenance and redistribution notes |
| assets/software/ | Apollo 13 source/ROMs, native engine, browser candidate and corresponding older engine source |
| assets/documents/ | Primary checklists, dictionaries, pad loads, reports and original NASA transcripts |
| assets/audio/ | One short NASA audio sample; no episode tracks yet |
| research/ | Build logs, WASM smoke result, original audio catalogue and draft evidence seeds |
| tools/ | Reacquisition, assembly, hashing and headless WASM smoke tools |

This is not a playable app. The historical checkpoints, IMU model, DSKY graphics and episode audio alignment are defined work for Codex. No modern Flight Journal editorial pages or whole Apollo in Real Time media collection are bundled.

## Development console

The repository now contains a development browser console at `src/`. It runs the supplied Apollo 13 LM131R1 ROM in a Web Worker and passes the genuine output relay words to the DSKY component. The one available episode is a clearly labeled **DSKY Qualification** training exercise, not a historical scenario. Aquarius alignment cards remain locked until their evidence gates are passed.

Requires Node 22 or newer (this build was made with Node 24.14.1):

```bash
npm install
npm run dev
```

Before packaging, run:

```bash
npm run assets:verify
npm run content:validate
npm run replay:verify
npm run test
npm run build
```

`npm run build` writes the static site to `dist/`. See `ADR-001-browser-engine.md` and `GATES.md` for the non-release limitations, especially the lack of complete checkpoint serialization and native/browser parity evidence.

## Verified preparation

- Both Apollo 13 flight programs assemble successfully.
- LM131R1 matches the archived reference binary byte for byte and passes upstream bank checks.
- Manche72R3 passes upstream bank checks.
- The acquired WASM engine loads both binaries and gives repeatable output/state hashes across two fresh headless instances per ROM. This is a narrow acquisition smoke, not browser/native/historical validation.
- Asset hashes and locked source identity files verify.

## Use

Extract the archive, open this folder in Codex, and give it CODEX_START_PROMPT.md. It should build the first collection through G7: tutorial plus coarse/fine alignment chapters. G8/G9 describe later PC+2 and Odyssey expansions.

### Verify without network

Requires Python 3.10+, a C compiler, make, cmp and Node with WebAssembly support. The preparation environment used the versions in research/toolchain.json. No npm install is needed for the supplied acquisition probes.

```bash
python3 tools/verify_assets.py
bash tools/build_flight_software.sh
node tools/probe_wasm.mjs
```

The source snapshots omit `.git` and platform-specific assembler executables. `build_flight_software.sh` builds the assembler locally. The flight ROMs, upstream reference images and source are included. The original initial build logs are retained; rebuild logs are separate.

`tools/acquire_assets.py` reacquires the manifest's document/audio references if absent. It uses Python standard library, timeouts and source checks and preserves extra catalogue entries. Existing files are hash-checked by verify_assets.py rather than silently replaced. The full audio archive is not downloaded by this script. Source snapshots are pinned; do not update them to latest while reproducing the baseline.

### Timing and audio warning for implementers

The one acquired MP3 is a 17.11-second introductory sample. Do not use it as procedure audio. Original archive metadata is included, but tape/GET offsets and episode cuts are still unresolved. A downloaded PDF or catalogue entry is not proof that a historical level is ready to release.

### Scope discipline

The first milestone is real Apollo 13 LM code accepting browser input. The first playable collection is tutorial plus two alignment chapters. A historical scenario boundary may end an attempt to keep it aligned with records; do not call such a boundary a physical spacecraft failure without evidence.
