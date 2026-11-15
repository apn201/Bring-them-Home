#!/usr/bin/env python3
"""Check acquired references, flight binaries, and locked software identity files."""
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'ASSET_MANIFEST.json').read_text())
lock=json.loads((root/'SOFTWARE_LOCK.json').read_text())
failed=[];count=0
rows=[r for r in manifest['assets'] if r.get('status')=='downloaded']
rows += lock['binary_artifacts']
for source in lock['sources']:
 rows+=source['identity_files']
for row in rows:
 p=root/row['path'];count+=1
 if not p.is_file(): failed.append(f"missing: {row['path']}");continue
 if hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:failed.append(f"hash mismatch: {row['path']}")
for row in manifest['assets']:
 if row.get('status')!='downloaded':failed.append(f"not acquired: {row['id']}")
if failed:
 print('\n'.join(failed));sys.exit(1)
print(f'PASS: {count} acquired/locked files verified')
