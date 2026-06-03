// ProClaw 营销网站 SEO 后处理脚本
// 1. 为每个公开路由生成独立的 HTML 文件（含正确的 meta 标签）
// 2. 生成 sitemap.xml
// 3. 复制 robots.txt 到构建目录

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const publicDir = join(__dirname, '..', 'public');

// 路由配置（与 seoMetadata.ts 同步）
const routeConfigs = [
  {
    path: '/',
    dir: '',
    title: 'ProClaw - 开源 AI 驱动的商户经营操作系统 | 25+ Agent · 三模式 · 行业插件',
    description:
      'ProClaw 开源免费，内置 25+ AI Agent 与 CEO 主控官。双模式（ProClaw Plus / ProClaw Light）加云托管商城（ProClaw Cloud），搭配行业插件生态。自然语言进销存管理、数据分析、云商城。本地优先，数据 100% 加密存储。',
    keywords:
      'ProClaw, AI经营系统, 进销存, 商户管理, AI Agent, ProClaw Plus, ProClaw Light, ProClaw Cloud, 行业插件, 餐饮管理系统, 美业管理系统, 宠物店管理系统, 开源, 本地优先, 云商城',
    ogTitle: 'ProClaw - 开源 AI 驱动的商户经营操作系统 | Plus · Light · Cloud',
    ogDescription:
      '开源免费，内置 25+ AI Agent 与 CEO 主控官。双模式（ProClaw Plus / ProClaw Light）加 ProClaw Cloud 云商城，行业插件生态。本地优先架构，数据 100% 自主可控。',
  },
  {
    path: '/features',
    dir: 'features',
    title: '功能全景 - ProClaw AI 经营系统 | AI Agent · 进销存 · 云商城 · 行业插件',
    description:
      'ProClaw 功能全景：AI CEO 主控官 + 25+ Agent 协作、进销存管理、云托管商城、Agent 生态市场、团队协作与通信、3 分钟安装向导。一个软件搞定所有经营场景。',
    keywords: 'ProClaw功能, AI进销存, AI Agent, 云商城, 行业插件, 商户管理软件, 开源进销存, 智能经营',
    ogTitle: '功能全景 - ProClaw | AI Agent · 进销存 · 云商城 · 行业插件',
    ogDescription: 'AI CEO 主控官 + 25+ Agent 自动分工协作。进销存管理、云托管商城、行业插件生态、团队协作。一个软件搞定所有经营场景。',
  },
  {
    path: '/use-cases',
    dir: 'use-cases',
    title: '应用场景 - ProClaw | 餐饮 · 零售 · 美业 · 宠物 一站式经营',
    description:
      'ProClaw 覆盖餐饮、零售、美业、宠物等多行业应用场景。从进销存管理到 AI 智能分析，从本地经营到云商城开店，适配各类商户需求。',
    keywords: 'ProClaw应用场景, 餐饮管理, 零售进销存, 美业管理, 宠物店管理, 商户经营, 开源软件',
    ogTitle: '应用场景 - ProClaw | 餐饮 · 零售 · 美业 · 宠物',
    ogDescription: '覆盖餐饮、零售、美业、宠物等多行业场景。从进销存到 AI 分析，从本地经营到云商城，适配各类商户需求。',
  },
  {
    path: '/pricing',
    dir: 'pricing',
    title: '透明定价 - ProClaw | 桌面端免费 · 云商城按 Token 计费',
    description:
      'ProClaw 定价：桌面端永久免费开源，含基础进销存 + 标准 AI 团队。云托管商城按 Token 计费，新用户赠送 50,000 PT 免费体验。无隐藏费用。',
    keywords: 'ProClaw定价, Token计费, 免费进销存, 开源免费, 云商城价格, AI经营成本, ProClaw价格',
    ogTitle: '透明定价 - ProClaw | 桌面端永久免费 · 云商城按量付费',
    ogDescription: '桌面端永久免费开源。云托管商城按 Token 计费，新用户赠送 50,000 PT（约人民币50元）免费体验。无隐藏费用。',
  },
  {
    path: '/download',
    dir: 'download',
    title: '免费下载 - ProClaw 桌面端 | Windows · macOS · Linux',
    description:
      '免费下载 ProClaw 桌面端，支持 Windows、macOS、Linux。3 分钟完成安装，CEO Agent 对话引导配置。开源免费，数据 100% 本地加密存储。',
    keywords: 'ProClaw下载, 免费下载, 进销存软件下载, Windows进销存, macOS进销存, Linux进销存, 开源软件下载',
    ogTitle: '免费下载 - ProClaw 桌面端 | 支持 Windows · macOS · Linux',
    ogDescription: '免费下载 ProClaw 桌面端。支持 Windows、macOS、Linux。3 分钟安装，CEO Agent 对话引导配置。开源免费，数据本地加密存储。',
  },
  {
    path: '/faq',
    dir: 'faq',
    title: '常见问题 - ProClaw | 安装 · 使用 · 定价 FAQ',
    description:
      'ProClaw 常见问题解答：安装配置、AI 功能使用、数据安全与隐私、云商城搭建、Token 计费、开源协议等。快速上手 ProClaw 经营系统。',
    keywords: 'ProClaw常见问题, ProClaw教程, 进销存软件, AI经营, 数据安全, 开源协议, FAQ',
    ogTitle: '常见问题 - ProClaw | 安装 · 使用 · 定价',
    ogDescription: 'ProClaw 常见问题解答：安装配置、AI 功能、数据安全、云商城搭建、Token 计费。快速上手 ProClaw。',
  },
  {
    path: '/changelog',
    dir: 'changelog',
    title: '发布日志 - ProClaw | 版本更新 · 新功能 · 修复记录',
    description:
      'ProClaw 版本发布日志。查看最新功能更新、改进优化和问题修复。持续迭代，为商户提供更好的 AI 经营体验。',
    keywords: 'ProClaw更新日志, 版本发布, 新功能, 软件更新, 开源项目',
    ogTitle: '发布日志 - ProClaw | 版本更新与功能发布',
    ogDescription: 'ProClaw 版本发布日志。查看最新功能更新、改进优化和问题修复记录。',
  },
  {
    path: '/plugins',
    dir: 'plugins',
    title: '插件商店 - ProClaw | 行业插件 · Agent 生态 · 扩展功能',
    description:
      'ProClaw 插件商店：餐饮 POS/KDS 插件、美业预约营销插件、宠物店管理插件、Cloud 托管插件。按需安装，即装即用，无限扩展。',
    keywords: 'ProClaw插件, 餐饮插件, 美业插件, 宠物插件, Cloud插件, 行业方案, 功能扩展',
    ogTitle: '插件商店 - ProClaw | 行业插件 · 即装即用 · 无限扩展',
    ogDescription: 'ProClaw 插件商店：餐饮 POS/KDS、美业预约营销、宠物店管理、Cloud 托管。按需安装，即装即用。',
  },
  {
    path: '/solutions/catering',
    dir: join('solutions', 'catering'),
    title: '餐饮经营管理系统 - ProClaw 行业方案 | POS收银 · KDS厨房显示',
    description:
      'ProClaw 餐饮行业方案：POS收银、桌台管理、KDS厨房显示、智能菜单优化。AI驱动的餐厅管理系统，免费下载使用。',
    keywords: '餐饮管理系统, 餐厅POS软件, 厨房显示系统, KDS, 桌台管理, 餐饮软件, AI餐饮',
    ogTitle: '餐饮经营管理系统 - ProClaw 行业方案',
    ogDescription: 'ProClaw 餐饮行业方案：POS收银、桌台管理、KDS厨房显示、智能菜单优化。AI驱动的餐厅管理系统。',
  },
  {
    path: '/solutions/beauty',
    dir: join('solutions', 'beauty'),
    title: '美业预约管理软件 - ProClaw 行业方案 | 美容院 · 美发店管理',
    description:
      'ProClaw 美业行业方案：预约管理、服务项目设置、员工排班、会员营销。AI驱动的美容院/美发店管理系统。',
    keywords: '美业管理系统, 美容院预约软件, 美发店管理, 员工排班, 会员营销, 美业软件',
    ogTitle: '美业预约管理软件 - ProClaw 行业方案',
    ogDescription: 'ProClaw 美业行业方案：预约管理、服务项目设置、员工排班、会员营销。AI驱动的美容院/美发店管理系统。',
  },
  {
    path: '/solutions/pet',
    dir: join('solutions', 'pet'),
    title: '宠物店管理系统 - ProClaw 行业方案 | 寄养 · 美容 · 进销存',
    description:
      'ProClaw 宠物行业方案：宠物档案管理、寄养预约、美容服务、商品进销存。AI驱动的宠物店管理系统。',
    keywords: '宠物店管理系统, 宠物寄养软件, 宠物美容预约, 宠物档案管理, 宠物店进销存',
    ogTitle: '宠物店管理系统 - ProClaw 行业方案',
    ogDescription: 'ProClaw 宠物行业方案：宠物档案管理、寄养预约、美容服务、商品进销存。AI驱动的宠物店管理系统。',
  },
  {
    path: '/solutions/cloud',
    dir: join('solutions', 'cloud'),
    title: 'Cloud 云托管方案 - ProClaw | Token计费 · 云端备份 · 云商城',
    description:
      'ProClaw Cloud 托管方案：Token计费、云端备份、数据同步、云商城托管。灵活的云服务方案，按需付费。',
    keywords: '云进销存, Token计费, 数据云备份, 云商城托管, 云端同步, 云服务',
    ogTitle: 'Cloud 云托管方案 - ProClaw | 数据上云，经营无忧',
    ogDescription: 'ProClaw Cloud 托管方案：Token计费、云端备份、数据同步、云商城托管。灵活的云服务方案，按需付费。',
  },
];

