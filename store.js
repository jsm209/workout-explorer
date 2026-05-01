// store.js — workout storage abstraction
// Currently backed by localStorage. To migrate to Supabase:
//   1. Replace the three functions below with Supabase client calls
//   2. Make them async and await them in parse.js and app.js
//   3. The data shape stays identical

const STORE_KEY = 'workout_overrides';

// Returns { [dateStr]: { exercises: { [name]: [{set, weight, reps, type}] } } | null }
// null means the workout was deleted
function storeGetAll() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
  catch { return {}; }
}

// Save or update a workout. Pass null as workout to delete it.
// dateStr: "M/D/YYYY", workout: { exercises: { [name]: [{weight, reps, type}] } } | null
function storeSave(dateStr, workout) {
  const all = storeGetAll();
  if (workout === null) {
    all[dateStr] = null; // tombstone — hides CSV entry
  } else {
    all[dateStr] = workout;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
}

function storeDelete(dateStr) {
  storeSave(dateStr, null);
}

window.Store = { getAll: storeGetAll, save: storeSave, delete: storeDelete };
