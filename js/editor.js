// js/editor.js — workout entry and edit UI

function openEditor(dateStr) {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(s=>s.classList.remove('active'));
  document.getElementById('tab-edit').classList.add('active');
  initEditor();
  const [m,d,y] = dateStr.split('/');
  document.getElementById('edit-date').value = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  loadWorkoutIntoEditor(dateStr);
}

function initEditor() {
  if(document.getElementById('edit-save-btn')._init) return;
  document.getElementById('edit-save-btn')._init = true;

  document.getElementById('edit-load-btn').addEventListener('click', ()=>{
    const ds = editorDateStr(); if(ds) loadWorkoutIntoEditor(ds);
  });
  document.getElementById('edit-clear-btn').addEventListener('click', ()=>{
    document.getElementById('editor-exercises').innerHTML = '';
    document.getElementById('edit-status').textContent = '';
    document.getElementById('edit-delete-btn').style.display = 'none';
  });
  document.getElementById('edit-add-exercise').addEventListener('click', ()=>addExerciseBlock('',[]));
  document.getElementById('edit-save-btn').addEventListener('click', saveEditor);
  document.getElementById('edit-delete-btn').addEventListener('click', ()=>{
    const ds = editorDateStr(); if(!ds) return;
    if(!confirm(`Delete workout on ${ds}?`)) return;
    Store.delete(ds);
    reloadData();
    document.getElementById('edit-status').textContent = `Deleted ${ds}.`;
    document.getElementById('editor-exercises').innerHTML = '';
    document.getElementById('edit-delete-btn').style.display = 'none';
  });
}

function editorDateStr() {
  const val = document.getElementById('edit-date').value;
  if(!val) return null;
  const [y,m,d] = val.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function loadWorkoutIntoEditor(dateStr) {
  const workout = WORKOUTS.find(w=>w.dateStr===dateStr);
  document.getElementById('editor-exercises').innerHTML = '';
  document.getElementById('edit-status').textContent = workout ? `Loaded ${dateStr}` : `New workout for ${dateStr}`;
  document.getElementById('edit-delete-btn').style.display = workout ? 'inline-block' : 'none';
  if(workout) Object.entries(workout.exercises).forEach(([ex,sets])=>addExerciseBlock(ex,sets));
}

function addExerciseBlock(name, sets) {
  const container = document.getElementById('editor-exercises');
  const div = document.createElement('div');
  div.className = 'editor-exercise';
  div.innerHTML = `
    <div class="editor-exercise-header">
      <input type="text" class="ex-name-input" placeholder="Exercise name" list="exercise-list" value="${name}">
      <button class="btn-remove-ex">✕ Remove</button>
    </div>
    <div class="editor-sets"></div>
    <button class="btn-add-set">+ Add Set</button>`;

  if(!document.getElementById('exercise-list')){
    const dl = document.createElement('datalist');
    dl.id = 'exercise-list';
    dl.innerHTML = EXERCISES.map(e=>`<option value="${e}">`).join('');
    document.body.appendChild(dl);
  }

  div.querySelector('.btn-remove-ex').addEventListener('click', ()=>div.remove());
  div.querySelector('.btn-add-set').addEventListener('click', ()=>addSetRow(div.querySelector('.editor-sets'), null));
  container.appendChild(div);
  (sets.length ? sets : [null]).forEach(s=>addSetRow(div.querySelector('.editor-sets'), s));
}

function addSetRow(container, set) {
  const row = document.createElement('div');
  row.className = 'editor-set-row';
  row.innerHTML = `
    <span class="set-label">#${container.children.length+1}</span>
    <input type="number" class="set-weight" placeholder="lbs" min="0" step="2.5" value="${set?set.weight:''}">
    <span style="color:#b0a498;font-size:.8rem">×</span>
    <input type="number" class="set-reps" placeholder="reps" min="0" step="1" value="${set?set.reps:''}">
    <button class="btn-icon">✕</button>`;
  row.querySelector('.btn-icon').addEventListener('click', ()=>{
    row.remove();
    [...container.querySelectorAll('.set-label')].forEach((l,i)=>l.textContent=`#${i+1}`);
  });
  container.appendChild(row);
}

function saveEditor() {
  const dateStr = editorDateStr();
  if(!dateStr){ alert('Please select a date.'); return; }
  const exercises = {};
  document.querySelectorAll('.editor-exercise').forEach(block=>{
    const name = block.querySelector('.ex-name-input').value.trim();
    if(!name) return;
    const sets = [];
    block.querySelectorAll('.editor-set-row').forEach((row,i)=>{
      const weight = parseFloat(row.querySelector('.set-weight').value);
      const reps   = parseInt(row.querySelector('.set-reps').value);
      if(!isNaN(weight)&&!isNaN(reps)) sets.push({set:String(i+1),weight,reps,type:'normal'});
    });
    if(sets.length) exercises[name] = sets;
  });
  if(!Object.keys(exercises).length){ alert('Add at least one exercise with sets.'); return; }
  Store.save(dateStr, {exercises});
  reloadData();
  document.getElementById('edit-status').textContent = `✓ Saved ${dateStr}`;
  document.getElementById('edit-delete-btn').style.display = 'inline-block';
}

function reloadData() {
  buildWorkouts(window._csvText);
  window.EXERCISES = [...new Set(WORKOUTS.flatMap(w=>Object.keys(w.exercises)))].sort();
  // Invalidate static tabs so they re-render
  ['insights-grid','storyline-content'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.innerHTML='';
  });
  // Destroy all charts so they re-render fresh
  Object.values(_charts).forEach(c=>c.destroy());
  Object.keys(_charts).forEach(k=>delete _charts[k]);
  renderStats();
  const activeTab = document.querySelector('.tab.active')?.dataset.tab;
  if(activeTab && activeTab !== 'edit') renderTab(activeTab);
}
