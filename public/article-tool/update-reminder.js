(function () {
  if (window.ArticleToolUpdateReminder) return;

  const STYLE_ID = 'article-tool-update-reminder-style';
  const BANNER_ID = 'article-tool-update-reminder';
  const MANIFEST_URL = '/article-tool/update.json';
  const SEEN_KEY = 'articleTool.lastSeenReleaseVersion';
  const DISMISS_PREFIX = 'articleTool.updateReminderDismissed.';
  const VERSION_QUERY_KEYS = ['currentVersion', 'appVersion', 'version', 'v'];
  let manifestPromise;
  let lastAutoCheckUrl = '';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function dismissKey(version) {
    return `${DISMISS_PREFIX}${normalizeVersion(version)}`;
  }

  function isDismissed(version) {
    return storageGet(dismissKey(version)) === '1';
  }

  function dismiss(version) {
    const normalized = normalizeVersion(version);
    if (!normalized) return;
    storageSet(dismissKey(normalized), '1');
    storageSet(SEEN_KEY, normalized);
  }

  function currentVersionFromLocation() {
    const params = new URLSearchParams(window.location.search);

    for (const key of VERSION_QUERY_KEYS) {
      const value = normalizeVersion(params.get(key));
      if (value) return value;
    }

    return '';
  }

  function absoluteUrl(url) {
    if (!url) return '';

    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return '';
    }
  }

  function platformUrl(update = {}) {
    const platform = `${navigator.userAgent || ''}`.toLowerCase();

    if (/mac|darwin/.test(platform)) {
      return update.macUrl || update.downloadUrl || update.pageUrl || update.winUrl || '';
    }

    if (/win/.test(platform)) {
      return update.winUrl || update.downloadUrl || update.pageUrl || update.macUrl || '';
    }

    return update.downloadUrl || update.pageUrl || update.macUrl || update.winUrl || '';
  }

  function notes(update = {}) {
    const rows = Array.isArray(update.notes) ? update.notes : String(update.notes || '').split(/\r?\n/);
    return rows
      .map((row) =>
        String(row || '')
          .replace(/^（?\d+[).）]\s*/, '')
          .trim()
      )
      .filter(Boolean)
      .slice(0, 2);
  }

  function updatePageUrl(update = {}) {
    return absoluteUrl('/services') || absoluteUrl(update.releaseNotesUrl || update.pageUrl || '/services');
  }

  async function fetchManifest(url = MANIFEST_URL) {
    if (!manifestPromise) {
      manifestPromise = fetch(url, { cache: 'no-cache', headers: { Accept: 'application/json' } }).then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return response.json();
      });
    }

    return manifestPromise;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.atu-reminder {
  --atu-ink: #172033;
  --atu-muted: #59677a;
  --atu-line: #d4e2f1;
  --atu-surface: #ffffff;
  --atu-blue: #2563eb;
  --atu-teal: #0f9f8f;
  background: linear-gradient(135deg, #ffffff, #f1f8fb);
  border: 1px solid var(--atu-line);
  border-radius: 12px;
  bottom: max(1rem, env(safe-area-inset-bottom));
  box-shadow: 0 18px 45px rgb(15 23 42 / 16%);
  color: var(--atu-ink);
  font-family: inherit;
  left: max(1rem, env(safe-area-inset-left));
  letter-spacing: 0;
  max-width: min(26rem, calc(100vw - 2rem));
  overflow: hidden;
  position: fixed;
  z-index: 80;
}
.atu-reminder__inner {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}
.atu-reminder__top {
  align-items: start;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 2.4rem minmax(0, 1fr) auto;
}
.atu-reminder__icon {
  align-items: center;
  background: #e8f7f5;
  border: 1px solid #b9e5df;
  border-radius: 10px;
  color: var(--atu-teal);
  display: inline-flex;
  height: 2.4rem;
  justify-content: center;
  width: 2.4rem;
}
.atu-reminder__eyebrow {
  color: var(--atu-teal);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.24rem;
}
.atu-reminder__title {
  color: var(--atu-ink);
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.35;
  margin: 0;
}
.atu-reminder__close {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: #718096;
  cursor: pointer;
  font: inherit;
  height: 2rem;
  line-height: 1;
  padding: 0;
  width: 2rem;
}
.atu-reminder__close:hover {
  background: #eef4f8;
  color: var(--atu-ink);
}
.atu-reminder__text {
  color: var(--atu-muted);
  font-size: 0.88rem;
  line-height: 1.65;
  margin: 0;
}
.atu-reminder__notes {
  display: grid;
  gap: 0.42rem;
  margin: 0;
  padding: 0;
}
.atu-reminder__notes li {
  color: var(--atu-muted);
  display: grid;
  font-size: 0.84rem;
  gap: 0.45rem;
  grid-template-columns: 0.42rem minmax(0, 1fr);
  line-height: 1.55;
  list-style: none;
}
.atu-reminder__notes li::before {
  background: var(--atu-blue);
  border-radius: 999px;
  content: "";
  height: 0.38rem;
  margin-top: 0.55rem;
  width: 0.38rem;
}
.atu-reminder__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}
.atu-reminder__button {
  align-items: center;
  border-radius: 8px;
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 800;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.55rem 0.82rem;
  text-decoration: none;
}
.atu-reminder__button--primary {
  background: var(--atu-blue);
  color: #ffffff;
}
.atu-reminder__button--secondary {
  background: #ffffff;
  border: 1px solid var(--atu-line);
  color: var(--atu-ink);
}
html.dark .atu-reminder {
  --atu-ink: #f8fafc;
  --atu-muted: #cbd5e1;
  --atu-line: #334155;
  background: linear-gradient(135deg, #0f172a, #132033);
  box-shadow: 0 18px 45px rgb(0 0 0 / 32%);
}
html.dark .atu-reminder__button--secondary,
html.dark .atu-reminder__close:hover {
  background: #1e293b;
}
@media (max-width: 640px) {
  .atu-reminder {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
}
`;
    document.head.appendChild(style);
  }

  function removeExisting() {
    document.getElementById(BANNER_ID)?.remove();
  }

  function renderBanner(update, context = {}) {
    const version = normalizeVersion(update.version || update.latestVersion);
    if (!version) return;
    if (isDismissed(version) && context.reason !== 'software') return;

    const noteRows = notes(update);
    const downloadUrl = absoluteUrl(platformUrl(update));
    const releaseUrl = updatePageUrl(update);
    const currentVersion = normalizeVersion(context.currentVersion);
    const text =
      context.reason === 'software' && currentVersion
        ? `你当前使用的是 ${currentVersion}，网站已发布 ${version}。可以先查看更新内容，再下载新版。`
        : `Article-Tool 的更新清单已经刷新到 ${version}，可以查看新增内容和下载入口。`;

    injectStyles();
    removeExisting();

    const root = document.createElement('aside');
    root.id = BANNER_ID;
    root.className = 'atu-reminder';
    root.setAttribute('role', 'status');
    root.innerHTML = `
      <div class="atu-reminder__inner">
        <div class="atu-reminder__top">
          <div class="atu-reminder__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-3.4-7" />
              <path d="M21 3v6h-6" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p class="atu-reminder__eyebrow">${context.reason === 'software' ? '发现软件新版本' : '网站更新提醒'}</p>
            <p class="atu-reminder__title">${escapeHtml(update.title || `Article-Tool ${version}`)}</p>
          </div>
          <button class="atu-reminder__close" type="button" aria-label="关闭更新提醒" data-atu-dismiss>×</button>
        </div>
        <p class="atu-reminder__text">${escapeHtml(text)}</p>
        ${
          noteRows.length
            ? `<ul class="atu-reminder__notes">${noteRows.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
            : ''
        }
        <div class="atu-reminder__actions">
          <a class="atu-reminder__button atu-reminder__button--primary" href="${escapeHtml(releaseUrl)}">查看更新</a>
          ${
            downloadUrl
              ? `<a class="atu-reminder__button atu-reminder__button--secondary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer">下载新版</a>`
              : ''
          }
        </div>
      </div>
    `;
    root.querySelector('[data-atu-dismiss]')?.addEventListener('click', () => {
      dismiss(version);
      removeExisting();
    });
    document.body.appendChild(root);
  }

  function checkShouldNotify(update, options = {}) {
    const latestVersion = normalizeVersion(update.version || update.latestVersion);
    const currentVersion = normalizeVersion(options.currentVersion || currentVersionFromLocation());

    if (!latestVersion) return null;

    if (currentVersion) {
      return compareVersions(latestVersion, currentVersion) > 0
        ? { reason: 'software', currentVersion, latestVersion }
        : null;
    }

    const seenVersion = normalizeVersion(storageGet(SEEN_KEY));

    if (!seenVersion) {
      storageSet(SEEN_KEY, latestVersion);
      return null;
    }

    if (compareVersions(latestVersion, seenVersion) > 0 && !isDismissed(latestVersion)) {
      return { reason: 'site', currentVersion: seenVersion, latestVersion };
    }

    return null;
  }

  async function check(options = {}) {
    const update = await fetchManifest(options.manifestUrl || MANIFEST_URL);
    const context = checkShouldNotify(update, options);

    if (context && options.silent !== true) {
      renderBanner(update, context);
    }

    return {
      update,
      hasUpdate: Boolean(context),
      context,
    };
  }

  function autoCheck() {
    const currentUrl = window.location.href;
    if (currentUrl === lastAutoCheckUrl) return;
    lastAutoCheckUrl = currentUrl;
    check().catch(() => {
      removeExisting();
    });
  }

  window.ArticleToolUpdateReminder = {
    check,
    dismiss,
    compareVersions,
    normalizeVersion,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoCheck, { once: true });
  } else {
    autoCheck();
  }

  document.addEventListener('astro:page-load', autoCheck);
})();
