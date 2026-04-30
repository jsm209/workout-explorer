function splitCSVLine(line) {
  const result = [], re = /("([^"]*)")|([^,]*)/g;
  let m, last = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index === re.lastIndex && m[0] === '') { result.push(''); re.lastIndex++; continue; }
    result.push(m[2] !== undefined ? m[2] : m[3]);
    last = re.lastIndex;
    if (line[last] === ',') re.lastIndex++;
    else break;
  }
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').map(splitCSVLine);
  const headers = lines[1]; // row 1 = column names
  const workouts = [];
  let current = null;

  for (let i = 2; i < lines.length; i++) {
    const row = lines[i];
    const col0 = (row[0] || '').trim();
    if (!col0) { current = null; continue; }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(col0)) {
      const [m, d, y] = col0.split('/').map(Number);
      const bw = parseFloat((lines[i][1] || '').trim()) || null;
      current = { date: new Date(y, m - 1, d), dateStr: col0, bodyweight: bw, exercises: {} };
      workouts.push(current);
      continue;
    }

    if (!current) continue;
    const setType = isNaN(Number(col0)) ? col0 : 'normal';

    for (let c = 2; c < headers.length; c++) {
      const exName = (headers[c] || '').trim();
      if (!exName) continue;
      const cell = (row[c] || '').trim();
      const match = cell.match(/^(\d+(?:\.\d+)?)x(\d+)$/i);
      if (!match) continue;
      const weight = parseFloat(match[1]);
      const reps = parseInt(match[2]);
      if (!current.exercises[exName]) current.exercises[exName] = [];
      current.exercises[exName].push({ set: col0, weight, reps, type: setType });
    }
  }
  return workouts.filter(w => Object.keys(w.exercises).length > 0);
}

function filterByRange(workouts, range) {
  if (range === 'all') return workouts;
  const cutoff = new Date();
  if (range === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else if (range === '6mo') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (range === '3mo') cutoff.setMonth(cutoff.getMonth() - 3);
  return workouts.filter(w => w.date >= cutoff);
}

function getProgressData(workouts, exercise, metric) {
  return workouts.filter(w => w.exercises[exercise]).map(w => {
    const sets = w.exercises[exercise];
    let value;
    if (metric === 'max') value = Math.max(...sets.map(s => s.weight));
    else if (metric === 'e1rm') value = Math.max(...sets.map(s => s.reps > 1 ? s.weight * (1 + s.reps / 30) : s.weight));
    else if (metric === 'volume') value = sets.reduce((a, s) => a + s.weight * s.reps, 0);
    else if (metric === 'reps') value = sets.reduce((a, s) => a + s.reps, 0);
    else if (metric === 'sets') value = sets.length;
    return { date: w.date, dateStr: w.dateStr, value };
  });
}

function getPRs(workouts) {
  const prs = {};
  workouts.forEach(w => Object.entries(w.exercises).forEach(([ex, sets]) => {
    sets.forEach(s => {
      if (!prs[ex] || s.weight > prs[ex].weight || (s.weight === prs[ex].weight && s.reps > prs[ex].reps))
        prs[ex] = { weight: s.weight, reps: s.reps, date: w.dateStr };
    });
  }));
  return prs;
}

function getVolumeByPeriod(workouts, groupBy) {
  const map = {};
  workouts.forEach(w => {
    const d = w.date;
    let key;
    if (groupBy === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    } else {
      const tmp = new Date(d); tmp.setHours(0,0,0,0);
      tmp.setDate(tmp.getDate() + 3 - (tmp.getDay()+6)%7);
      const week1 = new Date(tmp.getFullYear(),0,4);
      const wn = 1 + Math.round(((tmp-week1)/86400000 - 3 + (week1.getDay()+6)%7)/7);
      key = `${tmp.getFullYear()}-W${String(wn).padStart(2,'0')}`;
    }
    if (!map[key]) map[key] = { volume:0, workouts:0, sets:0 };
    map[key].workouts++;
    Object.values(w.exercises).forEach(sets => sets.forEach(s => {
      map[key].volume += s.weight * s.reps;
      map[key].sets++;
    }));
  });
  const keys = Object.keys(map).sort();
  return { labels: keys, data: keys.map(k => map[k]) };
}

function getExerciseVolumes(workouts) {
  const map = {};
  workouts.forEach(w => Object.entries(w.exercises).forEach(([ex, sets]) => {
    if (!map[ex]) map[ex] = 0;
    sets.forEach(s => { map[ex] += s.weight * s.reps; });
  }));
  return Object.entries(map).sort((a,b) => b[1]-a[1]);
}

function parseCategories(lines) {
  const catRow = lines[0], nameRow = lines[1];
  const groups = {};
  let currentCat = 'Other';
  for (let c = 2; c < nameRow.length; c++) {
    const cat = (catRow[c] || '').trim();
    if (cat) currentCat = cat;
    const name = (nameRow[c] || '').trim();
    if (!name) continue;
    if (!groups[currentCat]) groups[currentCat] = [];
    groups[currentCat].push(name);
  }
  return groups; // e.g. { Compound: [...], Accesories: [...] }
}

fetch('workouts.csv')
  .then(r => r.text())
  .then(text => {
    const lines = text.split('\n').map(splitCSVLine);
    window.WORKOUTS = parseCSV(text);
    window.WORKOUTS.sort((a, b) => a.date - b.date);
    window.EXERCISES = [...new Set(WORKOUTS.flatMap(w => Object.keys(w.exercises)))].sort();
    window.EXERCISE_GROUPS = parseCategories(lines);
    document.dispatchEvent(new Event('data-ready'));
  });
