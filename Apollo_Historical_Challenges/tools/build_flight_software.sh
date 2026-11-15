#!/usr/bin/env bash
set -euo pipefail
pack_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="$pack_root/assets/software/virtualagc"
mkdir -p "$pack_root/research/build-logs"
(
  cd "$source_root/yaYUL"
  "${CC:-cc}" '-DNVER="20261115"' -DINSTALLDIR=/usr/local -O2 -o yaYUL ./*.c -lm
) > "$pack_root/research/build-logs/yayul.log" 2>&1
make -C "$source_root/LM131R1" GEN_HTML=no > "$pack_root/research/build-logs/LM131R1.log" 2>&1
make -C "$source_root/Manche72R3" GEN_HTML=no > "$pack_root/research/build-logs/Manche72R3.log" 2>&1
# Make may consider existing outputs up to date; explicitly rerun the reference checks.
python3 "$source_root/Tools/check_buggers.py" "$source_root/LM131R1/LM131R1.bin" "$source_root/LM131R1/LM131R1.buggers"
cmp "$source_root/LM131R1/LM131R1.bin" "$source_root/LM131R1/Luminary131PlusLM131R1ModuleDump.bin"
python3 "$source_root/Tools/check_buggers.py" "$source_root/Manche72R3/Manche72R3.bin" "$source_root/Manche72R3/Manche72R3.buggers"
printf '%s\n' 'PASS: flight builds and upstream reference checks'
