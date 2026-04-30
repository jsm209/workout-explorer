const COLORS = ['#a78bfa','#34d399','#f59e0b','#60a5fa','#f472b6','#4ade80','#fb923c','#38bdf8'];
const CD = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{labels:{color:'#aaa',boxWidth:12}}, tooltip:{backgroundColor:'#1e1e2e',titleColor:'#fff',bodyColor:'#ccc',borderColor:'#3a3a4a',borderWidth:1} },
  scales:{ x:{ticks:{color:'#666',maxTicksLimit:14},grid:{color:'#1e1e2e'}}, y:{ticks:{color:'#666'},grid:{color:'#222230'}} }
};
const charts = {};
function destroyChart(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }
function populateSelect(id, opts, sel){
  document.getElementById(id).innerHTML = opts.map(o=>`<option value="${o}"${o===sel?' selected':''}>${o}</option>`).join('');
}
function populateExerciseSelect(id, sel){
  const el = document.getElementById(id);
  el.innerHTML = Object.entries(EXERCISE_GROUPS).map(([cat, exs]) => {
    const options = exs.filter(e => EXERCISES.includes(e))
      .map(e => `<option value="${e}"${e===sel?' selected':''}>${e}</option>`).join('');
    return options ? `<optgroup label="${cat}">${options}</optgroup>` : '';
  }).join('');
}

// Tabs
document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  ({progress:renderProgress,heatmap:renderHeatmap,volume:renderVolume,compare:renderCompare,prs:renderPRs,log:renderLog})[btn.dataset.tab]?.();
}));

// Stats
function renderStats(){
  const w = WORKOUTS;
  const sets = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.length,0),0);
  const vol  = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.reduce((c,x)=>c+x.weight*x.reps,0),0),0);
  const yrs  = ((w[w.length-1].date - w[0].date)/(365.25*864e5)).toFixed(1);
  document.getElementById('stats-bar').innerHTML =
    `<div class="stat">Workouts <span>${w.length}</span></div>
     <div class="stat">Sets <span>${sets.toLocaleString()}</span></div>
     <div class="stat">Volume <span>${(vol/1e6).toFixed(2)}M lbs</span></div>
     <div class="stat">Span <span>${yrs} yrs</span></div>
     <div class="stat">Exercises <span>${EXERCISES.length}</span></div>`;
}

// Progress
function renderProgress(){
  const sel = document.getElementById('prog-exercise');
  if(!sel._init){
    sel._init = true;
    populateExerciseSelect('prog-exercise', 'Squat');
    ['prog-exercise','prog-metric','prog-range'].forEach(id=>document.getElementById(id).addEventListener('change',renderProgress));
  }
  const ex = sel.value, metric = document.getElementById('prog-metric').value, range = document.getElementById('prog-range').value;
  const data = getProgressData(filterByRange(WORKOUTS,range), ex, metric);
  const label = {max:'Max Weight (lbs)',volume:'Total Volume (lbs)',reps:'Total Reps',sets:'Sets'}[metric];
  document.getElementById('prog-title').textContent = `${ex} — ${label}`;
  destroyChart('progress');
  charts.progress = new Chart(document.getElementById('progress-chart'),{
    type:'line',
    data:{ labels:data.map(d=>d.dateStr), datasets:[{
      label, data:data.map(d=>d.value),
      borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,0.1)',
      pointRadius:data.length>80?1:3, pointHoverRadius:5, tension:0.3, fill:true
    }]},
    options:{...CD}
  });
}

