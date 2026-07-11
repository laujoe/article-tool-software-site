import slugify from 'limax';

export interface HeadingItem {
  level: 2 | 3;
  text: string;
  slug: string;
}

const cleanHeadingText = (value = '') =>
  value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .trim();

export const createHeadingSlug = (text = '') => slugify(cleanHeadingText(text)) || 'section';

export const createSlugger = () => {
  const used = new Set<string>();

  return (text: string) => {
    const base = createHeadingSlug(text);
    let slug = base;
    let count = 2;

    while (used.has(slug)) {
      slug = `${base}-${count}`;
      count += 1;
    }

    used.add(slug);
    return slug;
  };
};

export const extractMarkdownHeadings = (source = ''): HeadingItem[] => {
  const slug = createSlugger();
  const headings: HeadingItem[] = [];
  let inFence = false;

  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    headings.push({
      level: match[1].length as 2 | 3,
      text,
      slug: slug(text),
    });
  }

  return headings;
};
