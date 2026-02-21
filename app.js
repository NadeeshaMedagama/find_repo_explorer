/* ===========================
   FindRepo – GitHub Explorer
   app.js – Main Application
=========================== */

'use strict';

// ─── Language Color Map ───────────────────────────────────────────────────────
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
  PHP: '#4F5D95', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Shell: '#89e051', Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Vue: '#4FC08D', Scala: '#c22d40',
  R: '#198CE7', MATLAB: '#e16737', Lua: '#000080', Perl: '#0298c3',
  Haskell: '#5e5086', Elixir: '#6e4a7e', Clojure: '#db5855', Groovy: '#4298b8',
};

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  token: '',
  org: '',
  keyword: '',
  allRepos: [],
  filteredRepos: [],
  displayedRepos: [],
  currentFilter: 'all',
  currentSort: 'stars',
  page: 1,
  perPage: 100,          // GitHub max per page
  hasNextPage: false,
  isLoading: false,
  PAGE_SIZE: 30,         // cards shown per "load more"
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  searchPanel:        $('search-panel'),
  resultsSection:     $('results-section'),
  searchForm:         $('search-form'),
  tokenInput:         $('token-input'),
  orgInput:           $('org-input'),
  keywordInput:       $('keyword-input'),
  toggleToken:        $('toggle-token'),
  searchBtn:          $('search-btn'),
  btnText:            document.querySelector('.btn-text'),
  btnIcon:            document.querySelector('.btn-icon'),
  btnLoader:          document.querySelector('.btn-loader'),
  resultsTitle:       $('results-title'),
  resultsStats:       $('results-stats'),
  repoGrid:           $('repo-grid'),
  emptyState:         $('empty-state'),
  loadMoreWrapper:    $('load-more-wrapper'),
  loadMoreBtn:        $('load-more-btn'),
  errorBanner:        $('error-banner'),
  errorMessage:       $('error-message'),
  errorClose:         $('error-close'),
  modalOverlay:       $('modal-overlay'),
  modal:              $('modal'),
  modalContent:       $('modal-content'),
  modalClose:         $('modal-close'),
  backBtn:            $('back-btn'),
  sortSelect:         $('sort-select'),
  filterBar:          $('filter-bar'),
};

// ─── Init ──────────────────────────────────────────────────────────────────-──
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();

  // Restore last-used org (not token – never persist tokens)
  const savedOrg = sessionStorage.getItem('findrepo_org');
  if (savedOrg) els.orgInput.value = savedOrg;
});

// ─── Event Binding ─────────────────────────────────────────────────────────── 
function bindEvents() {
  els.searchForm.addEventListener('submit', handleSearch);
  els.toggleToken.addEventListener('click', toggleTokenVisibility);
  els.errorClose.addEventListener('click', hideError);
  els.backBtn.addEventListener('click', goBackToSearch);
  els.sortSelect.addEventListener('change', handleSortChange);
  els.loadMoreBtn.addEventListener('click', loadMoreCards);
  els.modalOverlay.addEventListener('click', e => {
    if (e.target === els.modalOverlay) closeModal();
  });
  els.modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Filter chips
  els.filterBar.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.currentFilter = chip.dataset.filter;
    applyFilterAndSort();
  });
}

// ─── Toggle Token Visibility ──────────────────────────────────────────────────
function toggleTokenVisibility() {
  const isPassword = els.tokenInput.type === 'password';
  els.tokenInput.type = isPassword ? 'text' : 'password';
  els.toggleToken.querySelector('.show-icon').classList.toggle('hidden', isPassword);
  els.toggleToken.querySelector('.hide-icon').classList.toggle('hidden', !isPassword);
}

