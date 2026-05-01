// js/charts.js — all Chart.js render functions

const _charts = {};
function destroyChart(id){ if(_charts[id]){ _charts[id].destroy(); delete _charts[id]; } }

function populateSelect(id, opts, sel){
  document.getElementById(id).innerHTML = opts.map(o=>`<option value="${o}"${o===sel?' selected':''}>${o}</option>`).join('');
}
function populateExerciseSelect(id, sel){
  document.getElementById(id).innerHTML = Object.entries(EXERCISE_GROUPS).map(([cat,exs])=>{
    const opts = exs.filter(e=>EXERCISES.includes(e)).map(e=>`<option value="${e}"${e===sel?' selected':''}>${e}</option>`).join('');
    return opts ? `<optgroup label="${cat}">${opts}</optgroup>` : '';
  }).join('');
}

// ── Progress ───────────────────────────────────────────────────────────────
function renderProgress(){
  const sel = document.getElementById('prog-exercise');
  if(!sel._init){
    sel._init = true;
    populateExerciseSelect('prog-exercise','Squat');
    ['prog-exercise','prog-metric','prog-range'].forEach(id=>document.getElementById(id).addEventListener('change',renderProgress));
  }
  const ex=sel.value, metric=document.getElementById('prog-metric').value, range=document.getElementById('prog-range').value;
  const data = getProgressData(filterByRange(WORKOUTS,range), ex, metric);
  const label = {max:'Max Weight (lbs)',e1rm:'Est. 1RM (lbs)',volume:'Total Volume (lbs)',reps:'Total Reps',sets:'Sets'}[metric];
  document.getElementById('prog-title').textContent = `${ex} — ${label}`;
  const n = data.length;
  destroyChart('progress');
  _charts.progress = new Chart(document.getElementById('progress-chart'),{
    type:'line',
    data:{ labels:data.map(d=>d.dateStr), datasets:[
      { label, data:data.map(d=>d.value), borderColor:'#6a9e6a', backgroundColor:'rgba(106,158,106,0.12)',
        pointRadius:n>80?1:3, pointHoverRadius:5, tension:0.1, fill:true },
      ...(n>=2?[{
        label:'Trend',
        data:data.map((_,i)=>{ const s=(data[n-1].value-data[0].value)/(n-1); return data[0].value+s*i; }),
        borderColor:'rgba(196,124,58,0.6)', borderDash:[6,3], pointRadius:0, tension:0, fill:false
      }]:[])
    ]},
    options:{...CHART_DEFAULTS}
  });
}

// ── Heatmap ────────────────────────────────────────────────────────────────
function renderHeatmap(){
  const ySel = document.getElementById('hm-year');
  if(!ySel._init){
    ySel._init = true;
    const years = [...new Set(WORKOUTS.map(w=>w.date.getFullYear()))].sort();
    populateSelect('hm-year', years, String(years[years.length-1]));
    ['hm-year','hm-metric'].forEach(id=>document.getElementById(id).addEventListener('change',renderHeatmap));
  }
  const year=parseInt(ySel.value), metric=document.getElementById('hm-metric').value;
  const dayMap={};
  WORKOUTS.filter(w=>w.date.getFullYear()===year).forEach(w=>{
    const key=`${w.date.getFullYear()}-${String(w.date.getMonth()+1).padStart(2,'0')}-${String(w.date.getDate()).padStart(2,'0')}`;
    if(!dayMap[key]) dayMap[key]={workouts:0,volume:0,sets:0};
    dayMap[key].workouts++;
    Object.values(w.exercises).forEach(sets=>sets.forEach(s=>{dayMap[key].volume+=s.weight*s.reps;dayMap[key].sets++;}));
  });
  const vals=Object.values(dayMap).map(d=>d[metric]).filter(v=>v>0);
  const maxVal=vals.length?Math.max(...vals):1;
  const colorFor=v=>!v?HM_COLORS[0]:HM_COLORS[Math.min(Math.ceil(v/maxVal*(HM_COLORS.length-1)),HM_COLORS.length-1)];
  const isLeap=y=>(y%4===0&&(y%100!==0||y%400===0));
  const totalDays=isLeap(year)?366:365, startDay=new Date(year,0,1).getDay();
  const weeks=Math.ceil((startDay+totalDays)/7);
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let monthRow='<div style="display:flex;gap:3px;margin-bottom:4px">';
  let lastMonth=-1;
  for(let w=0;w<weeks;w++){
    const di=w*7-startDay, d=new Date(year,0,1+di);
    const mo=(d.getFullYear()===year&&di>=0)?d.getMonth():-1;
    monthRow+=`<div style="width:13px;font-size:.6rem;color:#a0948a;text-align:center">${mo!==lastMonth&&mo>=0?(lastMonth=mo,MONTHS[mo]):''}</div>`;
  }
  monthRow+='</div>';

  let grid='<div class="heatmap-grid">';
  for(let w=0;w<weeks;w++){
    grid+='<div class="hm-col">';
    for(let d=0;d<7;d++){
      const di=w*7+d-startDay;
      if(di<0||di>=totalDays){grid+='<div style="width:13px;height:13px"></div>';continue;}
      const date=new Date(year,0,1+di);
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const info=dayMap[key], val=info?info[metric]:0;
      const tip=info?`${key}: ${info.workouts} workout(s), ${info.sets} sets, ${info.volume.toLocaleString()} lbs`:key;
      grid+=`<div class="hm-cell" style="background:${colorFor(val)}" data-tip="${tip}"></div>`;
    }
    grid+='</div>';
  }
  grid+='</div>';
  document.getElementById('heatmap-wrap').innerHTML=monthRow+grid;
  document.getElementById('hm-legend-cells').innerHTML=HM_COLORS.map(c=>`<div class="hm-legend-cell" style="background:${c}"></div>`).join('');

  const tooltip=document.getElementById('hm-tooltip');
  document.getElementById('heatmap-wrap').querySelectorAll('.hm-cell').forEach(cell=>{
    cell.addEventListener('mousemove',e=>{tooltip.textContent=cell.dataset.tip;tooltip.style.display='block';tooltip.style.left=(e.clientX+12)+'px';tooltip.style.top=(e.clientY-28)+'px';});
    cell.addEventListener('mouseleave',()=>tooltip.style.display='none');
  });
}

