# Apollo Historical Challenges — Codex build specification

Version 1.0 • 15 November 2026 • Working title, not final branding

## 1. Product contract

Build a browser collection of short, historically bounded Apollo procedure games. The player attempts the astronauts' real tasks using an authentic Display and Keyboard (DSKY), selected adjacent controls, historical instructions and mission audio. Original AGC flight software executes the computer behaviour. A small scenario-specific spacecraft model supplies its environment.

There is no free flight, alternate return-plan design, complete spacecraft simulation, generative dialogue, voice recognition or account system. Arcade describes short levels and retries; it does not permit invented instrument behaviour, deadlines or physics. A player can make and correct mistakes. Departing beyond the supported historical corridor ends the level, with an honest explanation rather than a fabricated disaster.

Primary target: desktop/laptop with keyboard and headphones. Also support touch on tablets and Android phones with responsive stacked views. No 3D cockpit required. Static hosting, client-side execution, no backend required.

### First releasable scope

1. DSKY qualification: authored training using the real emulator; never described as a historical event.
2. Aquarius — Preserve the platform: Apollo 13 LM coarse alignment from Command Module orientation, followed by a separately checkpointed fine-alignment segment.

PC+2 burn and Odyssey reactivation are subsequent gated content, not prerequisites for the first release. Keep their data interfaces in mind without implementing unused flight physics. A manual correction episode is future cockpit content, not an AGC-controlled burn.

### Fidelity labels

Every scenario lists: original software version; documented event interval; player role; what the environment models; what is reconstructed; what a crew/ground assistant handles. Use `verified`, `reconstructed`, `design-choice`, `unresolved` on development evidence. Only supported claims reach player-facing history notes.

## 2. Starter pack status and source precedence

This pack includes three sparse source snapshots, built flight binaries, a browser WASM candidate with its corresponding engine-source snapshot, primary reference PDFs, one short NASA audio sample, source registries and acquisition/verification tools. It is a research/build pack, not a playable implementation.

Read ASSET_MANIFEST.json, SOFTWARE_LOCK.json, RESEARCH_NOTES.md and AUDIO_PLAN.md before coding. The manifest records the files actually obtained, byte sizes and SHA-256 values. `scenario_ready: false` means acquisition is complete but procedure/rights/timing validation is not. Do not silently promote it to approved production content.

Use this source precedence:

1. Mission-specific operations documents and original flight software for mechanics and procedures.
2. Original air-to-ground/onboard recordings and NASA transcripts for communications.
3. Postflight reports for actual outcomes and corrections.
4. Apollo Flight Journal and Apollo in Real Time as research/navigation aids. Their modern editorial work is not automatically available for redistribution.

If evidence conflicts, record the disagreement and resolve it at the affected gate. Do not quietly pick whichever value makes a test pass. Transcript OCR is not authoritative numeric data; inspect the scan and listen to the original recording.

### Pinned software

- Virtual AGC: see SOFTWARE_LOCK.json for the exact commit; source subset includes yaAGC, yaYUL, Tools, LM131R1 and Manche72R3 plus root build/license files. It is not a complete upstream checkout.
- LM flight software: LM131R1, Apollo 13. Built using upstream parity arguments. Upstream checksum validation and byte comparison against `Luminary131PlusLM131R1ModuleDump.bin` passed during preparation.
- CM flight software: Manche72R3, Apollo 13. Built using upstream parity arguments. Upstream bank-checksum validation passed; this is not a claim of a separate full binary dump comparison.
- webAGC: pinned candidate wrapper and bundled WASM. Its demo binaries are Apollo 11 Luminary099/Comanche055. Do not ship those as Apollo 13.
- Bundled WASM reports an older emulator-fork commit in its README. It is not the same revision as the freshly acquired upstream source. Browser/native comparison must use matching engine revisions or explicitly account for differences.

