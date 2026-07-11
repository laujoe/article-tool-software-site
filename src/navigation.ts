import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

const articleToolIntroHref = getPermalink(
  '20260623articletool-wo3-ge4-ren2-zhi4-zuo4-de-xue2-shu4-gong1-zuo4-tai2-ruan3-jian4/articletool-de-ji1-ben3-jie4-shao4',
  'post'
);

export const headerData = {
  links: [
    {
      text: '主页',
      href: getPermalink('/'),
    },
    {
      text: '产品服务',
      links: [
        {
          text: '下载更新',
          href: getPermalink('/services'),
        },
        {
          text: '付费方案',
          href: getPermalink('/pricing'),
        },
        {
          text: '联系我们',
          href: getPermalink('/contact'),
        },
        {
          text: '服务条款',
          href: getPermalink('/terms'),
        },
        {
          text: '隐私政策',
          href: getPermalink('/privacy'),
        },
        {
          text: '关于作者',
          href: getPermalink('/about'),
        },
      ],
    },
    {
      text: '博客',
      links: [
        {
          text: '博客清单',
          href: getBlogPermalink(),
        },
        {
          text: 'Article-Tool 的基本介绍与功能讲解',
          href: articleToolIntroHref,
        },
      ],
    },
  ],
  actions: [
    {
      text: '下载软件',
      href: getPermalink('/services'),
    },
  ],
};

export const footerData = {
  links: [
    {
      title: '产品导航',
      links: [
        { text: '功能总览', href: getPermalink('/#features') },
        { text: '学术工作流', href: getPermalink('/#workflow') },
        { text: '细节能力', href: getPermalink('/#details') },
        { text: '常见问题', href: getPermalink('/#faq') },
      ],
    },
    {
      title: '下载与购买',
      links: [
        { text: '下载软件', href: getPermalink('/services#download') },
        { text: '付费方案', href: getPermalink('/pricing') },
        { text: '联系我们', href: getPermalink('/contact') },
      ],
    },
    {
      title: '使用资料',
      links: [
        { text: '博客清单', href: getBlogPermalink() },
        { text: '基本介绍与功能讲解', href: articleToolIntroHref },
      ],
    },
    {
      title: '关于与政策',
      links: [
        { text: '关于作者', href: getPermalink('/about') },
        { text: '隐私政策', href: getPermalink('/privacy') },
        { text: '服务条款', href: getPermalink('/terms') },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: '个人博客', icon: 'tabler:world', href: 'https://www.laujoe.top/' },
  ],
  footNote: `
    Article-Tool · 本地优先的学术投稿与研究资料工作台
  `,
};
