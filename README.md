# Workout Explorer

A personal workout tracking dashboard built from a Google Sheets CSV export. Visualizes 4+ years of weight training data.

## Features

- **Progress** — track any exercise over time by max weight, volume, reps, or sets
- **Heatmap** — GitHub-style activity calendar colored by workouts, volume, or sets
- **Volume** — total volume and workout frequency over time, plus top exercises by all-time volume
- **Compare** — overlay two exercises on the same chart
- **PRs** — all-time personal records for every exercise
- **Log** — searchable, filterable workout history

## Data Format

The CSV follows this structure:

```
,,Compound,,,,Accessories,,,,
Date and Set #,Weight,Squat,Bench,...
3/2/2022,,,,,
1,,225x5,135x10,...
2,,275x3,155x8,...
```

Each workout day starts with a date row, followed by numbered set rows where each cell is `weightxreps`.

## Running Locally

Requires a local server (browser security blocks `fetch()` on `file://` URLs):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

Push to a GitHub repo, then enable Pages under **Settings → Pages → Deploy from branch (main)**. The site will be live at `https://<username>.github.io/<repo>/`.
