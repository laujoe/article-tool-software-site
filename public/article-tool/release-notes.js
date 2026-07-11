(function () {
  if (window.ArticleToolReleaseNotesWidget) return;

  const STYLE_ID = 'article-tool-release-notes-style';
  const DEFAULT_MOUNT = '[data-article-tool-release-notes]';
  const DEFAULT_DATA_URL = '/article-tool/changelog-data.json';
  const DEFAULT_LATEST_URL = '/article-tool/update.json';
  const DEFAULT_PUBLIC_DOWNLOAD_VERSION = '1.6';
  const tagClasses = {
    基础框架: 'foundation',
    正式版: 'stable',
    功能增加: 'feature',
    视觉升级: 'visual',
    BUG修复: 'fix',
    压力测试: 'stress',
    体验优化: 'experience',
    视觉设置: 'visual',
    性能优化: 'performance',
  };
  let dataPromise;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
  }

  function normalizeArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  }

  function normalizeVersion(value) {
    const raw = String(value ?? '')
      .replace(/^ver\s*/i, '')
      .trim();
    const match = raw.match(/\d+(?:\.\d+)*/);
    if (!match) return raw;
    const parts = match[0].split('.');

    if (Number(parts[0]) >= 1 && parts.length === 2 && /^\d{2}$/.test(parts[1])) {
      return `${parts[0]}.${parts[1][0]}.${parts[1].slice(1)}`;
    }

    return match[0];
  }

  function versionParts(value) {
    const version = normalizeVersion(value);
    const match = version.match(/\d+(?:\.\d+)*/);
    return match ? match[0].split('.').map((part) => Number(part || 0)) : [];
  }

  function compareVersions(left, right) {
    const leftParts = versionParts(left);
    const rightParts = versionParts(right);
    const length = Math.max(leftParts.length, rightParts.length, 1);

    for (let index = 0; index < length; index += 1) {
      const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  }

  function dateScore(value) {
    const dates = String(value ?? '').match(/\d{4}-\d{2}-\d{2}/g);
    if (!dates?.length) return 0;
    return Date.parse(dates.at(-1)) || 0;
  }

  function readableDate(value) {
    return String(value ?? '').replace(/\s+-\s+/g, ' 至 ');
  }

  function displayVersion(entry) {
    const title = String(entry?.title || '').trim();
    const titleVersion = title.match(/^ver\s+(.+)$/i);
    return titleVersion ? titleVersion[1].trim() : entry?.version || '';
  }

  function normalizeEntry(entry) {
    const version = normalizeVersion(entry.version || entry.title);
    const highlights = normalizeArray(entry.highlights || entry.notes).map(String);

    return {
      ...entry,
      date: entry.date || entry.releaseDate || '',
      version,
      title: entry.title || `Ver ${version}`,
      tags: normalizeArray(entry.tags).map(String),
      highlights,
      text: entry.text || highlights.join(' '),
    };
  }

  function normalizeLatestRelease(release) {
    if (!release?.version) return null;
    const notes = normalizeArray(release.notes).map((note) => String(note).replace(/^（?\d+[).）]\s*/, ''));
    const version = normalizeVersion(release.version);

    return normalizeEntry({
      date: release.releaseDate || release.date,
      version,
      title: release.title || `Article-Tool ${version}`,
      tags: release.tags || ['最新版本'],
      text: notes.join(' '),
      highlights: notes,
      downloads: release.downloads || {},
      pageUrl: release.pageUrl,
      channelLabel: release.channelLabel || release.channel || '',
      force: !!release.force,
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return response.json();
  }

  function mergeLatest(data, latest) {
    const publicDownloadVersion =
      latest?.publicDownloadVersion ||
      data.publicDownloadVersion ||
      data.publicMaxVersion ||
      latest?.publicMaxVersion ||
      DEFAULT_PUBLIC_DOWNLOAD_VERSION;
    const updates = normalizeArray(data.updates || data).map(normalizeEntry);
    const latestEntry = normalizeLatestRelease(latest);

    if (latestEntry && compareVersions(latestEntry.version, publicDownloadVersion) <= 0) {
      const latestIndex = updates.findIndex(
        (entry) => normalizeVersion(entry.version) === normalizeVersion(latestEntry.version)
      );

      if (latestIndex >= 0) {
        updates[latestIndex] = {
          ...latestEntry,
          ...updates[latestIndex],
          highlights: updates[latestIndex].highlights?.length
            ? updates[latestIndex].highlights
            : latestEntry.highlights,
        };
      } else {
        updates.unshift(latestEntry);
      }
    }

    updates.sort((a, b) => dateScore(b.date) - dateScore(a.date) || compareVersions(b.version, a.version));

    return {
      product: data.product || 'Article-Tool',
      subtitle: data.subtitle || '',
      summary: data.summary || '',
      maintainerNote: data.maintainerNote || '',
      publicDownloadVersion,
      updates,
      latest: updates[0] || null,
    };
  }

  async function loadData(options) {
    if (!dataPromise) {
      dataPromise = Promise.allSettled([fetchJson(options.dataUrl), fetchJson(options.latestUrl)]).then((results) => {
        const dataResult = results[0];
        const latestResult = results[1];
        const baseData =
          window.ArticleToolReleaseNotes || (dataResult.status === 'fulfilled' ? dataResult.value : { updates: [] });
        const latest = latestResult.status === 'fulfilled' ? latestResult.value : null;

        return mergeLatest(baseData, latest);
      });
    }

    return dataPromise;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.atl-release {
  --atl-ink: #172033;
  --atl-soft: #526071;
  --atl-faint: #7b8798;
  --atl-line: #d7e3ef;
  --atl-surface: #ffffff;
  --atl-muted: #f4f8fb;
  --atl-blue: #2563eb;
  --atl-teal: #0f9f8f;
  --atl-amber: #d97706;
  color: var(--atl-ink);
  font-family: inherit;
  letter-spacing: 0;
  margin: 2rem 0;
}
.atl-release *,
.atl-release *::before,
.atl-release *::after {
  box-sizing: border-box;
}
.atl-release__panel {
  background: linear-gradient(135deg, #ffffff, #f3f8fb);
  border: 1px solid var(--atl-line);
  border-radius: 12px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 10%);
  overflow: hidden;
}
.atl-release__hero {
  display: grid;
  gap: 1rem;
  padding: clamp(1.15rem, 2.5vw, 2rem);
}
.atl-release__hero-top {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}
.atl-release__eyebrow {
  color: var(--atl-teal);
  font-size: 0.82rem;
  font-weight: 750;
  line-height: 1.4;
  margin: 0 0 0.35rem;
}
.atl-release__title {
  color: var(--atl-ink);
  font-size: clamp(1.65rem, 2.6vw, 2.35rem);
  line-height: 1.14;
  margin: 0;
}
.atl-release__version {
  align-items: center;
  background: #e9f6f5;
  border: 1px solid #b8e4df;
  border-radius: 999px;
  color: var(--atl-ink);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.88rem;
  font-weight: 800;
  gap: 0.45rem;
  line-height: 1;
  padding: 0.58rem 0.78rem;
  white-space: nowrap;
}
.atl-release__version-dot {
  background: var(--atl-teal);
  border-radius: 999px;
  box-shadow: 0 0 0 5px rgb(15 159 143 / 15%);
  height: 0.48rem;
  width: 0.48rem;
}
.atl-release__summary {
  color: var(--atl-soft);
  font-size: 1rem;
  line-height: 1.75;
  margin: 0;
  max-width: 58rem;
}
.atl-release__stats {
  border-top: 1px solid var(--atl-line);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.atl-release__stat {
  display: grid;
  gap: 0.28rem;
  padding: 0.9rem 1.1rem;
}
.atl-release__stat + .atl-release__stat {
  border-left: 1px solid var(--atl-line);
}
.atl-release__stat-label {
  color: var(--atl-faint);
  font-size: 0.78rem;
}
.atl-release__stat-value {
  color: var(--atl-ink);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.4;
}
.atl-release__toolbar {
  align-items: center;
  background: var(--atl-muted);
  border-top: 1px solid var(--atl-line);
  display: grid;
  gap: 0.9rem;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 18rem);
  padding: 0.95rem 1.1rem;
}
.atl-release__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
}
.atl-release__filter,
.atl-release__search {
  background: #ffffff;
  border: 1px solid var(--atl-line);
  border-radius: 999px;
  color: var(--atl-soft);
}
.atl-release__filter {
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 720;
  min-height: 2.1rem;
  padding: 0.45rem 0.78rem;
}
.atl-release__filter:hover,
.atl-release__filter.is-active {
  background: #e9f6f5;
  border-color: #91d7cf;
  color: var(--atl-ink);
}
.atl-release__search {
  align-items: center;
  display: flex;
  min-height: 2.4rem;
  padding: 0 0.8rem;
}
.atl-release__search input {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--atl-ink);
  font: inherit;
  min-width: 0;
  outline: 0;
  width: 100%;
}
.atl-release__count {
  color: var(--atl-faint);
  font-size: 0.82rem;
  margin-top: 0.45rem;
}
.atl-release__timeline {
  display: grid;
  gap: 0.8rem;
  padding: 1.1rem;
}
.atl-release__item {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: 8.8rem minmax(0, 1fr);
}
.atl-release__date {
  color: var(--atl-faint);
  font-size: 0.82rem;
  font-weight: 740;
  line-height: 1.45;
  padding-top: 1rem;
  text-align: right;
}
.atl-release__card {
  background: #ffffff;
  border: 1px solid var(--atl-line);
  border-radius: 10px;
  padding: 1rem;
}
.atl-release__card.is-latest {
  border-color: #91d7cf;
  box-shadow: 0 12px 30px rgb(15 159 143 / 10%);
}
.atl-release__card-head {
  align-items: flex-start;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
}
.atl-release__card-title {
  color: var(--atl-ink);
  font-size: 1.08rem;
  line-height: 1.45;
  margin: 0;
}
.atl-release__latest-badge {
  background: #fff4dd;
  border: 1px solid #f2d59a;
  border-radius: 999px;
  color: #6f4a05;
  flex: 0 0 auto;
  font-size: 0.74rem;
  font-weight: 820;
  line-height: 1;
  padding: 0.42rem 0.58rem;
  white-space: nowrap;
}
.atl-release__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin-top: 0.65rem;
}
.atl-release__tag {
  --tag-color: var(--atl-blue);
  background: color-mix(in srgb, var(--tag-color) 10%, white);
  border: 1px solid color-mix(in srgb, var(--tag-color) 28%, white);
  border-radius: 999px;
  color: color-mix(in srgb, var(--tag-color) 84%, #111827);
  font-size: 0.76rem;
  font-weight: 760;
  line-height: 1;
  padding: 0.36rem 0.52rem;
}
.atl-release__tag--foundation { --tag-color: #2563eb; }
.atl-release__tag--stable { --tag-color: #d97706; }
.atl-release__tag--feature { --tag-color: #059669; }
.atl-release__tag--visual { --tag-color: #0f9f8f; }
.atl-release__tag--fix { --tag-color: #e11d48; }
.atl-release__tag--stress { --tag-color: #7c3aed; }
.atl-release__tag--experience { --tag-color: #0284c7; }
.atl-release__tag--performance { --tag-color: #16a34a; }
.atl-release__text {
  color: var(--atl-soft);
  font-size: 0.95rem;
  line-height: 1.75;
  margin: 0.78rem 0 0;
}
.atl-release__highlights {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.85rem;
}
.atl-release__highlight {
  color: var(--atl-soft);
  display: grid;
  font-size: 0.92rem;
  gap: 0.55rem;
  grid-template-columns: 0.52rem minmax(0, 1fr);
  line-height: 1.65;
}
.atl-release__highlight::before {
  background: var(--atl-teal);
  border-radius: 999px;
  content: "";
  height: 0.42rem;
  margin-top: 0.58rem;
  width: 0.42rem;
}
.atl-release__empty,
.atl-release__loading,
.atl-release__error {
  color: var(--atl-soft);
  line-height: 1.8;
  padding: 1.2rem;
}
.atl-release__note {
  border-top: 1px solid var(--atl-line);
  color: var(--atl-faint);
  font-size: 0.83rem;
  line-height: 1.7;
  padding: 0.95rem 1.1rem 1.1rem;
}
.atl-release__visually-hidden {
  clip: rect(0 0 0 0);
  border: 0;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
html.dark .atl-release {
  --atl-ink: #f8fafc;
  --atl-soft: #cbd5e1;
  --atl-faint: #94a3b8;
  --atl-line: #334155;
  --atl-muted: #111827;
}
html.dark .atl-release__panel,
html.dark .atl-release__card,
html.dark .atl-release__search,
html.dark .atl-release__filter {
  background: #0f172a;
}
@media (max-width: 760px) {
  .atl-release__hero-top,
  .atl-release__toolbar,
  .atl-release__item {
    grid-template-columns: 1fr;
  }
  .atl-release__hero-top {
    display: grid;
  }
  .atl-release__stats {
    grid-template-columns: 1fr;
  }
  .atl-release__stat + .atl-release__stat {
    border-left: 0;
    border-top: 1px solid var(--atl-line);
  }
  .atl-release__date {
    padding-top: 0;
    text-align: left;
  }
}
`;
    document.head.appendChild(style);
  }

  function getTagClass(tag) {
    return tagClasses[tag] || 'feature';
  }

  function renderTags(tags) {
    return normalizeArray(tags)
      .map((tag) => {
        const className = getTagClass(tag);
        return `<span class="atl-release__tag atl-release__tag--${className}">${escapeHtml(tag)}</span>`;
      })
      .join('');
  }

  function renderHighlights(entry) {
    const highlights = normalizeArray(entry.highlights);
    if (!highlights.length) return '';

    return `<div class="atl-release__highlights">${highlights
      .map((item) => `<div class="atl-release__highlight">${escapeHtml(item)}</div>`)
      .join('')}</div>`;
  }

  function buildFilters(updates) {
    const tags = new Set();
    updates.forEach((entry) => normalizeArray(entry.tags).forEach((tag) => tags.add(tag)));
    return ['全部', ...Array.from(tags)];
  }

  function entryMatches(entry, state) {
    const tagMatch = state.tag === '全部' || normalizeArray(entry.tags).includes(state.tag);
    if (!tagMatch) return false;
    const query = state.query.trim().toLowerCase();
    if (!query) return true;

    return [
      entry.title,
      entry.version,
      entry.date,
      entry.text,
      ...normalizeArray(entry.tags),
      ...normalizeArray(entry.highlights),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }

  function renderTimeline(root, data) {
    const state = root.__atlState;
    const list = data.updates.filter((entry) => entryMatches(entry, state));
    const timeline = root.querySelector('[data-atl-timeline]');
    const count = root.querySelector('[data-atl-count]');

    root.querySelectorAll('[data-atl-filter]').forEach((button) => {
      const active = button.dataset.atlFilter === state.tag;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (count) count.textContent = `显示 ${list.length} 条，共 ${data.updates.length} 条`;
    if (!timeline) return;

    if (!list.length) {
      timeline.innerHTML = '<div class="atl-release__empty">没有找到匹配的更新记录。</div>';
      return;
    }

    timeline.innerHTML = list
      .map((entry, index) => {
        const isLatest = normalizeVersion(entry.version) === normalizeVersion(data.latest?.version);
        const anchor = `article-tool-v${normalizeVersion(entry.version).replaceAll('.', '-')}`;

        return `<article class="atl-release__item" id="${escapeAttribute(anchor)}">
          <div class="atl-release__date">${escapeHtml(readableDate(entry.date))}</div>
          <section class="atl-release__card ${isLatest ? 'is-latest' : ''}" aria-label="${escapeAttribute(entry.title)}">
            <div class="atl-release__card-head">
              <h3 class="atl-release__card-title">${escapeHtml(entry.title)}</h3>
              ${isLatest && index === 0 ? `<span class="atl-release__latest-badge">${entry.force ? '必要更新' : '最新记录'}</span>` : ''}
            </div>
            ${renderTags(entry.tags)}
            <p class="atl-release__text">${escapeHtml(entry.text)}</p>
            ${renderHighlights(entry)}
          </section>
        </article>`;
      })
      .join('');
  }

  function render(root, data) {
    const latest = data.latest || {};
    const currentVersion = displayVersion(latest);
    const versionLabel = currentVersion ? `当前版本 ${currentVersion}` : '';
    const filters = buildFilters(data.updates);
    root.__atlData = data;
    root.__atlState = root.__atlState || { tag: '全部', query: '' };
    root.innerHTML = `<section class="atl-release" aria-label="Article-Tool 更新说明">
      <div class="atl-release__panel">
        <header class="atl-release__hero">
          <div class="atl-release__hero-top">
            <div>
              <p class="atl-release__eyebrow">${escapeHtml(data.subtitle || '版本更新')}</p>
              <h2 class="atl-release__title">${escapeHtml(data.product)} 更新说明</h2>
            </div>
            ${
              versionLabel
                ? `<div class="atl-release__version"><span class="atl-release__version-dot" aria-hidden="true"></span>${escapeHtml(versionLabel)}</div>`
                : ''
            }
          </div>
          <p class="atl-release__summary">${escapeHtml(data.summary)}</p>
        </header>
        <div class="atl-release__stats" aria-label="版本概览">
          <div class="atl-release__stat">
            <span class="atl-release__stat-label">最新发布日期</span>
            <strong class="atl-release__stat-value">${escapeHtml(readableDate(latest.date || '待补充'))}</strong>
          </div>
          <div class="atl-release__stat">
            <span class="atl-release__stat-label">记录版本</span>
            <strong class="atl-release__stat-value">${data.updates.length} 个版本</strong>
          </div>
          <div class="atl-release__stat">
            <span class="atl-release__stat-label">维护状态</span>
            <strong class="atl-release__stat-value">${latest.force ? '必要更新' : '持续维护'}</strong>
          </div>
        </div>
        <div class="atl-release__toolbar" data-pagefind-ignore>
          <div>
            <div class="atl-release__filters" aria-label="按类型筛选">
              ${filters
                .map(
                  (tag) =>
                    `<button class="atl-release__filter" type="button" data-atl-filter="${escapeAttribute(tag)}" aria-pressed="${tag === '全部' ? 'true' : 'false'}">${escapeHtml(tag)}</button>`
                )
                .join('')}
            </div>
            <div class="atl-release__count" data-atl-count></div>
          </div>
          <label class="atl-release__search">
            <span class="atl-release__visually-hidden">搜索更新</span>
            <input type="search" placeholder="搜索版本、标签或关键词" data-atl-search autocomplete="off" />
          </label>
        </div>
        <div class="atl-release__timeline" data-atl-timeline></div>
        ${data.maintainerNote ? `<div class="atl-release__note">${escapeHtml(data.maintainerNote)}</div>` : ''}
      </div>
    </section>`;

    root.querySelectorAll('[data-atl-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        root.__atlState.tag = button.dataset.atlFilter || '全部';
        renderTimeline(root, data);
      });
    });

    const search = root.querySelector('[data-atl-search]');
    if (search) {
      search.addEventListener('input', () => {
        root.__atlState.query = search.value || '';
        renderTimeline(root, data);
      });
    }

    renderTimeline(root, data);
  }

  function optionsFromScript() {
    const script = document.currentScript;

    return {
      mount: script?.dataset.mount || DEFAULT_MOUNT,
      dataUrl: script?.dataset.data || DEFAULT_DATA_URL,
      latestUrl: script?.dataset.latest || DEFAULT_LATEST_URL,
    };
  }

  function initAll(options) {
    const roots = document.querySelectorAll(options.mount || DEFAULT_MOUNT);
    if (!roots.length) return;
    injectStyles();

    roots.forEach((root) => {
      if (root.dataset.atlInitialized === 'true') return;
      root.dataset.atlInitialized = 'true';
      root.innerHTML =
        '<div class="atl-release"><div class="atl-release__panel"><div class="atl-release__loading">正在加载更新说明...</div></div></div>';
      loadData(options)
        .then((data) => render(root, data))
        .catch(() => {
          root.innerHTML =
            '<div class="atl-release"><div class="atl-release__panel"><div class="atl-release__error">更新说明暂时没有加载成功，请稍后刷新页面。</div></div></div>';
        });
    });
  }

  const options = optionsFromScript();
  window.ArticleToolReleaseNotesWidget = {
    init(customOptions) {
      initAll({ ...options, ...(customOptions || {}) });
    },
    normalizeVersion,
    compareVersions,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(options), { once: true });
  } else {
    initAll(options);
  }

  document.addEventListener('astro:page-load', () => initAll(options));
})();
