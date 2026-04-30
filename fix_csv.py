"""
CSV CORRECTION SCRIPT
=====================
Run this after importing a new version of "Workout Log - weight training.csv".

KNOWN DATA ISSUES:
------------------
1. Dumbell Flys — from 2/13/2024 onward, weights were accidentally logged as
   TOTAL weight (both dumbbells combined) instead of PER HAND weight.
   Fix: halve all Dumbell Flys weights from 2/13/2024 onward.
   (Earlier entries, e.g. 30x10 in 2022-2023, are already correct per-hand.)

2. "single leg squat (Smith, each side)" — the comma in the name is quoted in
   the CSV and must be parsed with a proper CSV reader (not a naive split(',').
   The website's parse.js already handles this correctly.

HOW TO RUN:
-----------
    python3 fix_csv.py

It will print what it changed and is safe to re-run (idempotent — won't
double-halve already-corrected values because it only touches entries >= the
cutoff date that are above a threshold weight, see ALREADY_CORRECTED_THRESHOLD).
"""

import csv, re, os

CSV_PATH = os.path.join(os.path.dirname(__file__), "workouts.csv")

CORRECTIONS = [
    {
        "exercise": "Dumbell Flys",
        "from_date": (2024, 2, 13),   # (year, month, day)
        "action": "halve",
        # Only halve if weight is above this — values already corrected are ~15-35 lbs.
        # If a future entry is legitimately 60+ lbs per hand, remove this guard.
        "only_if_above": 45,
    },
]

def parse_date(s):
    parts = s.split('/')
    return (int(parts[2]), int(parts[0]), int(parts[1]))

def fmt_weight(w):
    return str(int(w)) if w == int(w) else str(w)

rows = []
with open(CSV_PATH, newline='') as f:
    rows = list(csv.reader(f))

headers = rows[1]
total_changed = 0

for rule in CORRECTIONS:
    col = next((i for i, h in enumerate(headers) if h.strip() == rule["exercise"]), None)
    if col is None:
        print(f"WARNING: column '{rule['exercise']}' not found — skipping.")
        continue

    date = None
    changed = 0
    for row in rows[2:]:
        col0 = (row[0] if row else '').strip()
        if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', col0):
            date = col0
        if not date or col >= len(row) or not row[col].strip():
            continue
        m = re.match(r'^(\d+(?:\.\d+)?)x(\d+)$', row[col].strip(), re.I)
        if not m:
            continue
        w, r = float(m.group(1)), m.group(2)
        if parse_date(date) >= rule["from_date"]:
            if rule["action"] == "halve" and w > rule.get("only_if_above", 0):
                new_w = w / 2
                print(f"  {rule['exercise']} {date}: {row[col]} -> {fmt_weight(new_w)}x{r}")
                row[col] = f"{fmt_weight(new_w)}x{r}"
                changed += 1

    print(f"{rule['exercise']}: {changed} cells corrected.")
    total_changed += changed

if total_changed:
    with open(CSV_PATH, 'w', newline='') as f:
        csv.writer(f).writerows(rows)
    print(f"\nSaved. {total_changed} total cells updated.")
else:
    print("\nNo changes needed — CSV looks clean.")