Known browser-wrapper risks from source inspection: old Wasmer dependencies; direct DOM-era interval scheduling; `configure()` channel masking deserves audit; normal-key release handling is specialised to its demo; no full snapshot API; CPU step units need verification. These are investigation items, not all confirmed defects. Never carry its timing loop into production unchanged.

### Redistribution

Original flight source headers mark the code public domain. Emulator and browser-wrapper code carry GPL terms; preserve notices, corresponding source and reproducible build information when distributing binaries. The recommended project distribution is an open-source GPL-compatible application. Preserve per-file notices; do not label the whole asset pack public domain. The corresponding fork source at the bundled WASM's stated commit is included; verify its rebuild, or replace it with a reproducibly built current engine before public release. NASA source audio/PDFs and third-party typography/editorial material have separate provenance. Review each before publishing; this need not block local development.

## 3. Technical architecture

Use TypeScript, Vite, plain DOM/SVG or a small UI framework chosen once in Slice 0. Prefer plain DOM/SVG for this scope. Use npm lockfiles, Vitest for deterministic core tests and Playwright for browser integration. These are implementation choices, not existing project dependencies. Pin exact installed versions in package-lock.json; use a currently supported Node LTS and document its version. Do not upgrade dependencies mid-slice without cause.

Run the AGC in a dedicated Web Worker. Keep the emulator adapter independent of the view and scenario definitions. UI events go through a timestamped input queue. All displays come from emulator outputs. Scenario logic may monitor computer state through a versioned observer API; it must not draw fictional prompts over the real DSKY.

| Component | Owns | Does not own |
| --- | --- | --- |
| AgcAdapter | ROM load, emulation cycles, channels, reset, complete state persistence | Goals, audio, scores |
| PeripheralModel | Required switches, IMU/CDU response and other scenario-specific equipment | Correct-answer injection |
| DskyDecoder | Relay/channel decoding, blanking, signs, lamps | Mission logic |
| DskyView | SVG/HTML instrument and input affordances | Emulation clock |
| ScenarioRuntime | Phase graph, validated predicates, historical corridor | Rewriting flight routines |
| MissionClock | Authoritative elapsed simulation time and epochs | Display-frame counting |
| AudioDirector | Cue scheduling and alignment to mission clock | Deciding player success |
| EvidenceRegistry | Traceable source locators and confidence | Unreviewed historical claims |
| Debrief | Procedural outcome, assistance and divergence explanation | Invented probability of survival |

### Proposed implementation tree

This tree is the target application layout, not a claim all modules exist in the starter pack.

```text
app/
  src/
    main.ts
    ui/{DskyView,ChecklistView,PanelView,DebriefView}.ts
    agc/{AgcAdapter,WorkerClient,DskyDecoder,KeyCodec}.ts
    agc/agc.worker.ts
    peripherals/{PeripheralModel,ImuModel,SwitchBank}.ts
    runtime/{MissionClock,ScenarioRuntime,InputQueue,EventLog,Checkpoint}.ts
    audio/{AudioDirector,AudioClockMap}.ts
    evidence/{EvidenceRegistry,AssetRegistry}.ts
    scenarios/{types,load,validate}.ts
    styles/
  public/
    wasm/
    roms/
    scenarios/
    audio/
  tests/{unit,integration,replays,browser}/
  package.json
  package-lock.json
  vite.config.ts
content/
  evidence.json
  scenarios/{training,alignment-coarse,alignment-fine,pc2,odyssey}/
    scenario.json
    procedure.json
    audio-cues.json
    evidence.json
    checkpoint.json
    golden-replay.json
    README.md
native/
  reference-runner/
  wasm-shim/
tools/
  acquire_assets.py
  build_flight_software.sh
  verify_assets.py
  [future] validate_content.ts
  [future] export_checkpoint.ts
  [future] compare_replays.ts
assets/                  # research only, never copy wholesale into app/public
research/                # development evidence and build logs
```

## 4. Emulator adapter and clock contract

The following is a required application-facing interface. It is NOT the upstream webAGC API and will require an adapter or C shim.

