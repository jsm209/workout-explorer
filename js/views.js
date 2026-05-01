// js/views.js — non-chart tab renderers: stats, PRs, log, storyline, insights

// ── Stats Bar ──────────────────────────────────────────────────────────────
function renderStats() {
  const w = WORKOUTS;
  const sets = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.length,0),0);
  const vol  = w.reduce((a,d)=>a+Object.values(d.exercises).reduce((b,s)=>b+s.reduce((c,x)=>c+x.weight*x.reps,0),0),0);
  const yrs  = ((w[w.length-1].date - w[0].date)/(365.25*864e5)).toFixed(1);

  const weekSet = new Set(w.map(d => {
    const t = new Date(d.date); t.setHours(0,0,0,0);
    t.setDate(t.getDate() + 3 - (t.getDay()+6)%7);
    const w1 = new Date(t.getFullYear(),0,4);
    return `${t.getFullYear()}-${1+Math.round(((t-w1)/864e5-3+(w1.getDay()+6)%7)/7)}`;
  }));
  const weeks = [...weekSet].sort();
  let longest=1, cur=1;
  for(let i=1;i<weeks.length;i++){
    const [y1,w1]=weeks[i-1].split('-').map(Number),[y2,w2]=weeks[i].split('-').map(Number);
    if((y1===y2&&w2===w1+1)||(y1+1===y2&&w1>=52&&w2===1)){cur++;longest=Math.max(longest,cur);}else cur=1;
  }
  cur=1;
  for(let i=weeks.length-1;i>0;i--){
    const [y1,w1]=weeks[i-1].split('-').map(Number),[y2,w2]=weeks[i].split('-').map(Number);
    if((y1===y2&&w2===w1+1)||(y1+1===y2&&w1>=52&&w2===1))cur++;else break;
  }

  document.getElementById('stats-bar').innerHTML =
    `<div class="stat">Workouts <span>${w.length}</span></div>
     <div class="stat">Sets <span>${sets.toLocaleString()}</span></div>
     <div class="stat">Volume <span>${(vol/1e6).toFixed(2)}M lbs</span></div>
     <div class="stat">Span <span>${yrs} yrs</span></div>
     <div class="stat">Exercises <span>${EXERCISES.length}</span></div>
     <div class="stat">Streak <span>${cur}w</span></div>
     <div class="stat">Best Streak <span>${longest}w</span></div>`;
}

// ── PRs ────────────────────────────────────────────────────────────────────
function renderPRs() {
  if(!document.getElementById('pr-search')._init){
    document.getElementById('pr-search')._init=true;
    document.getElementById('pr-search').addEventListener('input',renderPRs);
  }
  const search = document.getElementById('pr-search').value.toLowerCase();
  const prs = getPRs(WORKOUTS);
  document.getElementById('pr-grid').innerHTML = Object.entries(prs)
    .filter(([ex])=>!search||ex.toLowerCase().includes(search))
    .sort((a,b)=>b[1].weight-a[1].weight)
    .map(([ex,pr])=>`<div class="pr-card"><h3>${ex}</h3><div class="pr-weight">${pr.weight} <small>lbs × ${pr.reps}</small></div><div class="pr-date">${pr.date}</div></div>`)
    .join('');
}

// ── Log ────────────────────────────────────────────────────────────────────
function renderLog() {
  if(!document.getElementById('log-search')._init){
    document.getElementById('log-search')._init=true;
    document.getElementById('log-search').addEventListener('input',renderLog);
    document.getElementById('log-month').addEventListener('change',renderLog);
  }
  const search = document.getElementById('log-search').value.toLowerCase();
  const month  = document.getElementById('log-month').value;
  let days = [...WORKOUTS].reverse();
  if(month){ const [y,m]=month.split('-').map(Number); days=days.filter(w=>w.date.getFullYear()===y&&w.date.getMonth()===m-1); }
  if(search) days=days.filter(w=>Object.keys(w.exercises).some(ex=>ex.toLowerCase().includes(search)));

  document.getElementById('log-list').innerHTML = days.slice(0,100).map(w=>{
    const exNames = Object.keys(w.exercises).filter(ex=>!search||ex.toLowerCase().includes(search));
    const body = exNames.map(ex=>{
      const rows = w.exercises[ex].map(s=>`<tr class="lbl-${s.type}"><td>${s.set}</td><td>${s.weight}</td><td>${s.reps}</td><td>${s.weight*s.reps}</td></tr>`).join('');
      return `<div class="ex-block"><h4>${ex}</h4><table class="sets-table"><tr><th>Set</th><th>Weight</th><th>Reps</th><th>Vol</th></tr>${rows}</table></div>`;
    }).join('');
    return `<div class="workout-day">
      <div class="day-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <span class="day-date">${w.dateStr}<button class="log-edit-btn" onclick="event.stopPropagation();openEditor('${w.dateStr}')">Edit</button></span>
        <span class="day-summary">${exNames.join(', ')}</span>
      </div>
      <div class="day-body">${body}</div>
    </div>`;
  }).join('');
}