// Heatmap
const HM = ['#1e1e2e','#3b1f6e','#6d28d9','#a78bfa','#c4b5fd'];
function renderHeatmap(){
  const ySel = document.getElementById('hm-year');
  if(!ySel._init){
    ySel._init = true;
    const years = [...new Set(WORKOUTS.map(w=>w.date.getFullYear()))].sort();
    populateSelect('hm-year', years, String(years[years.length-1]));
    ['hm-year','hm-metric'].forEach(id=>document.getElementById(id).addEventListener('change',renderHeatmap));
  }
  const year = parseInt(ySel.value), metric = document.getElementById('hm-metric').value;
  const dayMap = {};
  WORKOUTS.filter(w=>w.date.getFullYear()===year).forEach(w=>{
    const key = `${w.date.getFullYear()}-${String(w.date.getMonth()+1).padStart(2,'0')}-${String(w.date.getDate()).padStart(2,'0')}`;
    if(!dayMap[key]) dayMap[key]={workouts:0,volume:0,sets:0};
    dayMap[key].workouts++;
    Object.values(w.exercises).forEach(sets=>sets.forEach(s=>{dayMap[key].volume+=s.weight*s.reps;dayMap[key].sets++;}));
  });
  const vals = Object.values(dayMap).map(d=>d[metric]).filter(v=>v>0);
  const maxVal = vals.length ? Math.max(...vals) : 1;
  const colorFor = v => !v ? HM[0] : HM[Math.min(Math.ceil(v/maxVal*(HM.length-1)),HM.length-1)];

  const isLeap = y=>(y%4===0&&(y%100!==0||y%400===0));
  const totalDays = isLeap(year)?366:365;
  const startDay = new Date(year,0,1).getDay();
  const weeks = Math.ceil((startDay+totalDays)/7);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // month label row
  let monthRow = '<div style="display:flex;gap:3px;margin-bottom:4px">';
  let lastMonth = -1;
  for(let w=0;w<weeks;w++){
    const di = w*7-startDay;
    const d = new Date(year,0,1+di);
    const mo = (d.getFullYear()===year && di>=0) ? d.getMonth() : -1;
    monthRow += `<div style="width:13px;font-size:.6rem;color:#555;text-align:center">${mo!==lastMonth&&mo>=0?(lastMonth=mo,MONTHS[mo]):''}</div>`;
  }
  monthRow += '</div>';

  let grid = '<div class="heatmap-grid">';
  for(let w=0;w<weeks;w++){
    grid += '<div class="hm-col">';
    for(let d=0;d<7;d++){
      const di = w*7+d-startDay;
      if(di<0||di>=totalDays){ grid+='<div style="width:13px;height:13px"></div>'; continue; }
      const date = new Date(year,0,1+di);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const info = dayMap[key];
      const val = info?info[metric]:0;
      const tip = info?`${key}: ${info.workouts} workout(s), ${info.sets} sets, ${info.volume.toLocaleString()} lbs`:key;
      grid += `<div class="hm-cell" style="background:${colorFor(val)}" data-tip="${tip}"></div>`;
    }
    grid += '</div>';
  }
  grid += '</div>';

  document.getElementById('heatmap-wrap').innerHTML = monthRow + grid;
  document.getElementById('hm-legend-cells').innerHTML = HM.map(c=>`<div class="hm-legend-cell" style="background:${c}"></div>`).join('');

  const tooltip = document.getElementById('hm-tooltip');
  document.getElementById('heatmap-wrap').querySelectorAll('.hm-cell').forEach(cell=>{
    cell.addEventListener('mousemove',e=>{tooltip.textContent=cell.dataset.tip;tooltip.style.display='block';tooltip.style.left=(e.clientX+12)+'px';tooltip.style.top=(e.clientY-28)+'px';});
    cell.addEventListener('mouseleave',()=>tooltip.style.display='none');
  });
}

// Volume
function renderVolume(){
  if(!document.getElementById('vol-range')._init){
    document.getElementById('vol-range')._init=true;
    ['vol-range','vol-group'].forEach(id=>document.getElementById(id).addEventListener('change',renderVolume));
  }
  const filtered = filterByRange(WORKOUTS, document.getElementById('vol-range').value);
  const {labels,data} = getVolumeByPeriod(filtered, document.getElementById('vol-group').value);
  destroyChart('vol'); destroyChart('freq'); destroyChart('exvol');
  charts.vol = new Chart(document.getElementById('vol-chart'),{type:'bar',data:{labels,datasets:[{label:'Volume (lbs)',data:data.map(d=>d.volume),backgroundColor:'rgba(167,139,250,0.7)',borderRadius:3}]},options:{...CD}});
  charts.freq = new Chart(document.getElementById('freq-chart'),{type:'bar',data:{labels,datasets:[{label:'Workouts',data:data.map(d=>d.workouts),backgroundColor:'rgba(52,211,153,0.7)',borderRadius:3}]},options:{...CD}});
  const exVols = getExerciseVolumes(filtered).slice(0,15);
  charts.exvol = new Chart(document.getElementById('ex-vol-chart'),{
    type:'bar',
    data:{labels:exVols.map(([ex])=>ex),datasets:[{label:'Volume (lbs)',data:exVols.map(([,v])=>v),backgroundColor:exVols.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderRadius:4}]},
    options:{...CD,indexAxis:'y',plugins:{...CD.plugins,legend:{display:false}}}
  });
}