```ts
type AgcKey = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|
  'VERB'|'NOUN'|'PLUS'|'MINUS'|'ENTR'|'CLR'|'PRO'|'KEY_REL'|'RSET';
interface AgcAdapter {
  load(rom: Uint8Array, identity: RomIdentity): Promise<void>;
  reset(): void;
  advanceCycles(count: number): void;
  setInputChannel(channel: number, value: number, mask: number): void;
  keyTransition(key: AgcKey, down: boolean): void;
  drainOutput(): ChannelEvent[];
  readObserver(symbol: string): number[];
  snapshot(): Uint8Array;
  restore(state: Uint8Array): void;
}
```

Numeric types above are bounded integers at the boundary. Validate ranges. Define channel and mask representations once, displaying octal in diagnostics. Never confuse decimal literals with historical octal addresses. Resolve observer symbols against the selected program's symbol table. Tag maps with ROM hash and fail on a mismatch. No hard-coded anonymous memory offsets in content JSON.

Preserve AGC one's-complement arithmetic, signed zero, word width, overflow behaviour and interpreter operation through the emulator. Human-readable quantities require documented scale factors and frames. Use explicit conversion helpers for decimal DSKY entry, octal entry, double precision, angles, time and masses; test them against source/manual examples. Do not treat every signed five-digit register as the same unit.

### One authoritative clock

Represent simulation time as integer engine cycles plus a rational conversion to seconds/microseconds. Verify what the chosen `cpu_step` counts: a machine cycle is not automatically an executed instruction. Avoid using the wrapper's approximate cycle comment as a timing specification. Capture the actual engine constants and step contract in an ADR.

`GET = scenario epoch + simulation elapsed`, with a separate documented mapping to AGC clock state. Some procedures alter the onboard clock; do not make a clock correction unexpectedly shift scenario/audio deadlines. Support GET beyond 99 hours. Never format 140 hours as a wall-clock date.

At each deterministic scheduling boundary:

1. Apply ordered due external inputs.
2. Advance the engine by a bounded cycle budget.
3. Drain outputs and update peripheral signals using the specified causality/order.
4. Evaluate phase predicates and emit events.
5. Publish a coalesced view snapshot; schedule audio against the same epoch.

Input ordering uses `(cycle, sequenceNumber)` so simultaneous events replay identically. Determine a sufficiently small I/O quantum experimentally; use engine-timed feedback for signals whose response cannot wait for a UI tick. Rendering at 30–60 fps must not determine integration fidelity.

Use monotonic real time only to pace the cycle scheduler. If the device cannot keep up, pause with an explanation. Do not skip simulated cycles to catch up. Browser visibility loss or audio interruption pauses the whole attempt, releases held keys and suspends audio. Resume from a coordinated epoch. Record interruptions and assistance separately in the debrief; no server-side anti-cheat required.

### Checkpoints

A checkpoint must capture all mutable emulator state, including registers, memory, bank state, timers, interrupts, restart bookkeeping, channel latches and pending I/O; plus peripheral state, clock, input queue, scenario phase and audio position. Erasable memory alone is NOT a full checkpoint. A raw copy of WASM linear memory may still omit mutable WASM globals and JavaScript-side queues. Require explicit complete serialization or a fresh-instance deterministic boot+replay recipe.

Tag checkpoint schema, engine version/build, ROM hash, peripheral model version and scenario content hash. Reject mismatches. On restart restore an immutable initial checkpoint into a clean engine/audio instance. A gameplay restart is not the same as pressing the historical RSET key.

## 5. DSKY and controls

Use an inspectable SVG/HTML front panel with real PROG, VERB, NOUN, register fields, signs, blanking and the correct CM/LM annunciator layout. Derive labels and layout from primary photographs/manuals. There is no CRT scanline effect: reproduce the instrument's electroluminescent appearance with restrained glow, legible typography and proper segments. Prefer drawn segment geometry over an unlicensed lookalike font. No generated images required.

