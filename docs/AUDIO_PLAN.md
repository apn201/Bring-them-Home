# Audio acquisition and alignment plan

## Campaign implementation update — 16 November 2026

The activation cue is now user-reviewed and playable: `414-AAA_TRACK-1.mp3`,
05:07:32–05:08:20, anchored to PAO line 14230 at 05:07:40. See
`CAMPAIGN_SOURCES.md`. This supersedes the older unresolved coarse-audio row below.

Browser speech has been removed. ElevenLabs skills were available, but neither
a connected generation tool nor a local API key was available in this session;
the user's fallback is written comms plus the one reviewed original cue.
`public/audio/aquarius-v41-n20.mp3` is a lossless MP3-frame cut of that original,
48.013 seconds, within 0.023 seconds of the reviewed source boundaries.
`tools/extract-reviewed-cue.mjs` records the extraction procedure. Local playback
starts at zero, while original source timestamps remain in the cue metadata.
Burn/RCS rumble and documented alarm frequencies are locally reconstructed
effects, not authentic recordings. Sound can be muted and vibration disabled.

## Acquired

- `assets/audio/houston_problem_nasa.mp3`: NASA Historical Sounds sample, 17.110208 seconds according to ffprobe. Source and SHA-256 are in ASSET_MANIFEST.json. Intended for optional introduction/technical audio plumbing only; it is not any playable scenario's procedure track.
- `research/archive_Apollo13Audio_metadata.json`: original Internet Archive catalogue response for `Apollo13Audio`, downloaded 15 November 2026. It identifies the NASA collection, Houston Audio Control Room digitisation, uploader attribution and Public Domain Mark link. Metadata is evidence of source provenance, not a blanket legal conclusion about every derivative elsewhere.
- Original NASA air-to-ground and CM onboard transcript PDFs are included for cross-checking. These are different sources with potentially different recorded content.

## Located but not downloaded/aligned

Original catalogue: https://archive.org/details/Apollo13Audio

Metadata endpoint: https://archive.org/metadata/Apollo13Audio

The catalogue contains many large tape/track MP3s. Download only files actually containing the required interval after resolving tape labels to GET. Do not blindly download the entire archive. Archive file names alone do not prove which recording contains a call.

Archive discovery source: https://www.apollojournals.org/alsj/alsj-ApolloAudio.html

Research timeline: https://apolloinrealtime.org/13/

Editorial restoration, synchronisation, transcripts and website assets from modern projects require their own provenance/permission checks. Prefer the NASA source catalogue for distributable audio. Do not scrape the modern site's whole media collection.

## Episode acquisition sheet

| Episode | Research GET range | Source file | In/out offsets | Status |
| --- | --- | --- | --- | --- |
| Coarse alignment | roughly 058:00–058:07:15 | unresolved | unresolved | release-blocking |
| Fine alignment | roughly 058:44–058:46 | unresolved | unresolved | release-blocking |
| PC+2 final PAD / burn | select chapters around 077:55 and 079:27 | unresolved | unresolved | later-level gate |
| CMC upload/handover | roughly 140:27–140:43 | unresolved | unresolved | later-level gate |

Ranges above are research targets, not hard historical safe-action deadlines or approved final edit ranges.

## Required workflow

1. Resolve tape/track and audible source type. Check NASA collection metadata; preserve original filename and archive metadata hash.
2. Retrieve only selected masters/derivatives and add byte size, hash, retrieval date and source URL to the manifest.
3. Listen; locate at least three widely separated spoken anchors per continuous segment. A two-point fit can estimate drift; the third helps reveal a bad mapping or an edit. Use piecewise mappings when tape gaps or speed changes invalidate one linear fit.
4. Map source seconds to GET, document residuals/uncertainty, and verify words against the scan and audio. Preserve garbled/uncertain speech honestly.
5. Independently transcribe required subtitle segments. Do not copy the Flight Journal's copyrighted corrections/commentary wholesale.
6. Create approved cuts with ffmpeg, preserving master hashes and edit lists. No pitch/time changes in historical mode. Keep decoded duration and codec delay considerations in alignment checks.
7. Export cue JSON with fixed GET positions and prerequisite states. Separate CAPCOM, player-role speech, other crew, onboard and ground-loop context.
8. If player-role acknowledgements are omitted, document this edit and never replace them with cloned speech. Do not omit ground instructions to make the game easier without labelling an abridged mode.
9. Before release, compare a full successful run against the original continuous recording and test late/failed runs before incompatible confirmations.

No audio in the pack currently satisfies these episode alignment gates. This is deliberate inventory honesty, not an instruction to use silence or the short sample in the final historical levels.
