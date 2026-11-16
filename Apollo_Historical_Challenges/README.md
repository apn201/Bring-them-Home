# Apollo 13 — Bring Them Home

A fixed-screen HTML5 cockpit game running the Apollo 13 LM131R1 guidance-computer
ROM. One short training sortie leads into five chronological events: platform
transfer, free return, thermal control, PC+2 and the manual correction.

The campaign replaces the previous repeated alignment drills. See
[DESIGN_REVIEW.md](DESIGN_REVIEW.md) for the imagined MicroProse-style critique
and [CAMPAIGN_SOURCES.md](CAMPAIGN_SOURCES.md) for primary sources and model limits.

## Run

Node 22 or newer:

```sh
npm install
npm run dev
```

Open the HTTP address printed by Vite. Automatic hot reload is disabled so source
edits do not erase a player's running computer. Refresh manually for a new build.
The campaign remembers completed chapters; it does not serialize a live CPU.

## Play

- Campaign: choose any event, including skipping training.
- Keyboard: V = VERB, N = NOUN, Enter = ENTR, C = CLR, K = KEY REL, R = RSET,
  Space = held PRO, digits and +/− enter numeric data.
- RCS: Q/E roll; arrow keys pitch/yaw. Hold to fire, then use counterthrust.
- Flight bag: original manual scans and entry-routine reference, with source and
  simulation notes. ACT 30 is PDF page 48 of the activation checklist.
- Radio: reviewed original activation recording or clearly labeled reproduced
  speech for sourced PAD readings. Written repeat and assistance are available.
- Readback: enter the three signed five-digit register values; MARK captures a
  snapshot if the monitored display is moving.
- Engine controls: select throttle, ignite, monitor the burn clock, and shut down.
  The 4× time setting also accelerates physical motion and burn timing.

Original ROM output drives the DSKY. Coarse-alignment motor pulses return through
the encoder interface. Modeled RCS motion also feeds the counters. DPS thrust,
velocity change, mass use and actuator-driven flex are integrated in a reduced
flight model; they are not decorative animations.

This is a development campaign, not a validated full Apollo flight simulator.
Historical PAD values are loaded and read through the real ROM, but a complete
historical P30/P40 checkpoint and orbital/reentry propagation remain unfinished.
The flight bag distinguishes historical reference data, reproduced speech and
authored simulation conditions. Do not interpret a game score as a validated
prediction of crew survival.

## Verify and package

```sh
npm test
npm run content:validate
npm run assets:verify
npm run build
```

Upload the contents of `dist/`, with `index.html` at the ZIP root, to an itch.io
HTML game. Keep the original source/provenance notices with the distribution.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
[SOFTWARE_LOCK.json](SOFTWARE_LOCK.json) and [ASSET_MANIFEST.json](ASSET_MANIFEST.json).

`node tools/cockpit-browser-check.mjs` runs an isolated Windows Edge/CDP playtest
on separate ports and a fresh browser profile. It verifies the manual page,
training/readback, platform alignment, wrong PAD correction, successful and
prematurely stopped burns, moving gimbal readouts, RCS response and embedded
viewport sizing. It never connects to or reloads the player's browser.

Acquired manuals/audio under `assets/documents/`, `assets/audio/` and `research/`
remain local research material. The flight bag links to original scans rather
than repackaging that entire acquisition bundle. Additional original audio cues
still require phrase-level review; browser speech is explicitly labeled.
