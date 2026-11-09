// StructuredData - 结构化数据 (JSON-LD) 组件
// 注入 Organization, SoftwareApplication, WebSite 三种 Schema
import React from 'react';

const StructuredData: React.FC = () => {
  const baseUrl = 'https://proclaw.cc';

  const schemas = [
    // Organization
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ProClaw',
      url: baseUrl,
      logo: `${baseUrl}/proclaw-logo.png`,
      description: '开源 AI 驱动的商户经营操作系统',
      sameAs: [
        'https://github.com/BigLionX/ProClaw',
      ],
    },
    // SoftwareApplication
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'ProClaw',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows, macOS, Linux',
      description:
        '开源 AI 驱动的商户经营操作系统。内置 AI 经营助手（即将推出），支持 ProClaw Plus / ProClaw Light / ProClaw Cloud 三种模式，含内置行业模板。自然语言进销存管理、数据分析、云商城。',
      url: baseUrl,
      downloadUrl: `${baseUrl}/download`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'CNY',
        description: '桌面端永久免费开源',
      },
    },
    // WebSite
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ProClaw - 开源 AI 驱动商户经营操作系统',
      url: baseUrl,
      description: '开源 AI 驱动的商户经营操作系统。内置 AI 经营助手（即将推出），支持多模式，含内置行业模板。',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}
    </>
  );
};

export default StructuredData;
