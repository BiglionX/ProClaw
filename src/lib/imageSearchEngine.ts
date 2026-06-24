/**
 * AI 智能找图引擎
 *
 * 根据商品名称和描述，从免费图片 API 搜索商品图片。
 * 主源：Pexels API（免费 200 req/h），备用：Pixabay，兜底：搜索引擎跳转链接。
 *
 * PRD v5.0 - §4.1.1 AI 智能找图
 */

export interface ImageSearchResult {
  id: string | number;
  /** 缩略图 URL（网格展示用，约 300px） */
  thumbnail: string;
  /** 中尺寸 URL（商品主图用，约 640px） */
  medium: string;
  /** 原图 URL */
  large: string;
  /** 替代文本 / 描述 */
  alt: string;
  /** 拍摄者（用于署名） */
  photographer: string;
  /** 图片来源 */
  source: 'pexels' | 'pixabay' | 'openverse' | 'fallback';
}

export interface BatchSearchProgress {
  current: number;
  total: number;
  productName: string;
  results: ImageSearchResult[];
}

export type SearchMode = 'single' | 'batch';

// ========== 搜索关键词优化 ==========

/** 移除噪声词（纯数字/型号/特殊字符），提取有效搜索词 */
function cleanQuery(name: string, description?: string): string {
  // 取商品名称 + 描述前 80 字
  let raw = name;
  if (description) {
    raw += ' ' + description.slice(0, 80);
  }
  // 去除括号内容（规格型号）
  raw = raw.replace(/[（(][^)）]*[)）]/g, ' ');
  // 去除纯数字+字母型号片段（如 "A2845"）
  raw = raw.replace(/\b[A-Z0-9]{4,}\b/g, ' ');
  // 合并空格
  raw = raw.replace(/\s+/g, ' ').trim();
  // 中英文混合时，优先英文搜索 + 追加电商关键词
  const hasChinese = /[\u4e00-\u9fff]/.test(raw);
  let query = raw;
  if (hasChinese) {
    // 提取可能的英文品牌/型号
    const enParts = raw.match(/[a-zA-Z]+/g);
    if (enParts && enParts.length > 0) {
      query = enParts.join(' ') + ' ' + raw;
    }
  }
  // 追加电商图片关键词提高命中率
  if (!query.toLowerCase().includes('product')) {
    query += ' product photo';
  }
  return query.trim();
}

// ========== Openverse API（免费、无需 Key）==========

async function searchOpenverse(query: string, count: number): Promise<ImageSearchResult[]> {
  try {
    const resp = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${Math.min(count, 20)}&license_type=commercial,modification`,
    );
    if (!resp.ok) return [];

    const data = await resp.json();
    return (data.results || [])
      .filter((r: { url?: string }) => r.url)
      .map((r: { id: string; url: string; thumbnail?: string; title?: string; creator?: string }) => ({
        id: `openverse-${r.id}`,
        thumbnail: r.thumbnail || r.url,
        medium: r.url,
        large: r.url,
        alt: r.title || query,
        photographer: r.creator || 'Openverse',
        source: 'openverse' as const,
      }));
  } catch (err) {
    console.error('[ImageSearch] Openverse error:', err);
    return [];
  }
}

// ========== Pexels API ==========

async function searchPexels(query: string, count: number): Promise<ImageSearchResult[]> {
  const apiKey =
    (typeof process !== 'undefined' && (process.env as any)?.PEXELS_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).__PEXELS_API_KEY__) ||
    '';

  if (!apiKey) {
    console.warn('[ImageSearch] Pexels API key not configured, using fallback');
    return [];
  }

  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 20)}&locale=zh-CN`,
      {
        headers: { Authorization: apiKey },
      },
    );

    if (!resp.ok) {
      console.warn(`[ImageSearch] Pexels returned ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    return (data.photos || []).map((p: any) => ({
      id: `pexels-${p.id}`,
      thumbnail: p.src.tiny || p.src.small,
      medium: p.src.medium || p.src.large,
      large: p.src.large2x || p.src.original,
      alt: p.alt || query,
      photographer: p.photographer || 'Pexels',
      source: 'pexels' as const,
    }));
  } catch (err) {
    console.error('[ImageSearch] Pexels error:', err);
    return [];
  }
}

// ========== Pixabay API（备用）==========

async function searchPixabay(query: string, count: number): Promise<ImageSearchResult[]> {
  const apiKey =
    (typeof process !== 'undefined' && (process.env as any)?.PIXABAY_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).__PIXABAY_API_KEY__) ||
    '';

  if (!apiKey) return [];

  try {
    const resp = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${Math.min(count, 20)}&image_type=photo&safesearch=true`,
    );

    if (!resp.ok) return [];

    const data = await resp.json();
    return (data.hits || []).map((p: any) => ({
      id: `pixabay-${p.id}`,
      thumbnail: p.previewURL,
      medium: p.webformatURL,
      large: p.largeImageURL,
      alt: p.tags || query,
      photographer: p.user || 'Pixabay',
      source: 'pixabay' as const,
    }));
  } catch (err) {
    console.error('[ImageSearch] Pixabay error:', err);
    return [];
  }
}

