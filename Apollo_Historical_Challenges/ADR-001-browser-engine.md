# ADR 001 — browser engine choice

**Status:** accepted for the G0/G1 browser diagnostic only.

The runtime uses the supplied `webAGC/src/yaAGC.wasm`, which identifies itself as `2020-12-24 ddc65e7be`, with its corresponding source snapshot at `assets/software/webAGC-engine-source`. The Apollo 13 LM131R1 ROM is loaded separately and never relabelled as an Apollo 11 ROM.

The worker owns emulation and only sends coalesced channel output to the UI. It uses an input queue boundary (worker messages), a fixed 1,700-step quantum while paced by the browser, and no render-loop timing. The wrapper's old interval loop is not used.

This engine export set provides erasable-memory access but no complete state serialization. The development build therefore implements **exact restart** as a fresh engine instance plus deterministic boot; it does not claim general checkpoint restore. Complete checkpoint serialization and matched native parity remain G1 blockers.

`webAGC` and `webDSKY` are GPL-2.0-or-later; notices and corresponding source inventory remain in the supplied pack. Any public release must retain all required source and licensing material.