Implement every DSKY key even if a scenario uses only some. Allow real computer error responses, then enforce the scenario boundary where required. Keyboard mapping must be documented; physical Enter maps to ENTR, with distinct shortcuts for PRO and KEY REL. Ignore browser key repeat for discrete keys; correctly maintain PRO hold/release. Blur, pause and pointer cancellation release held keys. Serialize rapid presses so events are not overwritten before the AGC receives them. Do not invent a fixed press duration without validating the input interface.

Touch targets at least 44 CSS px, no pinch-zoom suppression across the whole page. On phones show DSKY and checklist in separate stacked areas without shrinking the instrument into an unreadable panel. All controls need text labels, focus indicators and a textual register readout for assistive technologies. Avoid announcing every flashing frame to screen readers.

Checklist text may include original notation alongside a training explanation. Use independently authored instructions derived from cleared primary material. A checklist is available during a historical run: using one is part of the task. Switching to help/step highlights changes the assistance status. No numeric answer randomisation in historical mode; random practice values belong in clearly labelled drills.

## 6. Scenario engine and historical corridor

A scenario is a finite phase graph with semantic conditions. A phase defines prerequisites, available controls, computer/environment expectations, audio cues, completion predicates, divergence predicates and its evidence.

Use a restricted typed predicate language implemented in code, not `eval` or executable strings from JSON. Example predicates: `registerEquals`, `observerWithin`, `switchEquals`, `uplinkComplete`, `allOf`, `anyOf`, `beforeDeadline`. Bounds include units, frame, wrap semantics and evidence status. Unknown predicate fields fail validation.

Every time bound is one of:

- `historical-observation`: a recorded timestamp, not a safety limit;
- `procedural-limit`: supported by a checklist or operations rule;
- `physical-limit`: computed by the validated scoped model;
- `scenario-boundary`: authored limit that keeps this episode aligned with history.

A scenario boundary is acceptable and useful. Label it honestly. Never infer a lethal deadline from the time a historical crew happened to press a key. Strict run timestamps are fixed; do not delay the next historical call to wait for the player. If the required state is missing before an incompatible fixed cue, terminate before the misleading cue plays. Training may pause at authored boundaries and must make that visible.

### Outcomes and recovery

- `success`: required end state reached within the supported corridor.
- `procedure-failure`: evidence-backed or modelled task failure.
- `historical-divergence`: action/state/time leaves the supported reconstruction.
- `interrupted`: browser/device interruption; recoverable.

An incomplete entry is not automatically a failure. A corrected typo is acceptable. A wrong committed entry may be recoverable until the next meaningful action. Recognise equivalent valid sequences where the source permits them. Do not compare a user's entire raw key list to one mandatory string.

For the first release use completion, assistance used and a short debrief, not arbitrary points for beating the astronauts' time. Show real timing comparisons where known, while keeping inferred boundaries distinct. Failure text identifies the last meaningful action, expected state and source basis; no fake explosion or survival percentage.

### Automation of other roles

Each level assigns one player role (e.g. LM keyboard operator) and lists delegated actions. Historical CM readings may be provided by a crew card or voiced teammate; ground uploads may be applied through a simulated uplink. Keep these actions deterministic. Do not require one player to perform three crew members' concurrent tasks within the original single-role time budget.

## 7. Evidence and content contracts

Required records (JSON plus schema validators):

```ts
interface Evidence {
  id: string;
  sourceAssetId: string; // resolves to ASSET_MANIFEST or source registry
  locator: { pdfPage?: number; printedPage?: string; get?: string;
    sourcePath?: string; symbol?: string; recordingOffsetSec?: number };
  claim: string;          // independently written summary
  status: 'verified'|'reconstructed'|'design-choice'|'unresolved';
  verification: string;
}
interface AudioCue {
  id: string;
  assetId: string;
  getStartUs: number;
  sourceInSec: number;
  sourceOutSec: number;
  role: 'capcom'|'crew'|'onboard'|'ground-loop'|'narration';
  audibility: 'crew-heard'|'context-only';
  evidenceIds: string[];
  clearanceStatus: 'pending'|'approved';
}
```