// ========== 兜底：生成搜索引擎跳转链接 ==========

function generateFallbackUrls(query: string): ImageSearchResult[] {
  const encoded = encodeURIComponent(query);
  return [
    {
      id: 'google-images',
      thumbnail: '',
      medium: '',
      large: `https://www.google.com/search?tbm=isch&q=${encoded}`,
      alt: `在 Google 图片搜索 "${query}"`,
      photographer: '',
      source: 'fallback' as const,
    },
    {
      id: 'bing-images',
      thumbnail: '',
      medium: '',
      large: `https://www.bing.com/images/search?q=${encoded}`,
      alt: `在 Bing 图片搜索 "${query}"`,
      photographer: '',
      source: 'fallback' as const,
    },
    {
      id: 'baidu-images',
      thumbnail: '',
      medium: '',
      large: `https://image.baidu.com/search/index?tn=baiduimage&word=${encoded}`,
      alt: `在百度图片搜索 "${query}"`,
      photographer: '',
      source: 'fallback' as const,
    },
  ];
}

// ========== 公共 API ==========

/**
 * 搜索单张商品图片
 * @param productName 商品名称
 * @param productDesc 商品描述（可选）
 * @param count 返回结果数量（默认 10）
 */
export async function searchProductImages(
  productName: string,
  productDesc?: string,
  count: number = 10,
): Promise<ImageSearchResult[]> {
  const query = cleanQuery(productName, productDesc);
  console.log(`[ImageSearch] 搜索关键词: "${query}"`);

  // 优先 Openverse（免 Key，适合演示自动配图）
  let results = await searchOpenverse(query, count);

  // Pexels
  if (results.length === 0) {
    results = await searchPexels(query, count);
  }

  // Pixabay
  if (results.length === 0) {
    results = await searchPixabay(query, count);
  }

  // 兜底：搜索引擎链接
  if (results.length === 0) {
    results = generateFallbackUrls(query);
  }

  return results;
}

/**
 * 批量搜索商品图片
 * @param products 商品列表 [{ id, name, description }]
 * @param onProgress 进度回调
 * @returns Map<productId, ImageSearchResult[]>
 */
export async function searchBatchProductImages(
  products: Array<{ id: string; name: string; description?: string }>,
  countPerProduct: number = 5,
  onProgress?: (progress: BatchSearchProgress) => void,
): Promise<Map<string, ImageSearchResult[]>> {
  const resultMap = new Map<string, ImageSearchResult[]>();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const results = await searchProductImages(p.name, p.description, countPerProduct);
    resultMap.set(p.id, results);

    onProgress?.({
      current: i + 1,
      total: products.length,
      productName: p.name,
      results,
    });

    // 请求间隔避免 API 限流
    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return resultMap;
}

/**
 * 下载远程图片为 Base64 Data URL
 * 用于直接将搜索结果应用到商品，避免跨域和离线问题
 */
export async function downloadImageAsDataUrl(url: string): Promise<string> {
  // 如果已经是 data URL 直接返回
  if (url.startsWith('data:')) return url;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[ImageSearch] Download failed:', err);
    throw err;
  }
}
