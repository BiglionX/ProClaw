/** Server-side Openverse search for demo product photo URLs */

function buildDemoImageQuery(productName: string): string {
  const base = productName
    .replace(/\u7535\u6c60/g, ' battery replacement')
    .replace(/\(\u7b2c\u4e09\u4ee3\)/g, ' 3rd generation')
    .trim();
  return `${base} product photo`;
}

export async function fetchDemoProductImageUrl(productName: string): Promise<string | null> {
  const query = buildDemoImageQuery(productName);
  try {
    const resp = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial,modification`,
      { cache: 'no-store' },
    );
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      results?: Array<{ url?: string; thumbnail?: string }>;
    };

    for (const item of data.results ?? []) {
      const url = item.url || item.thumbnail;
      if (url && !url.toLowerCase().endsWith('.svg')) {
        return url;
      }
    }
  } catch (err) {
    console.warn('[fetchDemoProductImageUrl]', productName, err);
  }
  return null;
}

export function isPlaceholderDemoImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const u = url.toLowerCase();
  return (
    u.endsWith('.svg') ||
    u.includes('/demo-products/') ||
    u.includes('placeholder') ||
    u.includes('via.placeholder')
  );
}