All IDs, paths, phases and observer maps resolve at build time. No `NaN`, missing source locators, unknown ROMs, negative clip durations or unresolved timing in a released level. Draft research seeds intentionally contain null fields; release validation must reject them. Do not turn null into zero. Evidence conclusions must distinguish verified source facts from intended game design.

Store primary numbers once and derive UI/text from typed data. Preserve uncertainty from scans. Use source page numbers plus PDF page indexes; they can differ. A source file hash makes locators durable.

## 8. Audio pipeline

See AUDIO_PLAN.md. The downloaded NASA clip is a 17.11-second introductory sample, not alignment/PC+2/entry dialogue. It does not make any level audio-complete. The full NASA Apollo13Audio archive catalogue has been acquired as metadata; individual tape files have not been downloaded or aligned.

For each episode: identify the correct air-to-ground/onboard source, record the original filename and hash, map file offsets to GET using several spoken anchors, listen to each needed interval, verify transcript text independently and cut only the required clips. Distinguish spacecraft-audible CAPCOM from internal Mission Control loops. Internal loops are optional contextual material, not instructions the crew heard.

Do not use movie dialogue, modern editorial narration or an astronaut voice clone. Optional original instructor narration must be clearly labelled. Do not add radio effects to source recordings by default. Separate optional ambience from evidence audio.

Use Web Audio after a user Start action. Preload/decode the active segment before starting the mission clock. Map audio output time to simulation epoch; measure drift rather than advancing simulation from `timeupdate`. Pause/restart all scheduled sources atomically. Resume creates new AudioBufferSource nodes at correct offsets, with no repeated old callouts. Prefer contiguous audio segments to avoid tiny edit gaps. Original recorded player-role acknowledgements can conflict with gameplay: mute/omit them in operator mode where appropriate and document edits; offer complete archive playback in a debrief. Never play a recorded confirmation of a successful action if the player has not reached the prerequisite.

Initial engineering targets (design targets, not historical tolerances): audio onset/drift within 100 ms on the desktop reference setup over a 10-minute segment; exact cycle/event replay independent of render rate; fail the historical run rather than silently stretching time. Measure on Android too; actual audio-device latency should be reported separately from scheduling drift.

## 9. First historical level: Preserve the platform

### Structure

A. Coarse alignment: start with the LM computer and IMU already in a validated state suitable for the documented entry. Provide the source CM readings and docking calibration on a crew card; the player performs/records the calculation and operates the LM DSKY. End after coarse alignment is confirmed, before unrelated startup tasks require a full cockpit.

B. Fine alignment: independent checkpoint around the later ground-provided torqueing data. Player copies and loads the data, commands the documented operation and monitors completion. Do not compress the long intervening mission interval into a fake continuous three-minute exchange. Offer an explicit chapter jump.

Initial candidate coarse interval: approximately GET 058:00–058:07:15. This is a content-editing proposal, not a verified deadline. Final interval and fixed audio anchors are Slice 4 outputs. The fine segment is around GET 058:44–058:46; exact cut and ending depend on primary confirmation.

### Research seeds, not executable acceptance data

- Coarse-alignment operation: V41 N20, observed around 058:02:26.
- Historical entered angle candidates: +302.43, +347.78, +008.13 degrees.
- CM reading candidates: 355.57, 167.78, 351.87 degrees; docking roll calibration −2 degrees, discussed around 058:04:03.
- Later fine-alignment torque candidates: +003.30, +024.80, −015.10 in the source's prescribed angular units; do NOT assume their scale equals the coarse degree display. Verify the N93 definition and exact entry procedure in the mission-specific dictionary/software.

