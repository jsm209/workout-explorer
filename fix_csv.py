"""
CSV CORRECTION SCRIPT
=====================
Run this after importing a new version of "workouts.csv".

KNOWN DATA ISSUES:
------------------
1. Dumbell Flys — from 2/13/2024 onward, weights were accidentally logged as
   TOTAL weight (both dumbbells combined) instead of PER HAND weight.
   Fix: halve all Dumbell Flys weights from 2/13/2024 onward.
   (Earlier entries, e.g. 30x10 in 2022-2023, are already correct per-hand.)

2. "single leg squat (Smith, each side)" — the comma in the name is quoted in
   the CSV and must be parsed with a proper CSV reader (not a naive split(',').
   The website's parse.js already handles this correctly.

3. Bodyweight (column B) — only 10 real entries exist (Apr–Nov 2022, range
   138–146 lbs). All other dates were backfilled with a synthetic arc:
     - Mar 2022:  ~140 lbs  (start)
     - Feb 2024:  ~158 lbs  (peak bulk for 1000 lb powerlifting total)
     - Jun 2024:  ~154 lbs  (slight cut after)
     - Apr 2026:  ~170 lbs  (current, height 5'10")
   If you drop in a fresh CSV with new dates, run backfill_bodyweight() below
   to fill any missing bodyweight entries using the same arc. Update the
   ANCHORS dict if the current weight has changed.

HOW TO RUN:
-----------
    python3 fix_csv.py

Safe to re-run — both fixes are idempotent.
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


# ── Bodyweight backfill ────────────────────────────────────────────────────
import datetime, random

# Update the last anchor if current bodyweight has changed.
ANCHORS = {
    '3/2/2022':   140.0,
    '4/18/2022':  143.0,
    '5/12/2022':  145.0,
    '5/29/2022':  146.0,
    '9/16/2022':  139.0,
    '9/18/2022':  140.6,
    '9/30/2022':  141.2,
    '10/30/2022': 138.0,
    '11/1/2022':  139.6,
    '11/11/2022': 138.8,
    '11/18/2022': 139.8,
    '2/1/2024':   158.0,   # peak bulk — 1000 lb powerlifting total achieved here
    '6/1/2024':   154.0,   # slight cut after peak
    '4/29/2026':  170.0,   # ← UPDATE THIS when current weight changes
}

def backfill_bodyweight():
    rows = list(csv.reader(open(CSV_PATH)))
    origin = datetime.date(2022, 3, 2)

    def to_days(s):
        m,d,y = s.split('/'); return (datetime.date(int(y),int(m),int(d)) - origin).days

    anchors = sorted((to_days(k), v) for k,v in ANCHORS.items())

    def interp(d):
        for i in range(len(anchors)-1):
            d0,w0 = anchors[i]; d1,w1 = anchors[i+1]
            if d0 <= d <= d1:
                return w0 + (w1-w0)*(d-d0)/(d1-d0)
        return anchors[-1][1]

    workout_rows = [(i,r[0]) for i,r in enumerate(rows) if r and re.match(r'^\d+/\d+/\d{4}$', r[0].strip())]
    random.seed(42)
    noise, filled = 0.0, 0
    for i, date_str in workout_rows:
        if rows[i][1].strip():
            continue  # already has real or previously filled data, skip
        d = to_days(date_str)
        base = interp(d)
        noise = noise*0.6 + random.uniform(-0.5, 0.5)*0.4
        rows[i][1] = str(round(base + noise, 1))
        filled += 1

    if filled:
        with open(CSV_PATH, 'w', newline='') as f:
            csv.writer(f).writerows(rows)
        print(f"Bodyweight: filled {filled} missing entries.")
    else:
        print("Bodyweight: all entries already present, nothing to fill.")

backfill_bodyweight()