// ── Volume ─────────────────────────────────────────────────────────────────
function renderVolume(){
  if(!document.getElementById('vol-range')._init){
    document.getElementById('vol-range')._init=true;
    ['vol-range','vol-group'].forEach(id=>document.getElementById(id).addEventListener('change',renderVolume));
  }
  const filtered=filterByRange(WORKOUTS,document.getElementById('vol-range').value);
  const {labels,data}=getVolumeByPeriod(filtered,document.getElementById('vol-group').value);
  destroyChart('vol');destroyChart('freq');destroyChart('exvol');destroyChart('dow');
  _charts.vol=new Chart(document.getElementById('vol-chart'),{type:'bar',data:{labels,datasets:[{label:'Volume (lbs)',data:data.map(d=>d.volume),backgroundColor:'rgba(106,158,106,0.7)',borderRadius:3}]},options:{...CHART_DEFAULTS}});
  _charts.freq=new Chart(document.getElementById('freq-chart'),{type:'bar',data:{labels,datasets:[{label:'Workouts',data:data.map(d=>d.workouts),backgroundColor:'rgba(196,124,58,0.7)',borderRadius:3}]},options:{...CHART_DEFAULTS}});
  const exVols=getExerciseVolumes(filtered).slice(0,15);
  _charts.exvol=new Chart(document.getElementById('ex-vol-chart'),{type:'bar',data:{labels:exVols.map(([ex])=>ex),datasets:[{label:'Volume (lbs)',data:exVols.map(([,v])=>v),backgroundColor:exVols.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderRadius:4}]},options:{...CHART_DEFAULTS,indexAxis:'y',plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}}}});
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowCounts=Array(7).fill(0);
  filtered.forEach(w=>dowCounts[w.date.getDay()]++);
  _charts.dow=new Chart(document.getElementById('dow-chart'),{type:'bar',data:{labels:DAYS,datasets:[{label:'Workouts',data:dowCounts,backgroundColor:DAYS.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderRadius:4}]},options:{...CHART_DEFAULTS,plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}}}});
}

// ── Compare ────────────────────────────────────────────────────────────────
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
  _charts.compare=new Chart(document.getElementById('compare-chart'),{
    type:'line',
    data:{datasets:[
      {label:ex1,data:d1.map(d=>({x:d.date,y:d.value})),borderColor:'#6a9e6a',pointRadius:2,tension:0.1,fill:false},
      {label:ex2,data:d2.map(d=>({x:d.date,y:d.value})),borderColor:'#c47c3a',pointRadius:2,tension:0.1,fill:false}
    ]},
    options:{...CHART_DEFAULTS,scales:TIME_SCALE}
  });
}

// ── Bodyweight ─────────────────────────────────────────────────────────────
function renderBodyweight(){
  if(!document.getElementById('bw-range')._init){
    document.getElementById('bw-range')._init=true;
    document.getElementById('bw-range').addEventListener('change',renderBodyweight);
  }
  const filtered=filterByRange(WORKOUTS,document.getElementById('bw-range').value).filter(w=>w.bodyweight);
  destroyChart('bw');destroyChart('bwratio');
  _charts.bw=new Chart(document.getElementById('bw-chart'),{
    type:'line',
    data:{labels:filtered.map(w=>w.dateStr),datasets:[{label:'Bodyweight (lbs)',data:filtered.map(w=>w.bodyweight),borderColor:'#c47c3a',backgroundColor:'rgba(196,124,58,0.1)',pointRadius:filtered.length>80?0:2,tension:0.1,fill:true}]},
    options:{...CHART_DEFAULTS}
  });
  const colors=['#6a9e6a','#c47c3a','#5b8fa8'];
  const datasets=['Squat','Bench','Deadlift'].map((ex,i)=>{
    const pts=filtered.filter(w=>w.exercises[ex]).map(w=>({x:w.date,y:Math.max(...w.exercises[ex].map(s=>s.weight))/w.bodyweight}));
    const smoothed=pts.map((pt,idx)=>{const win=pts.slice(Math.max(0,idx-3),idx+1);return{x:pt.x,y:win.reduce((a,p)=>a+p.y,0)/win.length};});
    return{label:ex,data:smoothed,borderColor:colors[i],pointRadius:0,tension:0.2,fill:false};
  });
  _charts.bwratio=new Chart(document.getElementById('bw-ratio-chart'),{
    type:'line',data:{datasets},
    options:{...CHART_DEFAULTS,scales:{...TIME_SCALE,y:{ticks:{color:'#b0a498',callback:v=>v.toFixed(2)+'×'},grid:{color:'#e8e0d4'}}}}
  });
}
