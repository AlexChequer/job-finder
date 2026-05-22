'use strict';

const LEVEL_LABELS = {
  estagio: 'Estágio',
  trainee: 'Trainee',
  aprendiz: 'Jovem Aprendiz',
  junior: 'Júnior',
  newgrad: 'Recém-formado',
};

const AREA_LABELS = {
  engenharia: 'Engenharia',
  dados: 'Dados',
  produto: 'Produto & Design',
  negocios: 'Negócios',
  outro: 'Outros',
};

/** The áreas the "Tech" umbrella filter expands to. */
const TECH_AREAS = ['engenharia', 'dados'];

const AVATAR_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
];

const state = {
  jobs: [],
  filters: {
    search: '',
    levels: new Set(),
    areas: new Set(),
    company: '',
    recency: '',
    sort: 'balanced',
  },
};

const els = {};
for (const id of [
  'summary',
  'count',
  'jobs',
  'empty',
  'clear',
  'search',
  'company',
  'company-options',
  'recency',
  'sort',
  'level-chips',
  'area-chips',
]) {
  els[id] = document.getElementById(id);
}

function daysAgo(isoDate) {
  const then = new Date(`${isoDate}T00:00:00`);
  return Math.max(Math.floor((Date.now() - then.getTime()) / 86400000), 0);
}

function relativeLabel(isoDate) {
  const d = daysAgo(isoDate);
  if (d === 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Build a toggle chip for a multi-select filter (Nível, Área). */
function toggleChip(label, className, selected, key) {
  const chip = el('button', className, label);
  chip.type = 'button';
  chip.addEventListener('click', () => {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    chip.classList.toggle('active');
    render();
  });
  return chip;
}

/** Populate the Nível chips from the levels present in the data. */
function buildLevelChips(present) {
  for (const key of Object.keys(LEVEL_LABELS)) {
    if (!present.has(key)) continue;
    els['level-chips'].appendChild(
      toggleChip(LEVEL_LABELS[key], 'chip', state.filters.levels, key),
    );
  }
}

/** Populate the Área chips, led by the "Tech" umbrella shortcut. */
function buildAreaChips(present) {
  if (TECH_AREAS.some((area) => present.has(area))) {
    els['area-chips'].appendChild(
      toggleChip('Tech', 'chip chip-tech', state.filters.areas, 'tech'),
    );
  }
  for (const key of Object.keys(AREA_LABELS)) {
    if (!present.has(key)) continue;
    els['area-chips'].appendChild(toggleChip(AREA_LABELS[key], 'chip', state.filters.areas, key));
  }
}

function logoTile(job) {
  const box = el('div', 'logo');
  const letter = (job.company[0] || '?').toUpperCase();
  const useFallback = () => {
    box.replaceChildren();
    box.textContent = letter;
    box.classList.add('logo-fallback');
    box.style.background = avatarColor(job.company);
  };
  if (!job.logo) {
    useFallback();
    return box;
  }
  const img = el('img');
  img.alt = job.company;
  img.loading = 'lazy';
  img.addEventListener('error', useFallback);
  img.src = job.logo;
  box.appendChild(img);
  return box;
}

function jobCard(job) {
  const card = el('a', 'job');
  card.href = /^https?:\/\//.test(job.url) ? job.url : '#';
  card.target = '_blank';
  card.rel = 'noopener';
  card.title = job.title;
  card.appendChild(logoTile(job));

  const body = el('div', 'job-body');
  body.appendChild(el('div', 'job-title', job.title));

  if (job.summary) {
    body.appendChild(el('div', 'job-summary', job.summary));
  }

  const pills = el('div', 'pills');
  pills.appendChild(el('span', 'pill pill-level', LEVEL_LABELS[job.level] || job.level));
  for (const area of (job.areas || []).slice(0, 2)) {
    pills.appendChild(el('span', 'pill pill-area', AREA_LABELS[area] || area));
  }
  body.appendChild(pills);

  const meta = el('div', 'job-meta');
  meta.append(
    el('span', 'company', job.company),
    el('span', 'sep', '·'),
    el('span', null, job.location),
    el('span', 'sep', '·'),
    el('span', null, relativeLabel(job.firstSeen)),
  );
  body.appendChild(meta);

  card.appendChild(body);
  return card;
}

/** Round-robin jobs across companies so no single company dominates the feed. */
function interleaveByCompany(jobs) {
  const byCompany = new Map();
  for (const job of jobs) {
    const list = byCompany.get(job.company);
    if (list) list.push(job);
    else byCompany.set(job.company, [job]);
  }
  const groups = [...byCompany.values()];
  for (const group of groups) {
    group.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen) || a.title.localeCompare(b.title));
  }
  const maxLen = Math.max(0, ...groups.map((group) => group.length));
  const result = [];
  for (let depth = 0; depth < maxLen; depth += 1) {
    for (const group of groups) {
      if (depth < group.length) result.push(group[depth]);
    }
  }
  return result;
}