// ── Storyline ──────────────────────────────────────────────────────────────
function renderStoryline() {
  if(document.getElementById('storyline-content').innerHTML) return;
  const s = n=>`<span class="story-stat">${n}</span>`;
  const chapters = [
    { title:'The Beginning — Finding the Bar', period:'March – May 2022',
      body:`Joshua walked into the gym in March 2022 and started logging from day one. The numbers tell the story of someone brand new to structured lifting: a ${s('215 lb squat')}, ${s('145 lb bench')}, and ${s('245 lb deadlift')} in the first month. He trained ${s('10–11 times a month')} right out of the gate — real commitment from the start.<br><br>Over those first three months, every lift moved. By May, the squat was up to ${s('235 lbs')}, bench to ${s('160 lbs')}, and deadlift to ${s('295 lbs')}. Bodyweight hovered around ${s('143–146 lbs')} — lean, and clearly leaving room to grow.` },
    { title:'The Summer Slump', period:'June – October 2022',
      body:`Then things went quiet. June and July have no entries at all, and August shows only ${s('2 workouts')}. When he came back in September, the numbers had slipped: squat back to ${s('225 lbs')}, bench at ${s('135 lbs')}, bodyweight down to ${s('139 lbs')}.<br><br>October was sparse too — just ${s('3 sessions')}. But the deadlift quietly held at ${s('295 lbs')}, a sign that the strength wasn't fully gone, just dormant.` },
    { title:'The Comeback — Deadlift Breaks Out', period:'November – December 2022',
      body:`November marked a real return. Eight sessions, and the deadlift surged to ${s('330 lbs')} — a ${s('+35 lb')} jump from the pre-summer peak. The squat climbed to ${s('255 lbs')} and bench to ${s('155 lbs')}. Something clicked.<br><br>December: bench hit ${s('165 lbs')} for the first time, squat held at ${s('245 lbs')}. The foundation was being rebuilt, stronger than before.` },
    { title:'A Quiet Year of Grinding', period:'January – July 2023',
      body:`2023 started with promise — a ${s('265 lb squat')} and ${s('325 lb deadlift')} in January — but the deadlift then disappeared from the log entirely for the next ${s('9 months')}. The squat and bench kept grinding forward slowly, consistently in the ${s('265–275 lb')} and ${s('145–165 lb')} ranges. Volume was moderate — ${s('3–6 sessions a month')}. A maintenance phase more than a growth phase.` },
    { title:'The Awakening — Everything Clicks', period:'August – December 2023',
      body:`August 2023 was a turning point. Joshua trained ${s('11 times')} and started adding accessories: curls, lateral raises, rows, flys. Exercise variety jumped from 5 to ${s('9 exercises')}.<br><br>The results were immediate. Squat went from ${s('275 lbs')} to ${s('315 lbs')} by October — a ${s('+40 lb')} jump in two months. Bench broke through to ${s('185 lbs')}. And in November, the deadlift came back — roaring back at ${s('355 lbs')}, then ${s('405 lbs')} in December. Volume hit ${s('191k–208k lbs/month')}. This was the start of something serious.` },
    { title:'Peak — The 1,000 lb Total', period:'January – April 2024',
      body:`Joshua's best stretch of lifting. January and February 2024 were the two highest-volume months in the entire dataset — ${s('270k lbs')} and ${s('265k lbs')} — with ${s('18 sessions each')}. The squat hit its all-time PR of ${s('345 lbs')} in January. Bench peaked at ${s('225 lbs')}. The deadlift climbed to its all-time PR of ${s('445 lbs')} in April.<br><br>${s('345 + 225 + 445 = 1,015 lbs')} — the 1,000 lb powerlifting total, achieved. At a bodyweight of around ${s('158 lbs')}, that's a ${s('6.4× bodyweight total')}. This was the summit.` },
    { title:'After the Peak — Deload and Drift', period:'May – December 2024',
      body:`After the April peak, the deadlift dropped to ${s('135 lbs')} — likely a planned deload. Frequency fell from 18 sessions a month to ${s('5–7')}. By August, there are no entries at all. September and October show just ${s('3 sessions each')}, bench-only. December showed signs of life — ${s('5 sessions')}, squat back to ${s('225 lbs')} — but the momentum from early 2024 was gone.` },
    { title:'The Long Break', period:'December 2024 – May 2025',
      body:`Then silence. ${s('164 days')} — nearly five and a half months — with no entries in the log. The longest gap in four years of training.` },
    { title:'The Return', period:'June 2025 – Present',
      body:`June 2025: Joshua came back. Nine sessions, and the squat was already at ${s('325 lbs')} — remarkable retention given the layoff. The deadlift returned at ${s('315 lbs')}, down ${s('130 lbs')} from its peak but moving again. Bench was at ${s('215 lbs')}.<br><br>April 2026 shows ${s('8 sessions')}, squat back to ${s('325 lbs')}, deadlift at ${s('315 lbs')}, bench at ${s('195 lbs')}. The body remembers. The 1,000 lb total is within reach again.` },
  ];
  document.getElementById('storyline-content').innerHTML = chapters.map((c,i)=>`
    <div class="story-chapter">
      <div class="story-period">${c.period}</div>
      <h2>${c.title}</h2>
      <p>${c.body}</p>
    </div>${i<chapters.length-1?'<hr class="story-divider">':''}`).join('');
}

