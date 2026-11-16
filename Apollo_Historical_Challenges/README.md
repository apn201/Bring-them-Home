# Apollo 13 — Bring Them Home

A fixed-screen HTML5 cockpit game running the Apollo 13 LM131R1 and reconstructed
Manche72R3 command-module ROMs. One training sortie leads into eight events:
platform transfer, free return, thermal control, PC+2, a battery warning, manual
correction, final RCS correction, and CM-only entry.

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
  Fine control starts enabled. Vibration and sound have separate controls.
- Flight bag: original manual scans and entry-routine reference, with source and
  simulation notes. ACT 30 is PDF page 48 of the activation checklist.
- Radio: the reviewed original activation recording is bundled as a 48-second
  clip. Other instructions use written comms cards; browser speech was removed.
- Readback: enter the three signed five-digit register values; MARK captures a
  snapshot if the monitored display is moving.
- Engine controls: select throttle, ignite, monitor the burn clock, and shut down.
  The 4× time setting also accelerates physical motion and burn timing.
- Entry: follow the explicitly labeled MODEL BANK GUIDE using Q/E and
  counterthrust. Slow time while maneuvering; entry also offers 16×.
- Master alarm: acknowledge to silence it; the underlying fault lamp remains.
- Fast typing is buffered for the real ROM. Wait for its response. A mismatched
  PAD stays at verification until corrected or explicitly accepted as a
  deviation. Blank/zero/malformed ignition time cannot authorize a firing.

Original ROM output drives the DSKY. Coarse-alignment motor pulses return through
the encoder interface. Modeled RCS motion also feeds the counters. DPS thrust,
velocity change, mass use and actuator-driven flex are integrated in a reduced
flight model; they are not decorative animations.

This is a development campaign, not a validated full Apollo flight simulator.
Historical PAD values are loaded and read through the real ROM, but a complete
historical P30/P40 checkpoint and complete orbital propagation remain unfinished.
The entry level uses a separate reduced lifting-entry model, not restored
P61–P67 or validated reentry guidance. The flight bag distinguishes source data and
authored simulation conditions. Do not interpret a game score as a validated
prediction of crew survival.

## Verify and package

```sh
npm test
npm run content:validate
npm run assets:verify
npm run package:game
```

`release/apollo13-html5.zip` contains only runtime files and required notices,
with `index.html` at the root. No source maps, development files, research,
dependencies or deployment instructions are inside. The SHA-256 and build
inventory sit next to the ZIP. For itch.io choose HTML Game, upload this ZIP and
enable click-to-play/fullscreen (or a 1280×720 or larger desktop embed).
The same ZIP works on Apache at a root or subpath. Use
[OPENCLAW_DEPLOY_PROMPT.md](OPENCLAW_DEPLOY_PROMPT.md) for the Rocky Linux deployment.
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
still require phrase-level review. Only manual/source links require an internet
connection; the reviewed radio clip and all gameplay assets are bundled.