The first coarse value occurs on PDF page 189 of the downloaded NASA air-to-ground transcript, continuing onto page 190. The source scan and audio must resolve OCR corruption in the third value. The coarse-alignment procedure appears at PDF page 75 of the downloaded G&N dictionary (printed PGNS-54); the docked worksheet is at PDF page 48 of the activation checklist (printed ACT 30). Source observations are indexed in research/evidence_seed.json.

The acquired ACT-30 worksheet supplies a configuration-specific calculation: LM O = wrap360(300 − CM O + roll calibration), LM I = wrap360(180 + CM I), LM M = wrap360(360 − CM M), in degrees. It reproduces the example above. Establish its complete axis/frame conventions and marked operating-region limits before implementation; do not generalise it into arbitrary flight physics. Test that formula against the example, then against independently generated frame cases. Supply a written coordinate convention and reference diagram before approving numerical accuracy. The activation checklist is acquired, but recording verification and complete model conventions remain content gates; UI and emulator work can continue.

### Peripheral scope

Model only the required IMU/CDU channels and control-state signals. The AGC's commanded coarse/fine changes must produce appropriate sensed feedback. A model that always feeds the expected answer back regardless of player input is invalid. For correct input, the historical checkpoint should converge to the expected display/state. For a wrong value, it must converge differently, remain incomplete, raise an authentic alarm if applicable, or trigger an honest scenario boundary.

The rest of the vehicle holds the historical attitude through explicitly delegated crew control. Attitude drift outside the chosen corridor need not be modelled as full six-degree-of-freedom flight. Document any fixed or replayed external signals and their valid range. A zero-only IMU stub is allowed for an isolated early test, never the final alignment level.

### Acceptance evidence

Successful run, typo+CLR recovery run, wrong sign committed then recovered run where valid, unrecovered incorrect alignment, premature proceed, late action and irrelevant-program selection. Demonstrate actual state change inside the AGC/peripheral model; a checklist tick cannot stand in for it. Match sampled register/annunciator states to the documentation and native reference at specified cycles.

## 10. Later levels

### PC+2

Scope one bounded preparation/burn segment, not the entire two-hour lead-up. Candidate historical anchor: TIG around GET 079:27:38.30; final values, epoch and maneuver updates require original-source verification. Use the final applicable PAD, not the earlier provisional read-up. Separate copying the PAD from values actually keyed into the computer.

Requires mission-specific P30/P40-family procedure verification, engine/ullage controls, mass/configuration data, required IMU/accelerometer response, throttle schedule and a small validated propulsion/trajectory model. Derive expected response from manuals/reports, not movie pacing. Define a documented narrow corridor for timing and maneuver parameters. Stop or restart on large deviation; do not implement arbitrary alternate burns. Report maneuver completion/residuals within supported accuracy, not a claim of predicting splashdown from inadequate physics.

### Odyssey reactivation

Scope a selected CMC startup/uplink/alignment sequence, not every circuit breaker in the whole module. Distinguish the earlier checklist read-up from its later execution. Around GET 140:27 the crew configures P00/Accept for ground uploads; later handover around 140:41 is a useful research anchor. Model telemetry Accept/Block, original CMC behaviour and only the relevant switches. Upload actual verified data through the correct input mechanism. Do not replace uplink with the astronaut typing a long fictional sequence.

Full reentry physics and a two-vehicle simultaneous simulator are out of scope. The LM provides its role through deterministic delegated actions. Startup power-sequencing claims require actual electrical evidence; do not copy dramatic film limits.

## 11. Gated implementation slices

Gates are engineering exit checks, not repeated user permission requests. Work autonomously through passing gates. When evidence or a dependency blocks one gate, record the exact blocker and continue independent preparatory work; never substitute a fake implementation or mark a blocked level releasable. Each slice ends with a small reviewable change, validation output and an updated GATES.md.

### Slice 0 — Reproducible baseline and evidence inventory

**Build:** initialise app repository; choose/pin dependencies; preserve source/license inventory; run pack verification and the supplied flight build; distinguish research-only vs runtime assets. Verify the included corresponding WASM engine source and its build recipe, or choose a reproducible current-engine WASM build. Add content-schema skeleton and GATES.md.

