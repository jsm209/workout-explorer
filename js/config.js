// js/config.js — shared constants
const COLORS = ['#6a9e6a','#c47c3a','#5b8fa8','#a07040','#7a6e9e','#4a8a6a','#b85c5c','#8a9e5a'];
const HM_COLORS = ['#e8e0d4','#c8dbc0','#a0c49a','#6a9e6a','#3d6e3d'];

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8a7d72', boxWidth: 12 } },
    tooltip: { backgroundColor: '#faf7f2', titleColor: '#3d3530', bodyColor: '#8a7d72', borderColor: '#d4c9bb', borderWidth: 1 }
  },
  scales: {
    x: { ticks: { color: '#b0a498', maxTicksLimit: 14 }, grid: { color: '#e8e0d4' } },
    y: { ticks: { color: '#b0a498' }, grid: { color: '#e8e0d4' } }
  }
};

const TIME_SCALE = {
  x: { type: 'time', time: { unit: 'month' }, ticks: { color: '#b0a498' }, grid: { color: '#e8e0d4' } },
  y: { ticks: { color: '#b0a498' }, grid: { color: '#e8e0d4' } }
};