// ── Insights ───────────────────────────────────────────────────────────────
function renderInsights() {
  if(document.getElementById('insights-grid').innerHTML) return;
  const w = WORKOUTS;
  const e1rm = ex=>Math.max(...w.filter(d=>d.exercises[ex]).map(d=>Math.max(...d.exercises[ex].map(s=>s.reps>1?s.weight*(1+s.reps/30):s.weight))));
  const prDate = ex=>w.filter(d=>d.exercises[ex]).reduce((best,d)=>{const mx=Math.max(...d.exercises[ex].map(s=>s.weight));return mx>best.w?{w:mx,date:d.dateStr}:best},{w:0,date:''});
  const sqPR=prDate('Squat'),bePR=prDate('Bench'),dlPR=prDate('Deadlift');
  const totalE1RM=Math.round(e1rm('Squat')+e1rm('Bench')+e1rm('Deadlift'));
  const spanWeeks=(w[w.length-1].date-w[0].date)/(7*864e5);
  const perWeek=(w.length/spanWeeks).toFixed(2);
  let maxGap=0,gapDates='';
  for(let i=1;i<w.length;i++){const g=(w[i].date-w[i-1].date)/864e5;if(g>maxGap){maxGap=g;gapDates=`${w[i-1].dateStr} → ${w[i].dateStr}`;}}
  const dow=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],dowCount=Array(7).fill(0);
  w.forEach(d=>dowCount[(d.date.getDay()+6)%7]++);
  const favDay=dow[dowCount.indexOf(Math.max(...dowCount))];
  const byYear={};
  w.forEach(d=>{const y=d.date.getFullYear();if(!byYear[y])byYear[y]=0;Object.values(d.exercises).forEach(sets=>sets.forEach(s=>byYear[y]+=s.weight*s.reps));});
  const bestYear=Object.keys(byYear).reduce((a,b)=>byYear[a]>byYear[b]?a:b);
  const benchSessions=w.filter(d=>d.exercises['Bench']).length;
  const squatSessions=w.filter(d=>d.exercises['Squat']).length;
  const gap=Math.round(maxGap);

  const card=(title,value,body,tag)=>`<div class="insight-card"><h3>${title}</h3><div class="insight-value">${value}</div><p>${body}</p><span class="insight-tag">${tag}</span></div>`;
  const section=label=>`<div style="grid-column:1/-1;font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:#b0a498;padding:.5rem 0 .25rem">${label}</div>`;

  document.getElementById('insights-grid').innerHTML =
    section('Observations') +
    card('Powerlifting Total (Est. 1RM)',`${totalE1RM} lbs`,`Est. Squat ${Math.round(e1rm('Squat'))} + Bench ${Math.round(e1rm('Bench'))} + Deadlift ${Math.round(e1rm('Deadlift'))} — projected via Epley formula. Actual recorded PRs: Squat ${sqPR.w}, Bench ${bePR.w}, Deadlift ${dlPR.w} lbs = ${sqPR.w+bePR.w+dlPR.w} lbs total.`,'🏆 Milestone') +
    card('Squat PR',`${sqPR.w} lbs`,`Hit on ${sqPR.date}. At ~158 lbs bodyweight, that's roughly a 2.2× bodyweight squat — solidly intermediate-to-advanced territory.`,'Lower body') +
    card('Deadlift PR',`${dlPR.w} lbs`,`Hit on ${dlPR.date}. Strongest of the three big lifts relative to bodyweight, common for lifters who train it less frequently but with high intensity.`,'Posterior chain') +
    card('Bench PR',`${bePR.w} lbs`,`Hit on ${bePR.date}. Most trained lift by far (${benchSessions} sessions vs 61 for deadlift). Squat-to-bench ratio of ${(sqPR.w/bePR.w).toFixed(2)}× suggests bench is a relative strength.`,'Upper body') +
    card('Training Frequency',`${perWeek}× / week`,`${w.length} workouts over ${Math.round(spanWeeks/52)} years. Frequency trended from ~1.6×/week early on to ~1.2×/week more recently.`,'Consistency') +
    card('Favourite Training Day',favDay,`Monday is the most common training day, followed by Wednesday and Friday — a classic upper/lower or push/pull pattern.`,'Habit') +
    card('Best Volume Year',bestYear,`${(byYear[bestYear]/1e6).toFixed(2)}M lbs lifted in ${bestYear}. Volume dropped sharply in 2025 due to the ${gap}-day break.`,'Volume') +
    card('Longest Break',`${gap} days`,`The longest gap runs ${gapDates}. Outside of that, training has been remarkably consistent for 4+ years.`,'Recovery') +
    card('Bench-Dominant Style',`${benchSessions} bench sessions`,`Bench in ${Math.round(benchSessions/w.length*100)}% of all workouts vs ${squatSessions} squat sessions — upper-body emphasis is clear.`,'Training style') +
    section('Recommendations') +
    card('Pull Volume Is Critically Low','6% pull ratio',`${benchSessions} bench sessions but only 15 barbell rows. Lat pulldown helps but horizontal pulling is nearly absent — a common cause of shoulder issues over time. Aim for 1 row per bench session.`,'⚠️ Imbalance') +
    card('Deadlift Is Way Below Peak','-130 lbs in 6 months',`Dropped from a 445 lb PR to a recent max of 315 lbs. By far the biggest regression of the three lifts. Prioritize deadlift frequency to reclaim lost ground.`,'📉 Regression') +
    card('Squat + Bench Same Day Too Often','177 same-day sessions',`59% of all workouts include both squat and bench. Separating them into dedicated lower/upper days could help both lifts progress faster.`,'🗓 Programming') +
    card('Rep Range Is Well Balanced','59% in 7–12 rep range',`Healthy hypertrophy-focused distribution with a solid 26% in the strength range (4–6 reps). No major changes needed here.`,'✅ Good habit') +
    card('Triceps Are Undertrained','20 sessions total',`For someone who benches ${benchSessions} times, tricep isolation only appears 20 times. Triceps drive the lockout — more consistent work here could directly raise your bench ceiling.`,'💪 Weak link') +
    card('Rest Days Are Well Managed','2 days most common',`Most common gap between sessions is 2 days (107×), followed by 3 days (61×). Rarely trains back-to-back. Sustainable recovery pattern — keep it.`,'✅ Good habit') +
    card('Track Bodyweight More Often','Only 10 real entries',`Bodyweight was only recorded 10 times across 4 years, all in 2022. Weekly tracking would let you correlate weight changes with strength gains.`,'📋 Tracking') +
    card('The 2025 Break Cost Real Strength','164 days off',`The Dec 2024 – Jun 2025 gap is the single biggest factor in current numbers being below peak. Strength returns faster than it was built — a focused 3–4 month block should get you back.`,'🔄 Recovery');
}
