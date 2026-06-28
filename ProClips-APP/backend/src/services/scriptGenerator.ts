/**
 * 业务服务层：文案生成（V1 mock）
 * 实际生产接入 OpenAI / 通义千问 / 文心一言
 */
import type { ProClipsProductInfo, ProClipsTemplate } from '../types/index.js';

const HOOK_OPENERS = [
  '🔥 老铁们看过来',
  '家人们谁懂啊',
  '答应我一定要试试',
  '今天给大家安利',
  '本地人都知道的秘密',
];

const HOOK_CLOSERS = [
  '本周末限时优惠，进店报「老王视频」再享专属福利！',
  '数量有限，先到先得，点击左下角链接立即抢购！',
  '评论区扣 1，老王给你安排专属福利！',
  '记得点赞收藏，转发给身边需要的朋友！',
];

/**
 * 生成 3 条候选文案
 * V1：基于模板的填充式 + 关键词匹配
 */
export async function generateScript(
  template: ProClipsTemplate,
  product: ProClipsProductInfo
): Promise<string[]> {
  // 模拟异步调用外部 LLM 的延迟
  await new Promise(r => setTimeout(r, 50));

  const features = product.features.length > 0 ? product.features.join('、') : '精选好物';
  const promo = product.promo || '限时优惠';

  const candidates: string[] = [];

  // 候选 1：正式介绍
  candidates.push(
    `${pick(HOOK_OPENERS)}「${product.name}」！${features}，${promo}。${template.title}同款，强烈推荐给追求品质的您。${pick(HOOK_CLOSERS)}`
  );

  // 候选 2：场景化描述
  candidates.push(
    `想象一下，忙碌一天后享用「${product.name}」的满足感。${features}，每一口都是 ${promo} 的诚意。${pick(HOOK_CLOSERS)}`
  );

  // 候选 3：限时紧迫
  candidates.push(
    `⚡️ 「${product.name}」限时 ${promo}！${features}，错过等一年。老王亲自把关品质，放心入手！${pick(HOOK_CLOSERS)}`
  );

  return candidates;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
