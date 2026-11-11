/**
 * Demo product images: search Openverse/Pexels/Pixabay and download real photos
 */
import { DEMO_PRODUCTS_FOR_BOOTSTRAP } from './demoBootstrapData';
import { DEMO_PRODUCT_IMAGE_IDS, isPlaceholderProductImage } from './demoProductImages';
import { downloadImageAsDataUrl, searchProductImages } from './imageSearchEngine';
import { getProductSPUById } from './productService';
import { ipcInvoke, isTauri } from './tauri';

function buildImageSearchQuery(productName: string): string {
  const base = productName
    .replace(/\u7535\u6c60/g, ' battery replacement')
    .replace(/\(\u7b2c\u4e09\u4ee3\)/g, ' 3rd generation')
    .trim();
  return `${base} product photo`;
}

export async function ensureDemoProductImages(opts?: { force?: boolean }): Promise<number> {
  if (!isTauri()) return 0;

  const force = !!opts?.force;
  let success = 0;

  for (const product of DEMO_PRODUCTS_FOR_BOOTSTRAP) {
    try {
      if (!force) {
        try {
          const spu = await getProductSPUById(product.id);
          const existing = spu.images?.[0]?.image_url || '';
          if (existing && !isPlaceholderProductImage(existing)) {
            continue;
          }
        } catch {
          /* continue */
        }
      }

      const query = buildImageSearchQuery(product.name);
      // 审计修复 #16: 给每个 demo 产品搜索加 8s 超时，
      // 避免 searchProductImages 内部哪个 API 挂住让整个 bootstrap 超时。
      const searchPromise = searchProductImages(query, undefined, 10);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('demo image search timeout (8s)')), 8000),
      );
      const results = await Promise.race([searchPromise, timeoutPromise]).catch(() => []);
      const pick = results.find((r) => r.source !== 'fallback' && (r.large || r.medium));
      if (!pick) {
        console.warn('[demoImages] no image for:', product.name);
        continue;
      }

      const remoteUrl = pick.large || pick.medium;
      let storedUrl = remoteUrl;
      try {
        storedUrl = await downloadImageAsDataUrl(remoteUrl);
      } catch (err) {
        console.warn('[demoImages] download failed, use remote URL:', product.name, err);
      }

      await ipcInvoke<void>('set_spu_main_image', {
        spuId: product.id,
        imageId: DEMO_PRODUCT_IMAGE_IDS[product.id] ?? `img_${product.id}`,
        imageUrl: storedUrl,
      });
      success += 1;
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.warn('[demoImages] failed:', product.name, err);
    }
  }

  return success;
}