# Research handover

15 November 2026. This file separates observations made while assembling the pack from future implementation requirements.

## Verified during preparation

- Upstream sparse snapshot resolved to the commit in SOFTWARE_LOCK.json. Mission source directories are explicitly labelled as the final Apollo 13 LM and CM programs in their source headers.
- Both programs were assembled with yaYUL and upstream `--parity` arguments. LM131R1 passed bank checks and byte comparison against the supplied reconstructed/dumped reference. Manche72R3 passed upstream bank checks. Retained logs include upstream LM assembler warnings about bank/storage boundaries; the final reference checks passed. No warnings were silently edited out.
- Bundled webAGC WASM imports/exports were inspected with Node's WebAssembly API. Its version export reports `2020-12-24 ddc65e7be`, consistent with the full commit reported by the wrapper README. The corresponding fork at that commit is included under `assets/software/webAGC-engine-source`.
- The headless acquisition probe loads each newly built Apollo 13 ROM, advances 100,000 requested engine steps and sees output. Two fresh-instance runs match for each ROM. See research/wasm-smoke.json. This does not establish browser behaviour, correct startup conditions, DSKY input, historical state, native parity or complete restore.
- NASA short audio sample decodes as 17.110208 seconds. No procedure episode audio has been cut or time-aligned.
- The source archive metadata identifies the NASA collection, digitisation by the Houston Audio Control Room and a Public Domain Mark URL. Individual tape/GET mappings remain unresolved.

## Visually inspected primary pages

| Source asset ID | PDF page | Printed page | Observation |
| --- | --- | --- | --- |
| lm-activation-checklist | 48 | ACT 30 | Docked IMU coarse alignment worksheet and V41 N20 operation |
| lm-gn-dictionary | 75 | PGNS-54 | V41 N20 loads O/I/M ICDU angles with .01-degree display resolution; coarse alignment behaviour and error reference |
| air-ground-transcript | 189 | 182 | GET 058:02:26 V41/N20 and first coarse angle |
| air-ground-transcript | 190 | 183 | Following entries, CM angle/calibration report and later ground arithmetic confirmation |

The activation PDF is image-only: `pdftotext` produces essentially no content. Render pages and inspect/OCR them rather than assuming the file has no information. Several pages are sideways; rotate for inspection/OCR as appropriate. The source scans are research originals, not ready-made responsive game UI.

### Coarse-angle worksheet

The ACT-30 worksheet gives, in its indicated O/I/M order:

- LM outer = wrap360(300 degrees − CM outer + roll calibration).
- LM inner = wrap360(180 degrees + CM inner).
- LM middle = wrap360(360 degrees − CM middle).

Using the reported candidates 355.57 / 167.78 / 351.87 degrees and calibration −2 degrees gives 302.43 / 347.78 / 8.13 degrees. This is a source-derived calculation cross-check, not a fitted general-purpose spacecraft transform. The worksheet also marks operating-region constraints. Confirm their interpretation and the complete frame conventions before using this relationship outside the episode's documented configuration. Store hundredths of a degree as integers for this entry worksheet, while preserving the emulator's actual angle representation separately.

The NASA printed transcript around the third entry is poor/ambiguous; do not let OCR alone establish the spoken number. The calculation supports 8.13, but listening remains a G4 requirement.

The dictionary's noun table gives N93 gyro torqueing angles at .001-degree resolution. The transcript's spoken/written fine-alignment strings (e.g. +003.30) need an explicit source-grounded interpretation before converting them into five digit DSKY entries. Do not reuse the coarse .01-degree entry converter.

### Event windows

Coarse chapter research target is about 058:00–058:07:15 GET. Early V41 completion is reported at about 058:05:19; ground arithmetic confirmation comes later around 058:07:11. A chapter may end at a selected stage, but must label an authored cutoff as a scenario boundary, not a physical deadline.

Fine-alignment research target around 058:44–058:46. The mission interval between coarse and fine steps should be an explicit chapter jump, preserving both real epochs. PC+2's final maneuver instructions differ from earlier provisional values. Odyssey's earlier checklist read-up is not the time the later restart actually occurs.

## Source registry

Primary code and operation references:

- https://github.com/virtualagc/virtualagc
- https://github.com/michaelfranzl/webAGC
- https://github.com/michaelfranzl/virtualagc/tree/ddc65e7bed41f1301921b934fcbaaee93db99dda
- https://www.ibiblio.org/apollo/developer.html — engine/peripheral interfaces and channel protocol
- https://www.ibiblio.org/apollo/links2.html — source programme provenance and operations-document catalogue
- See ASSET_MANIFEST.json for exact acquired PDF URLs and checksums.

Research navigation and event cross-checks (do not redistribute their editorial prose without clearance):

- https://apollojournals.org/afj/ap13fj/09day3-lifeboat.html
- https://apollojournals.org/afj/ap13fj/13day4-leaving-moon.html
- https://apollojournals.org/afj/ap13fj/23day6-thereactivationchecklist.html
- https://apollojournals.org/afj/ap13fj/27day6-odysseyresurrected.html
- https://apollojournals.org/afj/ap13fj/19day5-themanualcoursecorrection.html
- https://apollojournals.org/afj/ap13fj/a13-documents.html
- https://apolloinrealtime.org/13/

Media sources/guidelines:

- https://www.nasa.gov/historical-sounds/
- https://www.nasa.gov/nasa-brand-center/images-and-media/
- https://archive.org/details/Apollo13Audio
- https://www.apollojournals.org/alsj/alsj-ApolloAudio.html

## Remaining research gates

1. Audio tape/track identities, clean cuts, GET mapping, listening review, independently checked subtitles and credits.
2. Complete coarse/fine initial conditions, peripheral channel/bit protocol and response timing.
3. Fine-alignment raw value scaling/entry sequence and the exact endpoint to show the operation complete.
4. Checkpoint reconstruction and native/browser parity from matched emulator revisions.
5. Primary DSKY photographs/drawings for exact physical layout and CM/LM label differences. No panel photography has yet been downloaded.
6. Final PC+2 and Odyssey datasets, switch scope, physical model and source-supported timing limits before their implementation gates.

## Acquisition issue resolved

An earlier guessed NASA mission-operations report URL returned 404. The acquired replacement is the verified original report hosted at the Apollo journals archive; the current acquisition script and manifest use that source. No failed placeholder PDF is included. The original report is research material, not Flight Journal editorial commentary.