**Gate G0:** hashes verify; both flight programs assemble and upstream checks pass; build tools/versions recorded; sources corresponding to every distributed emulator binary are identified; no Apollo 11 ROM is labelled Apollo 13. Document retained upstream assembler warnings without suppressing them.

**Evidence artifact:** baseline JSON, build logs, source/ROM locks and ADR for engine choice.

### Slice 1 — Real computer in the browser

**Build:** worker adapter, ROM loader and a plain diagnostic output view. Verify WASM imports/exports, actual step units and startup signals. Test a documented idle/program selection and DSKY lamp test using real AGC logic. Establish key press/release semantics. Provide complete checkpoint serialization or deterministic fresh-instance replay restoration.

**Gate G1:** real LM131R1 runs; output events and selected state observations match a native run of the same engine revision at defined cycle checkpoints. Repeating a run yields identical event/state hashes. Restore+continue matches uninterrupted execution. Desktop and Android smoke run succeed. No script-created DSKY success messages.

**Failure policy:** if bundled webAGC fails parity or complete restoration, build a minimal WASM shim around the pinned native engine. Do not reimplement the historical algorithms as a shortcut. Record the API and toolchain needed to reproduce it.

### Slice 2 — Accurate DSKY and input

**Build:** responsive SVG panel, decoder, keys and annunciators, physical-key map, accessible readout. Validate CM/LM differences. Provide a developer trace view outside the player instrument.

**Gate G2:** fixtures cover all relay digit patterns, signs, blanking and lamp bits used; real emulator integration shows correct prompts and errors; fast typing does not drop events; PRO hold/release, blur and touch cancellation work; no rendering-loop effects on timing. Visual inspection at desktop, tablet and phone sizes.

### Slice 3 — Scenario runtime and DSKY qualification

**Build:** typed phase graph, one authoritative clock, outcomes, deterministic event log, restart, training assistance and debrief. Implement an authored tutorial with numeric entry and correction. Use genuine computer responses. Add placeholders only as visibly draft content, excluded from release menus.

**Gate G3:** success, correctable error and divergence work by state predicates; restarts leave no timers/audio/held keys; 30/60/120-Hz rendering and delayed UI frames yield identical simulation results; hidden-tab pause is coherent. Tutorial labelled as training. Complete it using keyboard and touch.

### Slice 4 — Alignment evidence and audio lock

**Build:** verify the acquired activation procedure and its operating-region limits; resolve transform/units; settle exact player role and delegated actions; align original recordings; make scenario-specific source citations and independently authored checklist. Obtain DSKY visual references. Create exact timeline and deadline classifications.

**Gate G4:** no unresolved production numbers, coordinate conventions or audio offsets; record multiple audio anchors and measured mapping residual; clip source/rights status approved for intended distribution; no editorial commentary copied. Every action/time bound has an evidence ID or explicit scenario-boundary label. Numeric examples independently cross-checked.

**Important:** a research seed, a reference URL or the short NASA sample alone does not pass this gate.

### Slice 5 — Alignment peripheral model and first historical game

**Build:** minimal validated IMU/CDU environment, coarse segment and later fine segment, prepared checkpoints and historical golden replay. Add the documented calculation card and procedure controls. Include both correct and incorrect input behaviour.

**Gate G5:** successful replay agrees with native/reference observations; checks include conversions, wraparound and sign errors; required feedback depends on player data; typo recovery accepted; wrong final state rejected; no forced display values or whole-key-string scoring. Every checkpoint restores identically at least across fresh instances of the same build. No need to claim binary compatibility across engine versions.

**Playable milestone:** complete tutorial plus two alignment chapters, even if audio is still separately being polished. It may be internally playable while release waits for G6/G7.

### Slice 6 — Audio, pacing and historical run