// Compare
function renderCompare(){
  if(!document.getElementById('cmp-ex1')._init){
    document.getElementById('cmp-ex1')._init=true;
    populateExerciseSelect('cmp-ex1','Squat');
    populateExerciseSelect('cmp-ex2','Bench');
    ['cmp-ex1','cmp-ex2','cmp-metric','cmp-range'].forEach(id=>document.getElementById(id).addEventListener('change',renderCompare));
  }
  const ex1=document.getElementById('cmp-ex1').value, ex2=document.getElementById('cmp-ex2').value;
  const metric=document.getElementById('cmp-metric').value, range=document.getElementById('cmp-range').value;
  const filtered=filterByRange(WORKOUTS,range);
  const d1=getProgressData(filtered,ex1,metric), d2=getProgressData(filtered,ex2,metric);
  destroyChart('compare');
  charts.compare = new Chart(document.getElementById('compare-chart'),{
    type:'line',
    data:{datasets:[
      {label:ex1,data:d1.map(d=>({x:d.date,y:d.value})),borderColor:'#a78bfa',pointRadius:2,tension:0.3,fill:false},
      {label:ex2,data:d2.map(d=>({x:d.date,y:d.value})),borderColor:'#34d399',pointRadius:2,tension:0.3,fill:false}
    ]},
    options:{...CD,scales:{x:{type:'time',time:{unit:'month'},ticks:{color:'#666'},grid:{color:'#1e1e2e'}},y:{ticks:{color:'#666'},grid:{color:'#222230'}}}}
  });
}

// PRs
function renderPRs(){
  if(!document.getElementById('pr-search')._init){
    document.getElementById('pr-search')._init=true;
    document.getElementById('pr-search').addEventListener('input',renderPRs);
  }
  const search=document.getElementById('pr-search').value.toLowerCase();
  const prs=getPRs(WORKOUTS);
  document.getElementById('pr-grid').innerHTML = Object.entries(prs)
    .filter(([ex])=>!search||ex.toLowerCase().includes(search))
    .sort((a,b)=>b[1].weight-a[1].weight)
    .map(([ex,pr])=>`<div class="pr-card"><h3>${ex}</h3><div class="pr-weight">${pr.weight} <small>lbs × ${pr.reps}</small></div><div class="pr-date">${pr.date}</div></div>`)
    .join('');
}

// Log
function renderLog(){
  if(!document.getElementById('log-search')._init){
    document.getElementById('log-search')._init=true;
    document.getElementById('log-search').addEventListener('input',renderLog);
    document.getElementById('log-month').addEventListener('change',renderLog);
  }
  const search=document.getElementById('log-search').value.toLowerCase();
  const month=document.getElementById('log-month').value;
  let days=[...WORKOUTS].reverse();
  if(month){ const [y,m]=month.split('-').map(Number); days=days.filter(w=>w.date.getFullYear()===y&&w.date.getMonth()===m-1); }
  if(search) days=days.filter(w=>Object.keys(w.exercises).some(ex=>ex.toLowerCase().includes(search)));
  document.getElementById('log-list').innerHTML = days.slice(0,100).map(w=>{
    const exNames=Object.keys(w.exercises).filter(ex=>!search||ex.toLowerCase().includes(search));
    const body=exNames.map(ex=>{
      const rows=w.exercises[ex].map(s=>`<tr class="lbl-${s.type}"><td>${s.set}</td><td>${s.weight}</td><td>${s.reps}</td><td>${s.weight*s.reps}</td></tr>`).join('');
      return `<div class="ex-block"><h4>${ex}</h4><table class="sets-table"><tr><th>Set</th><th>Weight</th><th>Reps</th><th>Vol</th></tr>${rows}</table></div>`;
    }).join('');
    return `<div class="workout-day"><div class="day-header" onclick="this.nextElementSibling.classList.toggle('open')"><span class="day-date">${w.dateStr}</span><span class="day-summary">${exNames.join(', ')}</span></div><div class="day-body">${body}</div></div>`;
  }).join('');
}

document.addEventListener('data-ready', ()=>{ renderStats(); renderProgress(); });