/** Expand the área filter, turning the "Tech" umbrella into its real áreas. */
function selectedAreas() {
  const areas = new Set();
  for (const area of state.filters.areas) {
    if (area === 'tech') for (const tech of TECH_AREAS) areas.add(tech);
    else areas.add(area);
  }
  return areas;
}

function visibleJobs() {
  const f = state.filters;
  const term = f.search.trim().toLowerCase();
  const company = f.company.trim().toLowerCase();
  const areas = selectedAreas();
  const filtered = state.jobs.filter((job) => {
    if (term && !job.title.toLowerCase().includes(term)) return false;
    if (f.levels.size && !f.levels.has(job.level)) return false;
    if (areas.size && !(job.areas || []).some((area) => areas.has(area))) return false;
    if (company && !job.company.toLowerCase().includes(company)) return false;
    if (f.recency && daysAgo(job.firstSeen) > Number(f.recency)) return false;
    return true;
  });
  if (f.sort === 'balanced') return interleaveByCompany(filtered);
  filtered.sort((a, b) => {
    if (f.sort === 'company') {
      return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
    }
    if (f.sort === 'title') return a.title.localeCompare(b.title);
    return b.firstSeen.localeCompare(a.firstSeen) || a.company.localeCompare(b.company);
  });
  return filtered;
}

function hasActiveFilters() {
  const f = state.filters;
  return Boolean(f.search || f.levels.size || f.areas.size || f.company || f.recency);
}

function render() {
  const jobs = visibleJobs();
  els.jobs.replaceChildren(...jobs.map(jobCard));
  els.count.textContent = `${jobs.length} ${jobs.length === 1 ? 'vaga' : 'vagas'}`;
  els.empty.hidden = jobs.length > 0;
  els.clear.hidden = !hasActiveFilters();
}

/** Mark the segmented-control button carrying `value` active, the rest inactive. */
function selectSegment(container, value) {
  for (const button of container.querySelectorAll('.chip')) {
    button.classList.toggle('active', button.dataset.value === value);
  }
}

/** Wire a segmented control as a single-select bound to one filter key. */
function wireSegmented(container, key) {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.chip');
    if (!button || !container.contains(button)) return;
    state.filters[key] = button.dataset.value;
    selectSegment(container, button.dataset.value);
    render();
  });
}

function clearFilters() {
  state.filters.search = '';
  state.filters.company = '';
  state.filters.recency = '';
  state.filters.levels.clear();
  state.filters.areas.clear();
  els.search.value = '';
  els.company.value = '';
  // Deactivate the Nível/Área toggle chips; leave the segmented controls.
  for (const chip of document.querySelectorAll(
    '#level-chips .chip.active, #area-chips .chip.active',
  )) {
    chip.classList.remove('active');
  }
  selectSegment(els.recency, '');
  render();
}

function wireControls() {
  els.search.addEventListener('input', () => {
    state.filters.search = els.search.value;
    render();
  });
  els.company.addEventListener('input', () => {
    state.filters.company = els.company.value;
    render();
  });
  wireSegmented(els.recency, 'recency');
  wireSegmented(els.sort, 'sort');
  els.clear.addEventListener('click', clearFilters);
}

async function init() {
  try {
    const response = await fetch('jobs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.jobs = Array.isArray(data.jobs) ? data.jobs : [];

    const companies = [...new Set(state.jobs.map((job) => job.company))].sort((a, b) =>
      a.localeCompare(b),
    );
    for (const name of companies) {
      const option = el('option');
      option.value = name;
      els['company-options'].appendChild(option);
    }

    buildLevelChips(new Set(state.jobs.map((job) => job.level)));
    buildAreaChips(new Set(state.jobs.flatMap((job) => job.areas || [])));

    const updated = data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('pt-BR') : '—';
    els.summary.textContent = `${state.jobs.length} vagas · ${companies.length} empresas · atualizado em ${updated}`;

    wireControls();
    render();
  } catch (error) {
    els.summary.textContent = 'Não foi possível carregar as vagas.';
    console.error(error);
  }
}

init();
