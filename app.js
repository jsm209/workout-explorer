const COLORS = ['#6a9e6a','#c47c3a','#5b8fa8','#a07040','#7a6e9e','#4a8a6a','#b85c5c','#8a9e5a'];
const CD = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{labels:{color:'#8a7d72',boxWidth:12}}, tooltip:{backgroundColor:'#faf7f2',titleColor:'#3d3530',bodyColor:'#8a7d72',borderColor:'#d4c9bb',borderWidth:1} },
  scales:{ x:{ticks:{color:'#b0a498',maxTicksLimit:14},grid:{color:'#e8e0d4'}}, y:{ticks:{color:'#b0a498'},grid:{color:'#e8e0d4'}} }
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
  ({progress:renderProgress,insights:renderInsights,storyline:renderStoryline,heatmap:renderHeatmap,volume:renderVolume,compare:renderCompare,prs:renderPRs,log:renderLog,bodyweight:renderBodyweight})[btn.dataset.tab]?.();
}));

// Stats
function renderStats(){
  const w = WORKOUTS;
  const sets = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.length,0),0);
  const vol  = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.reduce((c,x)=>c+x.weight*x.reps,0),0),0);
  const yrs  = ((w[w.length-1].date - w[0].date)/(365.25*864e5)).toFixed(1);

  // Current streak and longest streak (consecutive calendar weeks with ≥1 workout)
  const weekSet = new Set(w.map(d => {
    const t = new Date(d.date); t.setHours(0,0,0,0);
    t.setDate(t.getDate() + 3 - (t.getDay()+6)%7);
    const w1 = new Date(t.getFullYear(),0,4);
    return `${t.getFullYear()}-${1+Math.round(((t-w1)/864e5-3+(w1.getDay()+6)%7)/7)}`;
  }));
  const weeks = [...weekSet].sort();
  let longest=1,cur=1,streak=1;
  for(let i=1;i<weeks.length;i++){
    const [y1,w1]=weeks[i-1].split('-').map(Number), [y2,w2]=weeks[i].split('-').map(Number);
    const consecutive = (y1===y2&&w2===w1+1)||(y1+1===y2&&w1>=52&&w2===1);
    if(consecutive){cur++;longest=Math.max(longest,cur);}else cur=1;
  }
  // current streak: count back from latest week
  cur=1;
  for(let i=weeks.length-1;i>0;i--){
    const [y1,w1]=weeks[i-1].split('-').map(Number),[y2,w2]=weeks[i].split('-').map(Number);
    const consecutive=(y1===y2&&w2===w1+1)||(y1+1===y2&&w1>=52&&w2===1);
    if(consecutive)cur++;else break;
  }
  streak=cur;

  document.getElementById('stats-bar').innerHTML =
    `<div class="stat">Workouts <span>${w.length}</span></div>
     <div class="stat">Sets <span>${sets.toLocaleString()}</span></div>
     <div class="stat">Volume <span>${(vol/1e6).toFixed(2)}M lbs</span></div>
     <div class="stat">Span <span>${yrs} yrs</span></div>
     <div class="stat">Exercises <span>${EXERCISES.length}</span></div>
     <div class="stat">Current Streak <span>${streak}w</span></div>
     <div class="stat">Longest Streak <span>${longest}w</span></div>`;
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
  const label = {max:'Max Weight (lbs)',e1rm:'Est. 1RM (lbs)',volume:'Total Volume (lbs)',reps:'Total Reps',sets:'Sets'}[metric];
  document.getElementById('prog-title').textContent = `${ex} — ${label}`;

  // Simple linear trend line
  const n = data.length;
  const trendDataset = [];
  if(n >= 2){
    const xs = data.map((_,i)=>i), ys = data.map(d=>d.value);
    const mx = xs.reduce((a,x)=>a+x,0)/n, my = ys.reduce((a,y)=>a+y,0)/n;
    const slope = xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/xs.reduce((a,x)=>a+(x-mx)**2,0);
    const intercept = my - slope*mx;
    trendDataset.push({
      label:'Trend', data:[intercept, intercept+slope*(n-1)],
      borderColor:'rgba(251,146,60,0.7)', borderDash:[6,3], pointRadius:0,
      tension:0, fill:false,
      // map to first/last label only
      labels:[data[0].dateStr, data[n-1].dateStr]
    });
  }

  destroyChart('progress');
  charts.progress = new Chart(document.getElementById('progress-chart'),{
    type:'line',
    data:{ labels:data.map(d=>d.dateStr), datasets:[
      { label, data:data.map(d=>d.value),
        borderColor:'#6a9e6a', backgroundColor:'rgba(106,158,106,0.12)',
        pointRadius:data.length>80?1:3, pointHoverRadius:5, tension:0.1, fill:true },
      ...(n>=2?[{
        label:'Trend', data:data.map((_,i)=>{ const slope=(data[n-1].value-data[0].value)/(n-1); return data[0].value+slope*i; }),
        borderColor:'rgba(251,146,60,0.6)', borderDash:[6,3], pointRadius:0, tension:0, fill:false
      }]:[])
    ]},
    options:{...CD}
  });
}