// ─── Main Search Handler ─────────────────────────────────────────────────────
async function handleSearch(e) {
  e.preventDefault();
  if (state.isLoading) return;

  const token   = els.tokenInput.value.trim();
  const org     = els.orgInput.value.trim();
  const keyword = els.keywordInput.value.trim().toLowerCase();

  // Validation
  let hasError = false;
  [els.tokenInput, els.orgInput].forEach(el => el.classList.remove('error'));

  if (!token) {
    els.tokenInput.classList.add('error');
    hasError = true;
  }
  if (!org) {
    els.orgInput.classList.add('error');
    hasError = true;
  }
  if (hasError) {
    showError('Please fill in your GitHub token and organization name.');
    return;
  }

  state.token   = token;
  state.org     = org;
  state.keyword = keyword;
  state.page    = 1;
  state.allRepos = [];

  sessionStorage.setItem('findrepo_org', org);

  setLoading(true);
  hideError();

  try {
    await fetchAllRepos();
    applyFilterAndSort();
    showResults();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ─── GitHub API: Fetch All Pages ─────────────────────────────────────────────
async function fetchAllRepos() {
  let page = 1;
  const allRepos = [];

  while (true) {
    const url = `https://api.github.com/orgs/${encodeURIComponent(state.org)}/repos?per_page=100&page=${page}&type=all&sort=updated`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });

    if (resp.status === 401) throw new Error('Authentication failed. Please check your GitHub token.');
    if (resp.status === 403) {
      const rateLimitReset = resp.headers.get('X-RateLimit-Reset');
      const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'soon';
      throw new Error(`Access forbidden or rate limit exceeded. Rate limit resets at ${resetTime}.`);
    }
    if (resp.status === 404) throw new Error(`Organization "${state.org}" not found. Check the organization name.`);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${resp.status})`);
    }

    const repos = await resp.json();
    if (!Array.isArray(repos)) throw new Error('Unexpected response from GitHub API.');

    allRepos.push(...repos);

    // Check Link header for pagination
    const link = resp.headers.get('Link') || '';
    if (!link.includes('rel="next"') || repos.length === 0) break;

    page++;
  }

  state.allRepos = allRepos;
}

// ─── Filter & Sort ────────────────────────────────────────────────────────────
function applyFilterAndSort() {
  let repos = [...state.allRepos];

  // 1. Keyword filter
  if (state.keyword) {
    const kw = state.keyword;
    repos = repos.filter(r => {
      const inName    = r.name.toLowerCase().includes(kw);
      const inDesc    = (r.description || '').toLowerCase().includes(kw);
      const inTopics  = (r.topics || []).some(t => t.toLowerCase().includes(kw));
      return inName || inDesc || inTopics;
    });
  }

  // 2. Type filter
  switch (state.currentFilter) {
    case 'public':   repos = repos.filter(r => !r.private); break;
    case 'private':  repos = repos.filter(r => r.private); break;
    case 'forked':   repos = repos.filter(r => r.fork); break;
    case 'archived': repos = repos.filter(r => r.archived); break;
    default: break;
  }

  // 3. Sort
  switch (state.currentSort) {
    case 'stars':   repos.sort((a, b) => b.stargazers_count - a.stargazers_count); break;
    case 'forks':   repos.sort((a, b) => b.forks_count - a.forks_count); break;
    case 'updated': repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)); break;
    case 'name':    repos.sort((a, b) => a.name.localeCompare(b.name)); break;
  }

  state.filteredRepos = repos;
  state.displayedRepos = repos.slice(0, state.PAGE_SIZE);

  renderCards(state.displayedRepos, false);
  updateStats();
  toggleLoadMore();
}

// ─── Handle Sort Change ───────────────────────────────────────────────────────
function handleSortChange() {
  state.currentSort = els.sortSelect.value;
  // Reset displayed count
  state.displayedRepos = state.filteredRepos.slice(0, state.PAGE_SIZE);
  renderCards(state.displayedRepos, false);
  updateStats();
  toggleLoadMore();
}

// ─── Load More Cards ──────────────────────────────────────────────────────────
function loadMoreCards() {
  const nextBatch = state.filteredRepos.slice(
    state.displayedRepos.length,
    state.displayedRepos.length + state.PAGE_SIZE
  );
  state.displayedRepos = [...state.displayedRepos, ...nextBatch];
  renderCards(state.displayedRepos, false);
  updateStats();
  toggleLoadMore();
}

// ─── Toggle Load More Button ─────────────────────────────────────────────────
function toggleLoadMore() {
  const hasMore = state.displayedRepos.length < state.filteredRepos.length;
  els.loadMoreWrapper.classList.toggle('hidden', !hasMore);
  if (hasMore) {
    const remaining = state.filteredRepos.length - state.displayedRepos.length;
    els.loadMoreBtn.innerHTML = `
      Load More Repositories <span style="opacity:.6;font-size:.8em">(${remaining} remaining)</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>`;
  }
}

// ─── Show Results ─────────────────────────────────────────────────────────────
function showResults() {
  els.searchPanel.classList.add('hidden');
  els.resultsSection.classList.remove('hidden');
  els.resultsTitle.textContent = `Repositories in "${state.org}"`;
}

// ─── Go Back ─────────────────────────────────────────────────────────────────
function goBackToSearch() {
  els.resultsSection.classList.add('hidden');
  els.searchPanel.classList.remove('hidden');
  state.allRepos = [];
  state.filteredRepos = [];
  state.displayedRepos = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Update Stats ─────────────────────────────────────────────────────────────
function updateStats() {
  const total    = state.allRepos.length;
  const filtered = state.filteredRepos.length;
  const shown    = state.displayedRepos.length;
  const pub      = state.allRepos.filter(r => !r.private).length;
  const priv     = state.allRepos.filter(r => r.private).length;

  els.resultsStats.innerHTML = `
    <span class="stat-chip">📦 ${total} total</span>
    ${state.keyword ? `<span class="stat-chip">🔍 ${filtered} matched "${state.keyword}"</span>` : ''}
    <span class="stat-chip">🌐 ${pub} public</span>
    ${priv > 0 ? `<span class="stat-chip">🔒 ${priv} private</span>` : ''}
    <span class="stat-chip">👁 Showing ${shown}</span>
  `;

  if (filtered === 0) {
    els.emptyState.classList.remove('hidden');
    els.repoGrid.classList.add('hidden');
  } else {
    els.emptyState.classList.add('hidden');
    els.repoGrid.classList.remove('hidden');
  }
}

// ─── Render Cards ─────────────────────────────────────────────────────────────
function renderCards(repos, append = false) {
  if (!append) els.repoGrid.innerHTML = '';

  const fragment = document.createDocumentFragment();

  repos.slice(append ? state.displayedRepos.length - repos.length : 0).forEach((repo, i) => {
    const card = createRepoCard(repo, i);
    fragment.appendChild(card);
  });

  els.repoGrid.appendChild(fragment);
}

function createRepoCard(repo, idx) {
  const card = document.createElement('article');
  card.className = 'repo-card';
  card.style.animationDelay = `${Math.min(idx, 20) * 30}ms`;
  card.setAttribute('data-id', repo.id);

  const langColor = LANG_COLORS[repo.language] || '#6b7280';
  const updatedAgo = timeAgo(repo.updated_at);
  const description = repo.description || 'No description provided.';
  const topics = (repo.topics || []).slice(0, 5);

  const badges = [
    repo.private ? '<span class="badge badge-private">Private</span>' : '<span class="badge badge-public">Public</span>',
    repo.fork ? '<span class="badge badge-fork">Fork</span>' : '',
    repo.archived ? '<span class="badge badge-archived">Archived</span>' : '',
  ].filter(Boolean).join('');

  const topicsHtml = topics.map(t => {
    const isMatch = state.keyword && t.toLowerCase().includes(state.keyword);
    return `<span class="topic-tag ${isMatch ? 'highlight' : ''}">${escHtml(t)}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="repo-card-inner">
      <div class="repo-card-header">
        <div class="repo-name-wrapper">
          <svg class="repo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3z" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-name" title="${escHtml(repo.name)}"
             onclick="event.stopPropagation()">${highlightKeyword(escHtml(repo.name), state.keyword)}</a>
        </div>
        <div class="repo-badges">${badges}</div>
      </div>

      <p class="repo-description ${!repo.description ? 'empty' : ''}">${
        highlightKeyword(escHtml(description), state.keyword)
      }</p>

      ${topics.length ? `<div class="repo-topics">${topicsHtml}</div>` : ''}

      <div class="repo-footer">
        <span class="repo-stat" title="Stars">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${formatNum(repo.stargazers_count)}
        </span>
        <span class="repo-stat" title="Forks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          ${formatNum(repo.forks_count)}
        </span>
        ${repo.open_issues_count > 0 ? `
        <span class="repo-stat" title="Open Issues">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          ${formatNum(repo.open_issues_count)}
        </span>` : ''}
        ${repo.language ? `
        <span class="repo-lang">
          <span class="lang-dot" style="background:${langColor}"></span>
          ${escHtml(repo.language)}
        </span>` : ''}
        <span class="repo-updated">${updatedAgo}</span>
      </div>
    </div>`;

  card.addEventListener('click', e => {
    if (e.target.tagName === 'A') return;
    openModal(repo);
  });

  return card;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(repo) {
  const langColor = LANG_COLORS[repo.language] || '#6b7280';
  const topics    = repo.topics || [];

  const badges = [
    repo.private ? '<span class="badge badge-private">Private</span>' : '<span class="badge badge-public">Public</span>',
    repo.fork     ? '<span class="badge badge-fork">Fork</span>'     : '',
    repo.archived ? '<span class="badge badge-archived">Archived</span>' : '',
  ].filter(Boolean).join('');

  els.modalContent.innerHTML = `
    <h2 class="modal-repo-name">
      ${escHtml(repo.name)}
      <span>${badges}</span>
    </h2>
    <p class="modal-org">
      <svg style="width:13px;height:13px;vertical-align:-2px;margin-right:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      ${escHtml(state.org)} / ${escHtml(repo.name)}
    </p>

    ${repo.description ? `<p class="modal-description">${escHtml(repo.description)}</p>` : ''}

    <div class="modal-stats-grid">
      <div class="modal-stat-card">
        <span class="modal-stat-value">${formatNum(repo.stargazers_count)}</span>
        <span class="modal-stat-label">⭐ Stars</span>
      </div>
      <div class="modal-stat-card">
        <span class="modal-stat-value">${formatNum(repo.forks_count)}</span>
        <span class="modal-stat-label">🍴 Forks</span>
      </div>
      <div class="modal-stat-card">
        <span class="modal-stat-value">${formatNum(repo.open_issues_count)}</span>
        <span class="modal-stat-label">🐛 Issues</span>
      </div>
      <div class="modal-stat-card">
        <span class="modal-stat-value">${formatNum(repo.watchers_count)}</span>
        <span class="modal-stat-label">👁 Watchers</span>
      </div>
    </div>

    <div class="modal-info-rows">
      ${repo.language ? `
      <div class="modal-info-row">
        <span class="modal-info-label">Language</span>
        <span class="lang-dot" style="background:${langColor};width:10px;height:10px;border-radius:50%;flex-shrink:0"></span>
        ${escHtml(repo.language)}
      </div>` : ''}
      <div class="modal-info-row">
        <span class="modal-info-label">Created</span>
        ${formatDate(repo.created_at)}
      </div>
      <div class="modal-info-row">
        <span class="modal-info-label">Last push</span>
        ${formatDate(repo.pushed_at)} (${timeAgo(repo.pushed_at)})
      </div>
      ${repo.license?.name ? `
      <div class="modal-info-row">
        <span class="modal-info-label">License</span>
        ${escHtml(repo.license.name)}
      </div>` : ''}
      ${repo.default_branch ? `
      <div class="modal-info-row">
        <span class="modal-info-label">Default branch</span>
        <code style="font-family:var(--font-mono);font-size:.8rem;background:var(--bg-card);padding:1px 6px;border-radius:4px">${escHtml(repo.default_branch)}</code>
      </div>` : ''}
      ${repo.size ? `
      <div class="modal-info-row">
        <span class="modal-info-label">Size</span>
        ${formatSize(repo.size)}
      </div>` : ''}
    </div>

    ${topics.length ? `
    <p class="modal-section-title">Topics</p>
    <div class="modal-topics">
      ${topics.map(t => `<span class="topic-tag">${escHtml(t)}</span>`).join('')}
    </div>` : ''}

    <a class="modal-link" href="${repo.html_url}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
      Open on GitHub
    </a>
  `;

  els.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  els.modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── Loading State ─────────────────────────────────────────────────────────── 
function setLoading(on) {
  state.isLoading = on;
  els.searchBtn.disabled = on;
  els.btnText.classList.toggle('hidden', on);
  els.btnIcon.classList.toggle('hidden', on);
  els.btnLoader.classList.toggle('hidden', !on);
}

// ─── Error Handling ───────────────────────────────────────────────────────────
function showError(msg) {
  els.errorMessage.textContent = msg;
  els.errorBanner.classList.remove('hidden');
  clearTimeout(window._errorTimer);
  window._errorTimer = setTimeout(hideError, 8000);
}

function hideError() {
  els.errorBanner.classList.add('hidden');
}

// ─── Utility Functions ────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightKeyword(html, keyword) {
  if (!keyword) return html;
  // html is already escaped, so we match against the escaped version safely
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${safe})`, 'gi'),
    '<mark style="background:rgba(124,58,237,.25);color:inherit;border-radius:2px;padding:0 1px">$1</mark>');
}

function formatNum(n) {
  if (n == null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)    return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12)   return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatSize(kb) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
