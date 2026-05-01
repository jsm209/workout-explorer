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

// Boot
document.addEventListener('data-ready', () => {
  renderStats();
  renderProgress();
});