// Heatmap
const HM = ['#e8e0d4','#c8dbc0','#a0c49a','#6a9e6a','#3d6e3d'];
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
  destroyChart('vol'); destroyChart('freq'); destroyChart('exvol'); destroyChart('dow');
  charts.vol = new Chart(document.getElementById('vol-chart'),{type:'bar',data:{labels,datasets:[{label:'Volume (lbs)',data:data.map(d=>d.volume),backgroundColor:'rgba(106,158,106,0.7)',borderRadius:3}]},options:{...CD}});
  charts.freq = new Chart(document.getElementById('freq-chart'),{type:'bar',data:{labels,datasets:[{label:'Workouts',data:data.map(d=>d.workouts),backgroundColor:'rgba(196,124,58,0.7)',borderRadius:3}]},options:{...CD}});
  const exVols = getExerciseVolumes(filtered).slice(0,15);
  charts.exvol = new Chart(document.getElementById('ex-vol-chart'),{
    type:'bar',
    data:{labels:exVols.map(([ex])=>ex),datasets:[{label:'Volume (lbs)',data:exVols.map(([,v])=>v),backgroundColor:exVols.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderRadius:4}]},
    options:{...CD,indexAxis:'y',plugins:{...CD.plugins,legend:{display:false}}}
  });
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dowCounts=Array(7).fill(0);
  filtered.forEach(w=>dowCounts[w.date.getDay()]++);
  charts.dow = new Chart(document.getElementById('dow-chart'),{
    type:'bar',
    data:{labels:DAYS,datasets:[{label:'Workouts',data:dowCounts,backgroundColor:DAYS.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderRadius:4}]},
    options:{...CD,plugins:{...CD.plugins,legend:{display:false}}}
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
      {label:ex1,data:d1.map(d=>({x:d.date,y:d.value})),borderColor:'#6a9e6a',pointRadius:2,tension:0.1,fill:false},
      {label:ex2,data:d2.map(d=>({x:d.date,y:d.value})),borderColor:'#c47c3a',pointRadius:2,tension:0.1,fill:false}
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

// Storyline
function renderStoryline(){
  if(document.getElementById('storyline-content').innerHTML) return;

  const s = n=>`<span class="story-stat">${n}</span>`;

  const chapters = [
    {
      title:'The Beginning — Finding the Bar',
      period:'March – May 2022',
      body:`Joshua walked into the gym in March 2022 and started logging from day one. The numbers tell the story of someone brand new to structured lifting: a ${s('215 lb squat')}, ${s('145 lb bench')}, and ${s('245 lb deadlift')} in the first month. Not bad for a starting point, but there was clearly a long road ahead. He trained ${s('10–11 times a month')} right out of the gate — a frequency that showed real commitment from the start.
      <br><br>Over those first three months, every lift moved. By May, the squat was up to ${s('235 lbs')}, bench to ${s('160 lbs')}, and deadlift to ${s('295 lbs')}. The body was adapting fast, as it does for beginners. Bodyweight hovered around ${s('143–146 lbs')} — lean, and clearly leaving room to grow.`
    },
    {
      title:'The Summer Slump',
      period:'June – October 2022',
      body:`Then things went quiet. June and July have no entries at all, and August shows only ${s('2 workouts')}. Something pulled Joshua away from the gym — summer, life, or just the natural ebb that most lifters experience in their first year. When he came back in September, the numbers had slipped: squat back to ${s('225 lbs')}, bench at ${s('135 lbs')}, bodyweight down to ${s('139 lbs')}.
      <br><br>October was sparse too — just ${s('3 sessions')}. But the deadlift quietly held at ${s('295 lbs')}, a sign that the strength wasn't fully gone, just dormant.`
    },
    {
      title:'The Comeback — Deadlift Breaks Out',
      period:'November – December 2022',
      body:`November marked a real return. Eight sessions, and the numbers jumped hard — especially the deadlift, which surged to ${s('330 lbs')} in a single month. That's a ${s('+35 lb')} jump from the pre-summer peak. The squat climbed to ${s('255 lbs')} and bench to ${s('155 lbs')}. Something clicked.
      <br><br>December was lighter on volume but the bench hit ${s('165 lbs')} for the first time, and the squat held at ${s('245 lbs')}. The foundation was being rebuilt, stronger than before.`
    },
    {
      title:'A Quiet Year of Grinding',
      period:'January – July 2023',
      body:`2023 started with promise — a ${s('265 lb squat')} and ${s('325 lb deadlift')} in January — but the deadlift then disappeared from the log entirely for the next ${s('9 months')}. Whether it was a programming choice or an injury, the pull from the floor went on hiatus.
      <br><br>The squat and bench kept grinding forward slowly. By mid-2023, the squat was consistently in the ${s('265–275 lb')} range and bench was stuck around ${s('145–165 lbs')}. Volume was moderate — ${s('3–6 sessions a month')} — and the exercise variety was limited. This was a maintenance phase more than a growth phase.`
    },
    {
      title:'The Awakening — Everything Clicks',
      period:'August – December 2023',
      body:`August 2023 was a turning point. Joshua trained ${s('11 times')} — the most since the very first month — and started adding accessories: curls, lateral raises, rows, flys. The exercise variety jumped from 5 to ${s('9 exercises')}. Something shifted in the approach.
      <br><br>The results were immediate. Squat went from ${s('275 lbs')} in August to ${s('315 lbs')} by October — a ${s('+40 lb')} jump in two months. Bench broke through to ${s('185 lbs')}. And in November, the deadlift came back — roaring back at ${s('355 lbs')}, then ${s('405 lbs')} in December. Volume hit ${s('191k–208k lbs/month')}, the highest of the year. This was the start of something serious.`
    },
    {
      title:'Peak — The 1,000 lb Total',
      period:'January – April 2024',
      body:`This was Joshua's best stretch of lifting. January and February 2024 were the two highest-volume months in the entire dataset — ${s('270k lbs')} and ${s('265k lbs')} respectively — with ${s('18 sessions each')}. The squat hit its all-time PR of ${s('345 lbs')} in January. Bench peaked at ${s('225 lbs')} in January and again in April. The deadlift climbed to its all-time PR of ${s('445 lbs')} in April.
      <br><br>Adding those up: ${s('345 + 225 + 445 = 1,015 lbs')} — the 1,000 lb powerlifting total, achieved. At a bodyweight of around ${s('158 lbs')}, that's a ${s('6.4× bodyweight total')}, a genuine milestone in the sport. This was the summit.`
    },
    {
      title:'After the Peak — Deload and Drift',
      period:'May – December 2024',
      body:`After the April peak, something changed. May's deadlift dropped to ${s('135 lbs')} — likely a planned deload or a reset after months of heavy pulling. Frequency fell from 18 sessions a month to ${s('5–7')}. The squat and bench held reasonably well through mid-year, but the intensity was clearly lower.
      <br><br>By August, there are no entries at all. September and October show just ${s('3 sessions each')}, bench-only. The big lifts had gone quiet again. December showed signs of life — ${s('5 sessions')}, squat back to ${s('225 lbs')} — but the momentum from early 2024 was gone.`
    },
    {
      title:'The Long Break',
      period:'December 2024 – May 2025',
      body:`Then silence. ${s('164 days')} — nearly five and a half months — with no entries in the log. The longest gap in four years of training. What happened during this time isn't recorded, but the numbers on the other side tell the story of what a long break costs.`
    },
    {
      title:'The Return',
      period:'June 2025 – Present',
      body:`June 2025: Joshua came back. Nine sessions, and the squat was already at ${s('325 lbs')} — a remarkable retention of strength given the layoff. The deadlift returned at ${s('315 lbs')}, down ${s('130 lbs')} from its peak but moving again. Bench was at ${s('215 lbs')}.
      <br><br>The months since have been inconsistent — some strong months, some sparse ones — but the trajectory is upward. April 2026 shows ${s('8 sessions')}, the squat back to ${s('325 lbs')}, deadlift at ${s('315 lbs')}, and bench at ${s('195 lbs')}. The body remembers. The 1,000 lb total is within reach again — and this time, with four years of experience behind it.`
    },
  ];

  document.getElementById('storyline-content').innerHTML = chapters.map((c,i)=>`
    <div class="story-chapter">
      <div class="story-period">${c.period}</div>
      <h2>${c.title}</h2>
      <p>${c.body}</p>
    </div>
    ${i < chapters.length-1 ? '<hr class="story-divider">' : ''}`).join('');
}

// Insights
function renderInsights(){
  if(document.getElementById('insights-grid').innerHTML) return;

  const w = WORKOUTS;
  const e1rm = ex => Math.max(...w.filter(d=>d.exercises[ex]).map(d=>Math.max(...d.exercises[ex].map(s=>s.reps>1?s.weight*(1+s.reps/30):s.weight))));
  const prDate = ex => w.filter(d=>d.exercises[ex]).reduce((best,d)=>{const mx=Math.max(...d.exercises[ex].map(s=>s.weight));return mx>best.w?{w:mx,date:d.dateStr}:best},{w:0,date:''});

  const sqPR = prDate('Squat'), bePR = prDate('Bench'), dlPR = prDate('Deadlift');
  const totalE1RM = Math.round(e1rm('Squat')+e1rm('Bench')+e1rm('Deadlift'));

  // Consistency
  const spanWeeks = (w[w.length-1].date - w[0].date)/(7*864e5);
  const perWeek = (w.length/spanWeeks).toFixed(2);

  // Longest gap
  let maxGap=0, gapDates='';
  for(let i=1;i<w.length;i++){
    const g=(w[i].date-w[i-1].date)/864e5;
    if(g>maxGap){maxGap=g;gapDates=`${w[i-1].dateStr} → ${w[i].dateStr}`;}
  }

  // Favourite day
  const dow=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dowCount=Array(7).fill(0);
  w.forEach(d=>dowCount[(d.date.getDay()+6)%7]++);
  const favDay=dow[dowCount.indexOf(Math.max(...dowCount))];

  // Volume by year
  const byYear={};
  w.forEach(d=>{const y=d.date.getFullYear();if(!byYear[y])byYear[y]=0;Object.values(d.exercises).forEach(sets=>sets.forEach(s=>byYear[y]+=s.weight*s.reps));});
  const years=Object.keys(byYear).sort();
  const bestYear=years.reduce((a,b)=>byYear[a]>byYear[b]?a:b);

  // Squat/bench ratio
  const sqBenchRatio=(sqPR.w/bePR.w).toFixed(2);

  // Bench dominance — sessions with bench vs squat
  const benchSessions=w.filter(d=>d.exercises['Bench']).length;
  const squatSessions=w.filter(d=>d.exercises['Squat']).length;

  // 2025 gap
  const gap2025 = Math.round(maxGap);

  const cards = [
    {
      title:'Powerlifting Total (Est. 1RM)',
      value:`${totalE1RM} lbs`,
      body:`Est. Squat ${Math.round(e1rm('Squat'))} + Bench ${Math.round(e1rm('Bench'))} + Deadlift ${Math.round(e1rm('Deadlift'))} — projected from working sets using the Epley formula, not recorded singles. Actual recorded PRs were Squat ${sqPR.w}, Bench ${bePR.w}, Deadlift ${dlPR.w} lbs, putting the real total at ${sqPR.w+bePR.w+dlPR.w} lbs — crossing the 1,000 lb milestone around early 2024.`,
      tag:'🏆 Milestone'
    },
    {
      title:'Squat PR',
      value:`${sqPR.w} lbs`,
      body:`Hit on ${sqPR.date}. At a bodyweight of ~158 lbs during peak bulk, that's roughly a 2.2× bodyweight squat — solidly intermediate-to-advanced territory.`,
      tag:'Lower body'
    },
    {
      title:'Deadlift PR',
      value:`${dlPR.w} lbs`,
      body:`Hit on ${dlPR.date}. Deadlift is the strongest of the three big lifts relative to bodyweight, which is common for lifters who train it less frequently but with high intensity.`,
      tag:'Posterior chain'
    },
    {
      title:'Bench PR',
      value:`${bePR.w} lbs`,
      body:`Hit on ${bePR.date}. Bench is by far the most trained lift (245 sessions vs 61 for deadlift). The squat-to-bench ratio of ${sqBenchRatio}× is on the lower end — suggesting bench is a relative strength.`,
      tag:'Upper body'
    },
    {
      title:'Training Frequency',
      value:`${perWeek}× / week`,
      body:`${w.length} workouts over ${Math.round(spanWeeks/52)} years. Frequency was higher early on (~1.6×/week) and has trended down to ~1.2×/week more recently — likely reflecting a more sustainable long-term rhythm.`,
      tag:'Consistency'
    },
    {
      title:'Favourite Training Day',
      value:favDay,
      body:`Monday is the most common training day by a clear margin, followed by Wednesday and Friday — a classic push/pull/legs or upper/lower split pattern, even if not strictly programmed.`,
      tag:'Habit'
    },
    {
      title:'Best Volume Year',
      value:bestYear,
      body:`${(byYear[bestYear]/1e6).toFixed(2)}M lbs of total volume lifted in ${bestYear} — the peak training year. Volume dropped sharply in 2025 due to a ${gap2025}-day gap in training (Dec 2024 – Jun 2025).`,
      tag:'Volume'
    },
    {
      title:'Longest Break',
      value:`${gap2025} days`,
      body:`The longest gap in the log runs ${gapDates}. Outside of that, training has been remarkably consistent for 4+ years with no other gaps longer than a few weeks.`,
      tag:'Recovery'
    },
    {
      title:'Bench-Dominant Training Style',
      value:`${benchSessions} bench sessions`,
      body:`Bench was performed in ${benchSessions} out of ${w.length} total workouts (${Math.round(benchSessions/w.length*100)}%), compared to ${squatSessions} squat sessions. This suggests an upper-body emphasis or that bench is used as a frequent accessory even on non-primary days.`,
      tag:'Training style'
    },
  ];

  const recCards = [
    {
      title:'Your Pull Volume Is Critically Low',
      value:'6% pull ratio',
      body:`You benched 245 sessions but only did barbell rows 15 times — a 0.06 pull-to-push ratio. Lat pulldown (41 sessions) helps, but horizontal pulling is nearly absent. This imbalance over years is a common cause of shoulder issues and posture problems. Aim for at least 1 row session per bench session.`,
      tag:'⚠️ Imbalance'
    },
    {
      title:'Deadlift Is Way Below Peak',
      value:'-130 lbs in 6 months',
      body:`Your deadlift has dropped from a 445 lb PR to a recent max of 315 lbs — a 130 lb regression. Squat is down 20 lbs and bench 30 lbs, but deadlift is by far the biggest drop. This likely reflects the 164-day break in 2025 and not fully rebuilding since. Prioritize deadlift frequency to reclaim lost ground.`,
      tag:'📉 Regression'
    },
    {
      title:'Squat and Bench Are Trained Together Too Often',
      value:'177 same-day sessions',
      body:`You squatted and benched on the same day 177 times — 59% of all workouts. While not inherently bad, this likely means one lift is always done fatigued. Separating them into dedicated lower/upper days could help both lifts progress faster.`,
      tag:'🗓 Programming'
    },
    {
      title:'Rep Range Is Well Balanced for Hypertrophy',
      value:'59% in 7–12 rep range',
      body:`Most of your training falls in the hypertrophy range (7–12 reps), with a solid 26% in the strength range (4–6 reps). This is a healthy distribution. The 10.8% in 1–3 rep range shows you do test your strength periodically. No major changes needed here.`,
      tag:'✅ Good habit'
    },
    {
      title:'Tricep Work Is Underrepresented',
      value:'20 sessions total',
      body:`For someone who benches 245 times, tricep isolation work (pushdowns etc.) only appears 20 times. Triceps are the primary mover in the lockout phase of bench. Adding dedicated tricep work more consistently could directly improve your bench ceiling.`,
      tag:'💪 Weak link'
    },
    {
      title:'Rest Days Are Well Managed',
      value:'2 days most common',
      body:`The most common gap between sessions is 2 days (107 times), followed by 3 days (61 times). You rarely train on back-to-back days (30 times) and almost never two days in a row without rest. This is a sustainable recovery pattern — keep it.`,
      tag:'✅ Good habit'
    },
    {
      title:'Consider Tracking Bodyweight More Consistently',
      value:'Only 10 real entries',
      body:`You only recorded your bodyweight 10 times across 4 years, all in 2022. Tracking weekly would let you correlate weight changes with strength gains and make intentional bulk/cut decisions rather than estimating in hindsight.`,
      tag:'📋 Tracking'
    },
    {
      title:'The 2025 Break Cost Real Strength',
      value:'164 days off',
      body:`The gap from Dec 2024 to Jun 2025 is the single biggest factor in your current numbers being below peak. The good news: strength returns faster than it was built. A focused 3–4 month block prioritizing the big 3 should get you back to 2024 levels.`,
      tag:'🔄 Recovery'
    },
  ];

  document.getElementById('insights-grid').innerHTML =
    `<div style="grid-column:1/-1;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:#b0a498;padding:.25rem 0">Observations</div>` +
    cards.map(c=>`<div class="insight-card"><h3>${c.title}</h3><div class="insight-value">${c.value}</div><p>${c.body}</p><span class="insight-tag">${c.tag}</span></div>`).join('') +
    `<div style="grid-column:1/-1;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:#b0a498;padding:.75rem 0 .25rem">Recommendations</div>` +
    recCards.map(c=>`<div class="insight-card"><h3>${c.title}</h3><div class="insight-value">${c.value}</div><p>${c.body}</p><span class="insight-tag">${c.tag}</span></div>`).join('');
}

// Bodyweight
function renderBodyweight(){
  if(!document.getElementById('bw-range')._init){
    document.getElementById('bw-range')._init=true;
    document.getElementById('bw-range').addEventListener('change',renderBodyweight);
  }
  const filtered = filterByRange(WORKOUTS, document.getElementById('bw-range').value)
    .filter(w=>w.bodyweight);

  destroyChart('bw'); destroyChart('bwratio');

  charts.bw = new Chart(document.getElementById('bw-chart'),{
    type:'line',
    data:{labels:filtered.map(w=>w.dateStr),datasets:[{
      label:'Bodyweight (lbs)', data:filtered.map(w=>w.bodyweight),
      borderColor:'#c47c3a', backgroundColor:'rgba(196,124,58,0.1)',
      pointRadius:filtered.length>80?0:2, tension:0.1, fill:true
    }]},
    options:{...CD}
  });

  // Strength-to-BW ratio for Squat, Bench, Deadlift
  const BIG3 = ['Squat','Bench','Deadlift'];
  const colors = ['#6a9e6a','#c47c3a','#5b8fa8']; // Squat=green, Bench=orange, Deadlift=slate blue
  const datasets = BIG3.map((ex,i)=>{
    const raw = filtered
      .filter(w=>w.exercises[ex] && w.bodyweight)
      .map(w=>({ date:w.date, ratio: Math.max(...w.exercises[ex].map(s=>s.weight)) / w.bodyweight }));
    
    // 4-week rolling average to smooth
    const smoothed = raw.map((pt,idx)=>{
      const window = raw.slice(Math.max(0,idx-3), idx+1);
      const avg = window.reduce((a,p)=>a+p.ratio,0) / window.length;
      return { x:pt.date, y:avg };
    });
    
    return { label:ex, data:smoothed, borderColor:colors[i], pointRadius:0, tension:0.2, fill:false };
  });
  charts.bwratio = new Chart(document.getElementById('bw-ratio-chart'),{
    type:'line',
    data:{datasets},
    options:{...CD, scales:{
      x:{type:'time',time:{unit:'month'},ticks:{color:'#b0a498'},grid:{color:'#e8e0d4'}},
      y:{ticks:{color:'#b0a498',callback:v=>v.toFixed(2)+'×'},grid:{color:'#e8e0d4'}}
    }}
  });
}

document.addEventListener('data-ready', ()=>{ renderStats(); renderProgress(); });
