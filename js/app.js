// js/app.js — boot and tab switching only

const TAB_RENDERERS = {
  progress:    renderProgress,
  heatmap:     renderHeatmap,
  volume:      renderVolume,
  compare:     renderCompare,
  prs:         renderPRs,
  log:         renderLog,
  bodyweight:  renderBodyweight,
  storyline:   renderStoryline,
  insights:    renderInsights,
  edit:        initEditor,
};

function renderTab(name) {
  TAB_RENDERERS[name]?.();
}

// Tab switching
document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  renderTab(btn.dataset.tab);
}));

// Tab scroll fade indicators
const tabsEl = document.getElementById('tabs');
const wrapEl = document.getElementById('tabs-wrap');
function updateTabFade(){
  wrapEl.classList.toggle('can-scroll-left', tabsEl.scrollLeft > 4);
  wrapEl.classList.toggle('can-scroll-right', tabsEl.scrollLeft < tabsEl.scrollWidth - tabsEl.clientWidth - 4);
}
tabsEl.addEventListener('scroll', updateTabFade, {passive:true});
window.addEventListener('resize', updateTabFade);
document.getElementById('tabs-arrow-left').addEventListener('click', ()=>{ tabsEl.scrollBy({left:-120,behavior:'smooth'}); });
document.getElementById('tabs-arrow-right').addEventListener('click', ()=>{ tabsEl.scrollBy({left:120,behavior:'smooth'}); });
// Tab drag-to-scroll (mouse)
let isDragging = false, dragStartX = 0, dragScrollLeft = 0;
tabsEl.addEventListener('mousedown', e=>{ isDragging=true; dragStartX=e.pageX-tabsEl.offsetLeft; dragScrollLeft=tabsEl.scrollLeft; tabsEl.style.cursor='grabbing'; });
tabsEl.addEventListener('mouseleave', ()=>{ isDragging=false; tabsEl.style.cursor=''; });
tabsEl.addEventListener('mouseup', ()=>{ isDragging=false; tabsEl.style.cursor=''; });
tabsEl.addEventListener('mousemove', e=>{ if(!isDragging) return; e.preventDefault(); tabsEl.scrollLeft=dragScrollLeft-(e.pageX-tabsEl.offsetLeft-dragStartX); });
updateTabFade();

// Boot
document.addEventListener('data-ready', () => {
  renderStats();
  renderProgress();
});
