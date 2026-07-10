import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: '功能',
      href: getPermalink('/#features'),
    },
    {
      text: '工作流',
      href: getPermalink('/#workflow'),
    },
    {
      text: '方案',
      href: getPermalink('/#pricing'),
    },
    {
      text: '博客',
      href: getBlogPermalink(),
    },
    {
      text: '联系',
      href: getPermalink('/#contact'),
    },
  ],
  actions: [{ text: '立即体验', href: getPermalink('/#pricing') }],
};

export const footerData = {
  links: [
    {
      title: '产品',
      links: [
        { text: '核心功能', href: getPermalink('/#features') },
        { text: '工作流', href: getPermalink('/#workflow') },
        { text: '方案价格', href: getPermalink('/#pricing') },
        { text: '常见问题', href: getPermalink('/#faq') },
      ],
    },
    {
      title: '内容资源',
      links: [
        { text: '博客', href: getBlogPermalink() },
        { text: '功能说明', href: getPermalink('/#features') },
        { text: '使用流程', href: getPermalink('/#workflow') },
      ],
    },
    {
      title: '支持',
      links: [
        { text: '联系我们', href: getPermalink('/#contact') },
        { text: '服务条款', href: getPermalink('/terms') },
        { text: '隐私政策', href: getPermalink('/privacy') },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/laujoe/article-tool-software-site' },
  ],
  footNote: `
    © 2026 文稿工作台 · Built for focused content teams.
  `,
};