function getJsonLd(path) {
  const baseUrl = 'https://proclaw.cc';
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ProClaw',
      url: baseUrl,
      logo: baseUrl + '/proclaw-logo.png',
      description: '开源 AI 驱动的商户经营操作系统',
      sameAs: ['https://github.com/BigLionX/ProClaw'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ProClaw - 开源 AI 驱动商户经营操作系统',
      url: baseUrl + path,
      description: '开源 AI 驱动的商户经营操作系统。内置 25+ AI Agent，支持多模式、行业插件生态。',
    },
  ];
  // 首页添加 SoftwareApplication schema
  if (path === '/') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'ProClaw',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows, macOS, Linux',
      description:
        '开源 AI 驱动的商户经营操作系统。内置 25+ AI Agent 与 CEO 主控官，支持 ProClaw Plus / ProClaw Light / ProClaw Cloud 三种模式，搭配行业插件生态。',
      url: baseUrl,
      downloadUrl: baseUrl + '/download',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'CNY',
        description: '桌面端永久免费开源',
      },
    });
  }
  return schemas
    .map(
      (schema) =>
        '<script type="application/ld+json">' +
        JSON.stringify(schema) +
        '</script>'
    )
    .join('\n    ');
}

function main() {
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.error(`[SEO] 未找到 ${indexPath}，请先执行构建`);
    process.exit(1);
  }

  const htmlTemplate = readFileSync(indexPath, 'utf-8');

  console.log(`[SEO] 开始为 ${routeConfigs.length} 个路由生成预渲染 HTML...`);

  for (const route of routeConfigs) {
    // 生成该路由的 HTML: 替换 meta 标签和 title
    let html = htmlTemplate
      .replace(
        /<title>[^<]*<\/title>/,
        `<title>${escapeHtml(route.title)}</title>`
      )
      .replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${escapeAttr(route.description)}" />`
      )
      .replace(
        /<meta name="keywords"[^>]*>/,
        `<meta name="keywords" content="${escapeAttr(route.keywords)}" />`
      )
      .replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${escapeAttr(route.ogTitle)}" />`
      )
      .replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${escapeAttr(route.ogDescription)}" />`
      )
      .replace(
        /<meta property="og:url"[^>]*>/,
        `<meta property="og:url" content="https://proclaw.cc${route.path}" />`
      )
      .replace(
        /<meta name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${escapeAttr(route.ogTitle)}" />`
      )
      .replace(
        /<meta name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${escapeAttr(route.ogDescription)}" />`
      )
      .replace(
        '</head>',
        getJsonLd(route.path) + '</head>'
      );

    // 写入对应目录
    if (route.path === '/') {
      writeFileSync(indexPath, html, 'utf-8');
      console.log(`[SEO]   /  → index.html 已更新`);
    } else {
      const outDir = join(distDir, route.dir);
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }
      const outPath = join(outDir, 'index.html');
      writeFileSync(outPath, html, 'utf-8');
      console.log(`[SEO]   ${route.path} → ${join(route.dir, 'index.html')} 已生成`);
    }
  }

  // 生成 sitemap.xml
  const sitemapUrl = 'https://proclaw.cc';
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routeConfigs
  .map(
    (route) => `  <url>
    <loc>${sitemapUrl}${route.path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  const sitemapPath = join(distDir, 'sitemap.xml');
  writeFileSync(sitemapPath, sitemapContent, 'utf-8');
  console.log(`[SEO] sitemap.xml 已生成 (${routeConfigs.length} 条 URL)`);

  // 复制 robots.txt 到构建目录
  const robotsSrc = join(publicDir, 'robots.txt');
  const robotsDst = join(distDir, 'robots.txt');
  if (existsSync(robotsSrc)) {
    copyFileSync(robotsSrc, robotsDst);
    console.log('[SEO] robots.txt 已复制');
  }

  console.log('[SEO] 完成！');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
