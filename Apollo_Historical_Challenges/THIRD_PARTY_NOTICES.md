# Third-party provenance and notices

The pack is a development/research handover. Do not describe it as wholly public-domain material.

## Original flight programmes

The LM131R1 and Manche72R3 source headers mark the original guidance software public domain. The LM source is a modern reconstruction from historical listings and a rope-module dump; the source header distinguishes reconstructed symbol/comment ordering from the verified resulting executable. Preserve the headers and source provenance.

## Virtual AGC and browser port

- https://github.com/virtualagc/virtualagc — exact commit in SOFTWARE_LOCK.json.
- https://github.com/michaelfranzl/webAGC — exact commit in SOFTWARE_LOCK.json.
- https://github.com/michaelfranzl/virtualagc — corresponding bundled WASM source at ddc65e7bed41f1301921b934fcbaaee93db99dda.

Upstream COPYRIGHT/LICENSE/COPYING files and per-file notices are retained in these source directories. The emulator and port generally carry GPL-2.0-or-later terms. The corresponding source snapshot for the old binary is included, but a bit-for-bit WASM rebuild has not been verified. Follow the current build gate before publicly shipping the final application. Imported font assets, demo dependencies and individual source files may have distinct notices: avoid shipping unused demo fonts/assets in the final app.

## NASA historical references and sound

Each acquired file has a source URL and checksum in ASSET_MANIFEST.json. Credit NASA and the relevant originating programme/archive. Some original operation documents were authored by programme contractors; check individual notices instead of applying a single NASA-wide assumption.

NASA media guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/

### DSKY interface photograph

- `public/images/nasa-dsky-f8.jpg` — NASA identifier `362848main_EC96-43408-1`, NASA photo / Dennis Taylor.
- Source record: https://www.dvidshub.net/image/834002/f-8-digital-fly-wire . The record marks the image **Public Domain** and identifies it as the Apollo-derived DSKY used in NASA's F-8 Digital Fly-By-Wire programme.
- The game applies CSS colour treatment and live relay/lamp overlays; those additions are not part of the historical photograph.

Short sample source page: https://www.nasa.gov/historical-sounds/

Audio catalogue: https://archive.org/details/Apollo13Audio . Retrieved metadata attributes digitisation/cataloguing to the Houston Audio Control Room and carries a Public Domain Mark URL. Verify each selected recording before final distribution.

## Research sites

Apollo Flight Journal provides research guidance and hosted copies of original documents. Its modern commentary and corrected transcript are separately copyrighted; they have not been copied wholesale into this pack. Apollo in Real Time's restored media, synchronisation and other modern editorial work likewise require separate provenance checks before reuse. The final app should use cleared original records and independently authored explanatory text.

No movie clips, astronaut voice clones or NASA endorsement claims are included or required.