**Build:** Web Audio timeline, original cue segments, subtitles, training pauses, strict-run cutoffs and player-role recording edits. Preload one level at a time and keep future downloads out of the critical path.

**Gate G6:** audio follows the approved GET map; 10-minute desktop test meets the stated 100-ms engineering target; seek/restart/pause/unplug/background/resume do not duplicate callouts or let audio and computer clocks separate. Incompatible confirmations never play after failure. Muted/subtitled mode remains usable; Android interruption behaviour tested.

### Slice 7 — Release the first collection

**Build:** level selection, briefings, source/fidelity notes, persistence for progress/settings, credits and static deployment package. Use Apache-compatible relative base paths and documented WASM MIME serving. Cache only content-hashed runtime assets; avoid a service worker in v1 unless offline use is actually needed. Download research PDFs only from an optional references area, not on game startup.

**Gate G7:** clean install/build/test on documented toolchain; Playwright happy path plus recovery/failure/restart paths; representative desktop browsers and Android Chrome checked; keyboard-only navigation; no runtime third-party dependency fetch; complete source/license notices; all released content validates; no draft placeholders or stale checkpoint combinations. Score/medal storage is local only.

**Release boundary:** stop expanding scope when this collection passes. Report completion and actual limitations. Do not automatically start full-flight simulation.

### Slice 8 — PC+2 content expansion

**Entry:** G7 plus a reviewed final maneuver evidence dossier. **Build:** the bounded model/procedure from section 10. **Gate G8:** documented program prompts, engine signals and residuals checked against primary data; missing/late/incorrect values produce supported outcomes; new audio retains fixed chronology; no regressions to alignment. If the required physics exceeds the small model, narrow the playable episode to documented maneuver preparation and label that scope.

### Slice 9 — Odyssey content expansion

**Entry:** G7 and verified CM/uplink evidence. **Build:** CMC startup, selected power/switch controls and the ground-upload handover. **Gate G9:** correct program/clock/data state before and after upload; Accept/Block restrictions authentic; crew vs ground ownership explicit; checklist read-up not mistaken for execution; no invented manual data-entry workload. Re-run shared adapter/audio regression checks once after changes.

## 12. Testing and scientific claims

Use tests for the parts that can invalidate fidelity: decoding, scale/frame conversions, state restoration, clock scheduling, semantic recovery, peripheral feedback, audio sync and native/browser parity. Do not spend the budget on tests that merely duplicate CSS or assert that a hard-coded correct-answer string exists.

Three reference categories must remain distinct:

1. Emulator parity: proves browser and native engines agree for a replay.
2. Procedure fidelity: proves that replay and environment represent the documented operation.
3. Historical outcome agreement: checks available sampled records against results, within stated uncertainties.

Native agreement alone cannot validate invented initial state or physics. A checkpoint is a validated reconstruction, not an exact recovered mission memory dump unless an actual dump is available. Every level publishes a concise fidelity statement listing such limits.

Recommended commands to implement in app/package.json: `dev`, `build`, `test`, `test:browser`, `content:validate`, `replay:verify`, `assets:verify`. They are future required commands; they do not exist yet. Preserve the starter tools' working commands in README.md.

## 13. Codex execution instructions

Read this document and registries first. Work slices in dependency order, keeping each change small enough to inspect. Do not ask for confirmation at every gate. Update GATES.md with pass/fail, exact evidence and the next task. Keep research uncertainties in the affected content dossier. Proceed with independent code work when a source acquisition is pending, but do not claim the level is historically complete.

Never add AI-generated mission instructions, guessed AGC programs, synthetic astronaut voices, arbitrary alarms or safety deadlines to fill evidence gaps. Never replace the real emulator with a scripted DSKY while retaining an authenticity claim. Design the fun through role, framing, audio, useful feedback and repeatable short challenges.

Start with G0 and G1. The first reviewable demo should show the real Apollo 13 LM software responding to browser input and surviving an exact restart. The first release is the tutorial plus alignment chapters.
