import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

import { format, resolveConfig } from 'prettier';

const sourceConfigPath =
  process.env.ARTICLE_TOOL_APP_CONFIG || '/Users/laujoe/Documents/本地期刊资料库/src/core/app-config.js';

const defaultSiteUrl = process.env.ARTICLE_TOOL_SITE_URL || 'https://articletool.laujoe.top';
const updateJsonPath = resolve('public/article-tool/update.json');
const changelogJsonPath = resolve('public/article-tool/changelog-data.json');

const logPrefix = '[sync-release-info]';

const readJson = (filePath, fallback) => {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, 'utf-8'));
};

const writeJson = async (filePath, data) => {
  mkdirSync(dirname(filePath), { recursive: true });
  const prettierOptions = (await resolveConfig(filePath)) ?? {};
  writeFileSync(filePath, await format(JSON.stringify(data), { ...prettierOptions, filepath: filePath }), 'utf-8');
};

const loadArticleToolConfig = (filePath) => {
  const source = readFileSync(filePath, 'utf-8');
  const sandbox = {
    window: {
      JournalDeskSVGIcons: {
        svg: (name) => name,
      },
      JournalDeskDisplayThemes: {
        SOFTWARE_BG_OPTIONS: [],
        EYE_CARE_OPTIONS: [],
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: filePath, timeout: 1000 });

  if (!sandbox.window.JournalDeskAppConfig?.RELEASE_INFO) {
    throw new Error(`未在 ${filePath} 中找到 window.JournalDeskAppConfig.RELEASE_INFO`);
  }

  return sandbox.window.JournalDeskAppConfig;
};

const normalizeVersion = (value = '') => {
  const raw = String(value)
    .replace(/^ver\s*/i, '')
    .trim();
  const patchLikeVersion = raw.match(/^1\.(\d)(\d)$/);

  if (patchLikeVersion) {
    return `1.${patchLikeVersion[1]}.${patchLikeVersion[2]}`;
  }

  return raw;
};

const normalizeDate = (value = '') => {
  const dates = String(value).match(/\d{4}-\d{2}-\d{2}/g);
  return dates?.at(-1) || String(value);
};

const splitNotes = (text = '') => {
  const parts = String(text)
    .split(/(?=（\d+）)/)
    .map((item) => item.replace(/^（\d+）/, '').trim())
    .filter(Boolean);

  return parts.length ? parts : [String(text).trim()].filter(Boolean);
};

const downloadOptionsFromDownloads = (downloads = {}) =>
  Object.entries(downloads)
    .map(([label, url]) => ({
      label,
      url: String(url || '').trim(),
    }))
    .filter((item) => item.url);

const existingOrDefaultPageUrl = (existingUrl) => {
  const cleanUrl = String(existingUrl || '').trim();

  if (!cleanUrl || cleanUrl.includes('software.laujoe.top')) {
    return defaultSiteUrl;
  }

  return cleanUrl;
};

const buildSummary = (config) => {
  const libraryLabels = config.LIBRARIES?.map((item) => item.label).filter(Boolean) ?? [];
  const sections = [...libraryLabels, '日程任务', 'AI 报告', '个性化设置'];

  return `围绕${sections.join('、')}持续迭代。`;
};

if (!existsSync(sourceConfigPath)) {
  console.warn(`${logPrefix} 未找到软件配置文件，已跳过同步：${sourceConfigPath}`);
  process.exit(0);
}

const appConfig = loadArticleToolConfig(sourceConfigPath);
const releaseInfo = appConfig.RELEASE_INFO;
const updates = releaseInfo.updates ?? [];
const latestUpdate = updates.at(-1);

if (!latestUpdate) {
  throw new Error(`未在 ${sourceConfigPath} 中找到 RELEASE_INFO.updates`);
}

const existingUpdateJson = readJson(updateJsonPath, {});
const latestVersion = normalizeVersion(releaseInfo.version || latestUpdate.title);
const latestDate = normalizeDate(latestUpdate.date);
const pageUrl = existingOrDefaultPageUrl(existingUpdateJson.pageUrl);
const downloads = existingUpdateJson.downloads || {};
const downloadOptions = downloadOptionsFromDownloads(downloads);
const downloadUrl =
  existingUpdateJson.downloadUrl || downloads.default || downloads.url || downloadOptions[0]?.url || pageUrl;

const changelogData = {
  product: releaseInfo.product || 'Article-Tool',
  subtitle: releaseInfo.tagline || '本地优先的学术投稿与研究资料工作台',
  summary: buildSummary(appConfig),
  updates: updates.map((item) => ({
    date: item.date,
    version: normalizeVersion(item.version || item.title),
    title: item.title,
    tags: item.tags ?? [],
    text: item.text,
  })),
};

const updateData = {
  product: releaseInfo.product || 'Article-Tool',
  version: latestVersion,
  latestVersion,
  title: `${releaseInfo.product || 'Article-Tool'} ${latestVersion}`,
  releaseDate: latestDate,
  channelLabel: existingUpdateJson.channelLabel || '下载版本',
  publicDownloadVersion: latestVersion,
  notes: splitNotes(latestUpdate.text),
  downloads,
  downloadOptions,
  downloadUrl,
  macUrl: existingUpdateJson.macUrl || existingUpdateJson.macosUrl || '',
  winUrl: existingUpdateJson.winUrl || existingUpdateJson.windowsUrl || '',
  pageUrl,
  releaseNotesUrl: `${pageUrl.replace(/\/+$/, '')}/services`,
  changelogUrl: `${pageUrl.replace(/\/+$/, '')}/article-tool/changelog-data.json`,
  force: existingUpdateJson.force ?? false,
};

await writeJson(changelogJsonPath, changelogData);
await writeJson(updateJsonPath, updateData);

console.log(`${logPrefix} 已同步 ${releaseInfo.product || 'Article-Tool'} ${latestVersion}（${latestDate}）`);
