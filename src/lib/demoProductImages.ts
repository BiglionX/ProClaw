/** Demo product image id map (aligned with seed SQL) */
export const DEMO_PRODUCT_IMAGE_IDS: Record<string, string> = {
  spu_iphone15pm_bat: 'img_001',
  spu_iphone15pro_bat: 'img_002',
  spu_iphone15_bat: 'img_003',
  spu_iphone15plus_bat: 'img_004',
  spu_iphone14pm_bat: 'img_005',
  spu_iphone14pro_bat: 'img_006',
  spu_iphone14_bat: 'img_007',
  spu_iphone14plus_bat: 'img_008',
  spu_iphone13pm_bat: 'img_009',
  spu_iphone13pro_bat: 'img_010',
  spu_iphone13_bat: 'img_011',
  spu_iphone13mini_bat: 'img_012',
  spu_iphone12pm_bat: 'img_013',
  spu_iphone12pro_bat: 'img_014',
  spu_iphone12_bat: 'img_015',
  spu_iphone12mini_bat: 'img_016',
  spu_iphone11pm_bat: 'img_017',
  spu_iphone11pro_bat: 'img_018',
  spu_iphone11_bat: 'img_019',
  spu_iphonese3_bat: 'img_020',
};

export function isPlaceholderProductImage(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const u = url.toLowerCase();
  return (
    u.endsWith('.svg') ||
    u.includes('/demo-products/') ||
    u.includes('placeholder') ||
    u.includes('example.com') ||
    u.includes('via.placeholder')
  );
}