// js/store.js — workout storage abstraction
// Currently backed by localStorage.
//
// TO MIGRATE TO SUPABASE:
//   1. Replace the three functions below with async Supabase client calls
//   2. Make buildWorkouts() in data.js async and await Store.getAll()
//   3. The data shape stays identical — no other files need to change

const STORE_KEY = 'workout_overrides';

const Store = {
  // Returns { [dateStr]: workout | null }
  // null = tombstone (workout deleted/hidden)
  getAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  },

  // dateStr: "M/D/YYYY"
  // workout: { exercises: { [name]: [{set, weight, reps, type}] } }
  // Pass null to hide/delete a workout
  save(dateStr, workout) {
    const all = this.getAll();
    all[dateStr] = workout; // null = tombstone
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  },

  delete(dateStr) {
    this.save(dateStr, null);
  }
};
